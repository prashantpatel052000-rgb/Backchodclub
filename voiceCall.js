import { auth, db } from "./firebase.js";

import {
    doc,
    getDoc,
    updateDoc,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const urlParams = new URLSearchParams(window.location.search);
const callId = urlParams.get("callId");

const status = document.getElementById("callStatus");
const callerName = document.getElementById("callerName");
const callerPhoto = document.getElementById("callerPhoto");
const endCallBtn = document.getElementById("endCallBtn");

if (!callId) {

    alert("Invalid Call");

    window.location.href = "home.html";

}

const callRef = doc(db, "calls", callId);

async function loadCall() {

    const callSnap = await getDoc(callRef);

    if (!callSnap.exists()) {

        alert("Call not found");

        window.location.href = "home.html";

        return;

    }

    const call = callSnap.data();

    const otherUID =
        auth.currentUser.uid === call.caller
            ? call.receiver
            : call.caller;

    const userSnap = await getDoc(doc(db, "users", otherUID));

    if (userSnap.exists()) {

        const user = userSnap.data();

        callerName.innerText = user.name;

        if (user.photoURL) {

            callerPhoto.src = user.photoURL;

        }

    }

}

loadCall();

onSnapshot(callRef, (snapshot) => {

    if (!snapshot.exists()) {

        window.location.href = "home.html";

        return;

    }

    const call = snapshot.data();

    if (call.status === "accepted") {

        status.innerText = "Call Connected";

    }

    if (
        call.status === "ended" ||
        call.status === "rejected"
    ) {

        alert("Call Ended");

        window.location.href = "home.html";

    }

});

endCallBtn.onclick = async () => {

    await updateDoc(callRef, {

        status: "ended"

    });

};
