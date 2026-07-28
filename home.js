import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";

import {
    getAuth,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

import {
    getFirestore,
    doc,
    getDoc,
    collection,
    getDocs,
    query,
    where,
    orderBy
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

import { enablePushNotifications } from "./pushNotification.js";

const firebaseConfig = {
    apiKey: "AIzaSyDJei-ATL-ka3b-bkD0nSvNZnUTMnCwS2k",
    authDomain: "bakchod-club.firebaseapp.com",
    projectId: "bakchod-club",
    storageBucket: "bakchod-club.firebasestorage.app",
    messagingSenderId: "197529524538",
    appId: "1:197529524538:web:e3c4260d37020b59789803"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const searchInput = document.getElementById("searchInput");
const searchResults = document.getElementById("searchResults");

function updateNotificationDot(show){

    const dot = document.getElementById("notificationDot");

    if(!dot) return;

    if(show){
        dot.classList.add("show");
    }else{
        dot.classList.remove("show");
    }

}

async function checkNotifications(uid){

    try{

        const q = query(
            collection(db,"notifications"),
            where("to","==",uid),
            where("read","==",false)
        );

        const snap = await getDocs(q);

        updateNotificationDot(!snap.empty);

    }catch(error){

        console.log(error);

    }

}

onAuthStateChanged(auth, async(user)=>{

    if(!user){

        window.location.href="login.html";
        return;

    }

    try{

        const docSnap = await getDoc(doc(db,"users",user.uid));

        if(docSnap.exists()){

    const data = docSnap.data();

    document.getElementById("welcomeText").innerText =
    `Welcome, ${data.name}!`;

    await enablePushNotifications();

}

        await checkNotifications(user.uid);

        loadPosts();

    }catch(error){

        console.log(error);

    }

});
async function loadPosts(){

    const feed = document.getElementById("feed");

    if(!feed) return;

    feed.innerHTML = "<p>Loading posts...</p>";

    try{

        const q = query(
            collection(db,"posts"),
            orderBy("createdAt","desc")
        );

        const querySnapshot = await getDocs(q);

        feed.innerHTML = "";

        if(querySnapshot.empty){

            feed.innerHTML = `
            <p style="text-align:center;color:#666;">
            No posts yet. Be the first to post! 🎉
            </p>
            `;

            return;

        }

        querySnapshot.forEach((docSnap)=>{

            const post = docSnap.data();

            feed.innerHTML += `
            <div class="post">

                <h3>👤 ${post.name}</h3>

                <small>${post.email}</small>

                <p style="margin:12px 0;">
                ${post.text}
                </p>

                <hr style="margin:10px 0;">

                ❤️ ${post.likes || 0}
                &nbsp;&nbsp;
                💬 ${post.comments || 0}

            </div>
            `;

        });

    }catch(error){

        console.log(error);

    }

}

searchInput.addEventListener("input", async()=>{

    const search = searchInput.value.trim().toLowerCase();

    searchResults.innerHTML = "";

    if(search===""){

        searchResults.style.display="none";
        return;

    }

    const usersSnapshot = await getDocs(collection(db,"users"));

    usersSnapshot.forEach((userDoc)=>{

        const member = userDoc.data();

        if(
            member.name &&
            member.name.toLowerCase().includes(search)
        ){

            searchResults.innerHTML += `
            <div class="searchUser"
            data-id="${userDoc.id}">
            ${member.name}
            </div>
            `;

        }

    });

    searchResults.style.display =
    searchResults.innerHTML ? "block":"none";

    document.querySelectorAll(".searchUser").forEach((item)=>{

        item.onclick=()=>{

            window.location.href =
            `profile.html?uid=${item.dataset.id}`;

        };

    });

});
// =============================
// Service Worker
// =============================

if ("serviceWorker" in navigator) {

    window.addEventListener("load", () => {

        navigator.serviceWorker.register("./service-worker.js")
        .then(() => {

            console.log("✅ Service Worker Registered");

        })
        .catch((error) => {

            console.log("❌ Service Worker Error:", error);

        });

    });

}

document.addEventListener("visibilitychange", async () => {

    if (
        document.visibilityState === "visible" &&
        auth.currentUser
    ) {

        await checkNotifications(auth.currentUser.uid);

    }

});

window.addEventListener("focus", async () => {

    if (auth.currentUser) {

        await checkNotifications(auth.currentUser.uid);

    }

});