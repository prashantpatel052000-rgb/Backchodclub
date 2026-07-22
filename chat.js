import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";

import {
getAuth
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

import {
getFirestore,
doc,
getDoc,
collection,
addDoc,
serverTimestamp,
query,
orderBy,
onSnapshot,
deleteDoc
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const firebaseConfig = {
apiKey:"AIzaSyDJei-ATL-ka3b-bkD0nSvNZnUTMnCwS2k",
authDomain:"bakchod-club.firebaseapp.com",
projectId:"bakchod-club",
storageBucket:"bakchod-club.firebasestorage.app",
messagingSenderId:"197529524538",
appId:"1:197529524538:web:e3c4260d37020b59789803"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const chatName = document.getElementById("chatName");
const backBtn = document.getElementById("backBtn");

backBtn.addEventListener("click", () => {
history.back();
});

const urlParams = new URLSearchParams(window.location.search);

const otherUID = urlParams.get("uid");

const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const messagesBox = document.getElementById("messages");

const currentUID = auth.currentUser?.uid;

async function loadUser(){

if(!otherUID){

chatName.textContent = "Unknown User";
return;

}

const userSnap = await getDoc(doc(db,"users",otherUID));

if(userSnap.exists()){

chatName.textContent = userSnap.data().name;

}else{

chatName.textContent = "Unknown User";

}

}

loadUser();

sendBtn.addEventListener("click", async () => {

    const text = messageInput.value.trim();

    if (!text) return;

    const currentUID = auth.currentUser.uid;

    // Create one common chat ID for both users
    const chatId = [currentUID, otherUID].sort().join("_");

    try {

        await addDoc(
            collection(db, "chats", chatId, "messages"),
            {
                sender: currentUID,
                receiver: otherUID,
                text: text,
                createdAt: serverTimestamp()
            }
        );

        messageInput.value = "";

    } catch (error) {

        alert(error.message);

    }

});

getAuth().onAuthStateChanged((user) => {

    if (!user) return;

    const chatId = [user.uid, otherUID].sort().join("_");

    const q = query(
        collection(db, "chats", chatId, "messages"),
        orderBy("createdAt")
    );

    onSnapshot(q, (snapshot) => {

        messagesBox.innerHTML = "";

        snapshot.forEach((docSnap) => {

    const msg = docSnap.data();

    const div = document.createElement("div");

    div.dataset.id = docSnap.id;

            div.classList.add("message");

            if (msg.sender === user.uid) {

                div.classList.add("myMessage");

            } else {

                div.classList.add("otherMessage");

            }

            div.textContent = msg.text;

            messagesBox.appendChild(div);
            
            let pressTimer;

div.addEventListener("touchstart", () => {

    if (msg.sender !== auth.currentUser.uid) return;

    pressTimer = setTimeout(async () => {

        const confirmDelete = confirm("Delete this message?");

        if (!confirmDelete) return;

        try {

            await deleteDoc(
                doc(
                    db,
                    "chats",
                    chatId,
                    "messages",
                    div.dataset.id
                )
            );

        } catch (error) {

            alert(error.message);

        }

    }, 700);

});

div.addEventListener("touchend", () => {

    clearTimeout(pressTimer);

});

div.addEventListener("touchmove", () => {

    clearTimeout(pressTimer);

});

        });

        messagesBox.scrollTop = messagesBox.scrollHeight;

    });

});