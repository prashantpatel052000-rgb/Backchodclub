import { auth, db } from "./firebase.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

import {
    collection,
    query,
    where,
    onSnapshot,
    addDoc,
    updateDoc,
    doc,
    getDoc,
    getDocs,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const opponentSearch = document.getElementById("opponentSearch");
const searchResultsBox = document.getElementById("searchResultsBox");
const incomingInvites = document.getElementById("incomingInvites");
const activeGames = document.getElementById("activeGames");

const challengeOverlay = document.getElementById("challengeOverlay");
const closePopup = document.getElementById("closePopup");
const popupTitle = document.getElementById("popupTitle");

let currentUID = null;
let selectedGame = "tictactoe";

// ---------- Game configs ----------
// Add a new entry here whenever a new game is built - everything else
// in this file reads from this map instead of hardcoding one game.
const GAME_CONFIG = {

    tictactoe: {
        label: "Tic-Tac-Toe",
        page: "tictactoe.html",
        emptyBoard: () => Array(9).fill("")
    },

    connectfour: {
        label: "Connect Four",
        page: "connectfour.html",
        emptyBoard: () => Array(42).fill("")
    }

};

// ---------- Open/close the challenge popup from the game grid ----------

document.querySelectorAll(".gameTile:not(.locked)").forEach((tile) => {

    tile.addEventListener("click", () => {

        selectedGame = tile.dataset.game;

        popupTitle.innerText =
            `Challenge to ${GAME_CONFIG[selectedGame].label}`;

        opponentSearch.value = "";
        searchResultsBox.innerHTML = "";

        challengeOverlay.classList.add("show");

        opponentSearch.focus();

    });

});

closePopup.addEventListener("click", () => {

    challengeOverlay.classList.remove("show");

});

challengeOverlay.addEventListener("click", (event) => {

    if (event.target === challengeOverlay) {
        challengeOverlay.classList.remove("show");
    }

});

onAuthStateChanged(auth, (user) => {

    if (!user) {
        window.location.href = "login.html";
        return;
    }

    currentUID = user.uid;

    watchIncomingInvites();
    watchActiveGames();

});

// ---------- Search for an opponent ----------

opponentSearch.addEventListener("input", async () => {

    const search = opponentSearch.value.trim().toLowerCase();

    searchResultsBox.innerHTML = "";

    if (search === "") return;

    try {

        const usersSnapshot = await getDocs(collection(db, "users"));

        usersSnapshot.forEach((userDoc) => {

            if (userDoc.id === currentUID) return;

            const member = userDoc.data();

            if (member.name && member.name.toLowerCase().includes(search)) {

                searchResultsBox.innerHTML += `
                <div class="opponentResult" data-id="${userDoc.id}">
                    <span>${member.name}</span>
                    <button class="challengeBtn" data-id="${userDoc.id}">
                        Challenge
                    </button>
                </div>
                `;

            }

        });

        document.querySelectorAll(".challengeBtn").forEach((btn) => {

            btn.onclick = () => sendChallenge(btn.dataset.id);

        });

    } catch (error) {

        console.log(error);

    }

});

// ---------- Send a challenge ----------

async function sendChallenge(opponentUID) {

    try {

        const gameRef = await addDoc(collection(db, "games"), {

            game: selectedGame,

            player1: currentUID,
            player2: opponentUID,

            board: GAME_CONFIG[selectedGame].emptyBoard(),
            turn: currentUID,

            status: "pending",
            winner: null,

            createdAt: serverTimestamp()

        });

        await addDoc(collection(db, "notifications"), {

            to: opponentUID,
            from: currentUID,

            type: "game_invite",
            text: `challenged you to ${GAME_CONFIG[selectedGame].label} 🎮`,

            gameId: gameRef.id,

            createdAt: serverTimestamp(),
            read: false

        });

        alert("Challenge sent!");

        challengeOverlay.classList.remove("show");
        opponentSearch.value = "";
        searchResultsBox.innerHTML = "";

    } catch (error) {

        alert(error.message);

    }

}

// ---------- Watch challenges sent to me ----------

function watchIncomingInvites() {

    const q = query(
        collection(db, "games"),
        where("player2", "==", currentUID),
        where("status", "==", "pending")
    );

    onSnapshot(q, async (snapshot) => {

        if (snapshot.empty) {

            incomingInvites.innerHTML =
                `<p class="emptyText">No incoming challenges right now.</p>`;

            return;

        }

        incomingInvites.innerHTML = "";

        for (const gameDoc of snapshot.docs) {

            const game = gameDoc.data();

            let challengerName = "Someone";

            try {

                const userSnap = await getDoc(doc(db, "users", game.player1));

                if (userSnap.exists()) {
                    challengerName = userSnap.data().name;
                }

            } catch (e) {
                console.log(e);
            }

            const gameLabel =
                (GAME_CONFIG[game.game] && GAME_CONFIG[game.game].label) || "a game";

            incomingInvites.innerHTML += `
            <div class="inviteCard">
                <span>${challengerName} challenged you to ${gameLabel}</span>
                <div class="inviteActions">
                    <button class="acceptBtn" data-id="${gameDoc.id}" data-game="${game.game}">Accept</button>
                    <button class="declineBtn" data-id="${gameDoc.id}">Decline</button>
                </div>
            </div>
            `;

        }

        document.querySelectorAll(".acceptBtn").forEach((btn) => {

            btn.onclick = async () => {

                await updateDoc(doc(db, "games", btn.dataset.id), {
                    status: "active"
                });

                const page =
                    (GAME_CONFIG[btn.dataset.game] && GAME_CONFIG[btn.dataset.game].page)
                    || "tictactoe.html";

                window.location.href = `${page}?gameId=${btn.dataset.id}`;

            };

        });

        document.querySelectorAll(".declineBtn").forEach((btn) => {

            btn.onclick = async () => {

                await updateDoc(doc(db, "games", btn.dataset.id), {
                    status: "declined"
                });

            };

        });

    });

}

// ---------- Watch my active games ----------

function watchActiveGames() {

    let gamesAsPlayer1 = new Map();
    let gamesAsPlayer2 = new Map();

    function render() {

        const merged = new Map([...gamesAsPlayer1, ...gamesAsPlayer2]);

        renderActiveGames(merged);

    }

    const q1 = query(
        collection(db, "games"),
        where("player1", "==", currentUID),
        where("status", "==", "active")
    );

    const q2 = query(
        collection(db, "games"),
        where("player2", "==", currentUID),
        where("status", "==", "active")
    );

    onSnapshot(q1, (snapshot) => {
        gamesAsPlayer1 = new Map(snapshot.docs.map((d) => [d.id, d.data()]));
        render();
    });

    onSnapshot(q2, (snapshot) => {
        gamesAsPlayer2 = new Map(snapshot.docs.map((d) => [d.id, d.data()]));
        render();
    });

}

async function renderActiveGames(gamesMap) {

    if (gamesMap.size === 0) {

        activeGames.innerHTML =
            `<p class="emptyText">No active games yet — challenge someone above!</p>`;

        return;

    }

    activeGames.innerHTML = "";

    for (const [gameId, game] of gamesMap) {

        const opponentUID =
            game.player1 === currentUID ? game.player2 : game.player1;

        let opponentName = "Opponent";

        try {

            const userSnap = await getDoc(doc(db, "users", opponentUID));

            if (userSnap.exists()) {
                opponentName = userSnap.data().name;
            }

        } catch (e) {
            console.log(e);
        }

        const gameLabel =
            (GAME_CONFIG[game.game] && GAME_CONFIG[game.game].label) || "Game";

        activeGames.innerHTML += `
        <div class="gameCard" data-id="${gameId}">
            <span>🎮 ${gameLabel} vs ${opponentName}</span>
            <button class="challengeBtn" data-id="${gameId}" data-game="${game.game}">
                Resume
            </button>
        </div>
        `;

    }

    document.querySelectorAll(".gameCard .challengeBtn").forEach((btn) => {

        btn.onclick = () => {

            const page =
                (GAME_CONFIG[btn.dataset.game] && GAME_CONFIG[btn.dataset.game].page)
                || "tictactoe.html";

            window.location.href = `${page}?gameId=${btn.dataset.id}`;

        };

    });

}
