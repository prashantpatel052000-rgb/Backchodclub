import { auth, db } from "./firebase.js";

import {
    collection,
    query,
    where,
    onSnapshot,
    updateDoc,
    doc
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

onAuthStateChanged(auth, (user) => {

    if (!user) return;

    const q = query(
        collection(db, "calls"),
        where("receiver", "==", user.uid),
        where("status", "==", "ringing")
    );

    onSnapshot(q, (snapshot) => {

        snapshot.forEach((callDoc) => {

            const call = callDoc.data();

            localStorage.setItem(
"currentCall",
callDoc.id
);

window.location.href =
"incomingCall.html";

            if (accept) {

    await updateDoc(
        doc(db, "calls", callDoc.id),
        {
            status: "accepted"
        }
    );

    alert("Voice call will start in next step.");

} else {

    await updateDoc(
        doc(db, "calls", callDoc.id),
        {
            status: "rejected"
        }
    );

}

        });

    });

});
