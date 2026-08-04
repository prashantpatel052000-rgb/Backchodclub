import { auth, db } from "./firebase.js";

import {
  doc,
  getDoc,
  updateDoc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const callId = localStorage.getItem("currentCall");

const callerName = document.getElementById("callerName");
const callerPhoto = document.getElementById("callerPhoto");

const acceptBtn = document.getElementById("acceptBtn");
const rejectBtn = document.getElementById("rejectBtn");

let callHandled = false;
let unsubscribe = null;

function leaveIncomingCall(message) {

    callHandled = true;

    if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
    }

    localStorage.removeItem("currentCall");

    if (message) alert(message);

    window.location.href = "home.html";

}

async function loadCall() {

    if (!callId) {
        window.location.href = "home.html";
        return;
    }

    const callSnap = await getDoc(doc(db, "calls", callId));

    if (!callSnap.exists()) {
        leaveIncomingCall();
        return;
    }

    const call = callSnap.data();

    // If the caller already gave up before we even loaded this screen
    if (call.status === "cancelled" || call.status === "missed") {
        leaveIncomingCall("📵 Missed call.");
        return;
    }

    const userSnap = await getDoc(doc(db, "users", call.caller));

    if (userSnap.exists()) {

        const user = userSnap.data();

        callerName.innerText = user.name;

        if (user.photoURL) {
            callerPhoto.src = user.photoURL;
        }

    }

    // Watch for the caller cancelling or the ring timing out while
    // we're still sitting on this screen.
    unsubscribe = onSnapshot(doc(db, "calls", callId), (snap) => {

        if (callHandled) return;

        if (!snap.exists()) {
            leaveIncomingCall();
            return;
        }

        const data = snap.data();

        if (data.status === "cancelled" || data.status === "missed") {
            leaveIncomingCall("📵 Missed call — the caller is gone.");
        }

    });

}

loadCall();

acceptBtn.onclick = async () => {

    if (callHandled) return;
    callHandled = true;
    if (unsubscribe) unsubscribe();

    await updateDoc(doc(db, "calls", callId), {

        status: "accepted",

        answered: true

    });

    localStorage.removeItem("currentCall");

    window.location.href =
    `voiceCall.html?callId=${callId}`;

};

rejectBtn.onclick = async () => {

    if (callHandled) return;
    callHandled = true;
    if (unsubscribe) unsubscribe();

    await updateDoc(doc(db, "calls", callId), {

        status: "rejected",

        answered: true

    });

    localStorage.removeItem("currentCall");

    window.location.href = "home.html";

};
