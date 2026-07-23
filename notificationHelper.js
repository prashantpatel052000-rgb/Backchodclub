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

        if (!snapshot.empty) {

            await updateDoc(
                doc(db, "notifications", snapshot.docs[0].id),
                {
                    createdAt: serverTimestamp()
                }
            );

            return;

        }

        await addDoc(collection(db, "notifications"), {
            to,
            from,
            type,
            text,
            read: false,
            createdAt: serverTimestamp()
        });

    } catch (error) {

        console.log(error);

    }

}