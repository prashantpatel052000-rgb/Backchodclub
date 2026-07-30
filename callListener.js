import { auth, db } from "./firebase.js";

import {
    collection,
    query,
    where,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

const handledCalls = new Set();

onAuthStateChanged(auth, (user) => {

    if (!user) return;

    const q = query(
        collection(db, "calls"),
        where("receiver", "==", user.uid),
        where("status", "==", "ringing"),
        where("answered", "==", false)
    );

    onSnapshot(q, (snapshot) => {

        snapshot.forEach((callDoc) => {

            if (handledCalls.has(callDoc.id)) return;

            handledCalls.add(callDoc.id);

            localStorage.setItem("currentCall", callDoc.id);

            window.location.href = "incomingCall.html";

        });

    });

});
