import { auth, db } from "./firebase.js";

import {
    doc,
    getDoc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const callId = localStorage.getItem("currentCall");

const callerName = document.getElementById("callerName");
const callerPhoto = document.getElementById("callerPhoto");

const acceptBtn = document.getElementById("acceptBtn");
const rejectBtn = document.getElementById("rejectBtn");

async function loadCall() {

    if (!callId) return;

    const callSnap = await getDoc(doc(db, "calls", callId));

    if (!callSnap.exists()) {

        window.location.href = "home.html";
        return;

    }

    const call = callSnap.data();

    const userSnap = await getDoc(doc(db, "users", call.caller));

    if (userSnap.exists()) {

        const user = userSnap.data();

        callerName.innerText = user.name;

        if (user.photoURL) {
            callerPhoto.src = user.photoURL;
        }

    }

}

loadCall();

acceptBtn.onclick = async () => {

    await updateDoc(doc(db, "calls", callId), {

        status: "accepted",

        answered: true

    });

    localStorage.removeItem("currentCall");

    window.location.href =
    `voiceCall.html?callId=${callId}`;

};

rejectBtn.onclick = async () => {

    await updateDoc(doc(db, "calls", callId), {

        status: "rejected",

        answered: true

    });

    localStorage.removeItem("currentCall");

    window.location.href = "home.html";

};
