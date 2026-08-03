import { auth, db } from "./firebase.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

import {
    doc,
    getDoc,
    updateDoc,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const urlParams = new URLSearchParams(window.location.search);
const gameId = urlParams.get("gameId");

const statusText = document.getElementById("statusText");
const vsText = document.getElementById("vsText");
const boardEl = document.getElementById("board");
const cells = document.querySelectorAll(".cell");
const leaveBtn = document.getElementById("leaveBtn");

if (!gameId) {
    alert("Invalid game.");
    window.location.href = "games.html";
}

const gameRef = doc(db, "games", gameId);

let currentUID = null;
let mySymbol = null;
let opponentUID = null;

const WIN_LINES = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
];

function checkWinner(board) {

    for (const line of WIN_LINES) {

        const [a, b, c] = line;

        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return board[a];
        }

    }

    if (board.every((cell) => cell !== "")) {
        return "draw";
    }

    return null;

}

onAuthStateChanged(auth, async (user) => {

    if (!user) {
        window.location.href = "login.html";
        return;
    }

    currentUID = user.uid;

    const gameSnap = await getDoc(gameRef);

    if (!gameSnap.exists()) {
        alert("Game not found.");
        window.location.href = "games.html";
        return;
    }

    const game = gameSnap.data();

    if (currentUID !== game.player1 && currentUID !== game.player2) {
        alert("This isn't your game.");
        window.location.href = "games.html";
        return;
    }

    mySymbol = currentUID === game.player1 ? "X" : "O";
    opponentUID = currentUID === game.player1 ? game.player2 : game.player1;

    try {
        const oppSnap = await getDoc(doc(db, "users", opponentUID));
        if (oppSnap.exists()) {
            vsText.innerText = `You vs ${oppSnap.data().name}`;
        }
    } catch (e) {
        console.log(e);
    }

    // Live sync of the board
    onSnapshot(gameRef, (snap) => {

        if (!snap.exists()) {
            statusText.innerText = "Game ended.";
            return;
        }

        renderGame(snap.data());

    });

});

let gameIsOver = false;

function renderGame(game) {

    game.board.forEach((mark, i) => {

        cells[i].innerText = mark;

        cells[i].classList.remove("mine", "theirs");

        if (mark === mySymbol) {
            cells[i].classList.add("mine");
        } else if (mark && mark !== mySymbol) {
            cells[i].classList.add("theirs");
        }

    });

    if (game.status === "pending") {
        statusText.innerText = "⏳ Waiting for the invite to be accepted (check your Games lobby).";
        return;
    }

    if (game.status === "declined") {
        gameIsOver = true;
        statusText.innerText = "❌ Challenge was declined.";
        return;
    }

    if (game.status === "abandoned") {
        gameIsOver = true;
        statusText.innerText = "🚪 Your opponent left the game.";
        return;
    }

    if (game.winner === "draw") {
        gameIsOver = true;
        statusText.innerText = "🤝 It's a draw!";
        return;
    }

    if (game.winner) {
        gameIsOver = true;
        statusText.innerText =
            game.winner === mySymbol ? "🏆 You won!" : "😢 You lost.";
        return;
    }

    statusText.innerText =
        game.turn === currentUID ? "🟢 Your turn" : "⏳ Opponent's turn...";

}

// ---------- Handle a move ----------

boardEl.addEventListener("click", async (event) => {

    const cellEl = event.target.closest(".cell");

    if (!cellEl) return;

    const index = Number(cellEl.dataset.i);

    try {

        const gameSnap = await getDoc(gameRef);

        if (!gameSnap.exists()) return;

        const game = gameSnap.data();

        if (game.status !== "active") return;
        if (game.winner) return;
        if (game.turn !== currentUID) return;
        if (game.board[index] !== "") return;

        const newBoard = [...game.board];
        newBoard[index] = mySymbol;

        const result = checkWinner(newBoard);

        await updateDoc(gameRef, {

            board: newBoard,

            turn: opponentUID,

            winner: result,

            status: result ? "finished" : "active"

        });

    } catch (error) {

        console.log(error);

    }

});

// ---------- Leave game ----------

leaveBtn.addEventListener("click", async () => {

    try {

        if (!gameIsOver) {

            await updateDoc(gameRef, {
                status: "abandoned"
            });

            gameIsOver = true;

        }

    } catch (e) {
        console.log(e);
    }

    window.location.href = "games.html";

});

// Best-effort: mark abandoned if the tab is closed mid-game
window.addEventListener("beforeunload", () => {

    if (gameIsOver) return;

    updateDoc(gameRef, { status: "abandoned" }).catch(() => {});

});
