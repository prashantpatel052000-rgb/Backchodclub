import {
    collection,
    addDoc,
    query,
    where,
    getDocs,
    updateDoc,
    doc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

import { db } from "./firebase.js";

export async function createNotification(to, from, type, text) {

    try {

        console.log("createNotification called", to, from, type, text);

        // Don't notify yourself
        if (to === from) return;

        const q = query(
            collection(db, "notifications"),
            where("to", "==", to),
            where("from", "==", from),
            where("type", "==", type),
            where("read", "==", false)
        );

        const snapshot = await getDocs(q);

        // If the same unread notification already exists,
        // just update its timestamp.
        if (!snapshot.empty) {

            await updateDoc(
                doc(db, "notifications", snapshot.docs[0].id),
                {
                    createdAt: serverTimestamp()
                }
            );

            console.log("Existing notification updated");
            return;
        }

        console.log("Saving notification...");

        await addDoc(collection(db, "notifications"), {
            to: to,
            from: from,
            type: type,
            text: text,
            createdAt: serverTimestamp(),
            read: false
        });

        console.log("Notification saved successfully");

    } catch (error) {

        console.error("Notification Error:", error);
        alert(error.message);

    }

}
