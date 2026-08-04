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

const ROWS = 6;
const COLS = 7;

const urlParams = new URLSearchParams(window.location.search);
const gameId = urlParams.get("gameId");

const statusText = document.getElementById("statusText");
const vsText = document.getElementById("vsText");
const boardEl = document.getElementById("board");
const leaveBtn = document.getElementById("leaveBtn");
const colHint = document.getElementById("colHint");

if (!gameId) {
    alert("Invalid game.");
    window.location.href = "games.html";
}

const gameRef = doc(db, "games", gameId);

let currentUID = null;
let mySymbol = null; // "R" or "Y"
let opponentUID = null;
let gameIsOver = false;

// ---------- Build the 42 board cells once ----------

for (let i = 0; i < ROWS * COLS; i++) {
    const cellEl = document.createElement("div");
    cellEl.className = "cell";
    cellEl.dataset.i = i;
    boardEl.appendChild(cellEl);
}

const cells = document.querySelectorAll(".cell");

// ---------- Win detection ----------

function indexOf(row, col) {
    return row * COLS + col;
}

function checkWinner(board) {

    const directions = [
        [0, 1],   // horizontal
        [1, 0],   // vertical
        [1, 1],   // diagonal down-right
        [1, -1]   // diagonal down-left
    ];

    for (let row = 0; row < ROWS; row++) {

        for (let col = 0; col < COLS; col++) {

            const mark = board[indexOf(row, col)];

            if (!mark) continue;

            for (const [dr, dc] of directions) {

                let count = 1;

                for (let step = 1; step < 4; step++) {

                    const r = row + dr * step;
                    const c = col + dc * step;

                    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) break;
                    if (board[indexOf(r, c)] !== mark) break;

                    count++;

                }

                if (count >= 4) return mark;

            }

        }

    }

    if (board.every((cell) => cell !== "")) {
        return "draw";
    }

    return null;

}

// ---------- Find the landing row for a column drop ----------

function findLandingRow(board, col) {

    for (let row = ROWS - 1; row >= 0; row--) {

        if (board[indexOf(row, col)] === "") {
            return row;
        }

    }

    return -1; // column full

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

    mySymbol = currentUID === game.player1 ? "R" : "Y";
    opponentUID = currentUID === game.player1 ? game.player2 : game.player1;

    try {
        const oppSnap = await getDoc(doc(db, "users", opponentUID));
        if (oppSnap.exists()) {
            vsText.innerText = `You vs ${oppSnap.data().name}`;
        }
    } catch (e) {
        console.log(e);
    }

    onSnapshot(gameRef, (snap) => {

        if (!snap.exists()) {
            statusText.innerText = "Game ended.";
            return;
        }

        renderGame(snap.data());

    });

});

function renderGame(game) {

    game.board.forEach((mark, i) => {

        cells[i].classList.remove("R", "Y");

        if (mark === "R" || mark === "Y") {
            cells[i].classList.add(mark);
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

    const myColor = mySymbol === "R" ? "🔴" : "🟡";

    statusText.innerText =
        game.turn === currentUID
            ? `🟢 Your turn (${myColor})`
            : "⏳ Opponent's turn...";

}

// ---------- Handle a column drop ----------

colHint.addEventListener("click", async (event) => {

    const btn = event.target.closest(".colBtn");

    if (!btn) return;

    const col = Number(btn.dataset.col);

    try {

        const gameSnap = await getDoc(gameRef);

        if (!gameSnap.exists()) return;

        const game = gameSnap.data();

        if (game.status !== "active") return;
        if (game.winner) return;
        if (game.turn !== currentUID) return;

        const row = findLandingRow(game.board, col);

        if (row === -1) return; // column full

        const newBoard = [...game.board];
        newBoard[indexOf(row, col)] = mySymbol;

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
