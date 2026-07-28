import { messaging, auth, db } from "./firebase.js";

import {
    getToken
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-messaging.js";

import {
    doc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const VAPID_KEY =
"BLrOaxZOlQFfwdsjbGh72lCfBleglcZydSiYb_c57uaFMS1Kvtgm9EreIJ4j4jwrF3kLc-Qmgz14GJSUck_h3GU";

export async function enablePushNotifications() {

    try {

        const permission =
            await Notification.requestPermission();

        if(permission !== "granted"){
            return;
        }

        const token = await getToken(
            messaging,
            {
                vapidKey: VAPID_KEY
            }
        );

        if(token && auth.currentUser){

            await updateDoc(
                doc(db,"users",auth.currentUser.uid),
                {
                    fcmToken: token
                }
            );

            console.log("FCM Token saved.");

        }

    } catch(error){

        console.log(error);

    }

}