import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";

import {
    getAuth,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

import {
    getFirestore,
    doc,
    getDoc,
    updateDoc,
    increment,
    arrayUnion,
    arrayRemove
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

import { createNotification } from "./notificationHelper.js";
import { escapeHTML } from "./sanitize.js";

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

const urlParams = new URLSearchParams(window.location.search);
const postId = urlParams.get("postId");

const postBox = document.getElementById("postBox");

let currentUID = null;

onAuthStateChanged(auth, (user) => {

    if (!user) {
        // Preserve the link so they land back here after logging in
        const target = `post.html?postId=${postId || ""}`;
        window.location.href =
            `login.html?redirect=${encodeURIComponent(target)}`;
        return;
    }

    currentUID = user.uid;

    loadPost();

});

async function loadPost() {

    if (!postId) {
        postBox.innerHTML = `<p style="text-align:center;color:#777;">No post specified.</p>`;
        return;
    }

    try {

        const snap = await getDoc(doc(db, "posts", postId));

        if (!snap.exists()) {
            postBox.innerHTML = `<p style="text-align:center;color:#777;">This post doesn't exist or was deleted.</p>`;
            return;
        }

        renderPost(snap.data());

    } catch (error) {

        postBox.innerHTML = `<p style="color:red;text-align:center;">${escapeHTML(error.message)}</p>`;

    }

}

function renderPost(post) {

    const liked = (post.likedBy || []).includes(currentUID);
    const heart = liked ? "❤️" : "🤍";
    const comments = post.comments || [];

    postBox.innerHTML = `
    <div class="post">

    <h3>👤 ${escapeHTML(post.name)}</h3>

    <small>${escapeHTML(post.email)}</small>

    <p>${escapeHTML(post.text) || ""}</p>

    ${
    post.mediaType === "image"
    ? `<img src="${escapeHTML(post.mediaUrl)}" style="width:100%;margin-top:12px;border-radius:15px;max-height:500px;object-fit:cover;">`
    : ""
    }

    ${
    post.mediaType === "video"
    ? `<video controls style="width:100%;margin-top:12px;border-radius:15px;max-height:500px;"><source src="${escapeHTML(post.mediaUrl)}"></video>`
    : ""
    }

    <div class="actions">

    <button id="likeBtn" style="border:none;background:none;font-size:22px;cursor:pointer;">${heart}</button>
    <span id="likeCount">${post.likes || 0}</span>

    &nbsp;&nbsp;&nbsp;

    💬 <span id="commentCount">${comments.length}</span>

    </div>

    <div id="commentsBox" style="margin-top:15px;">

    ${comments.map(comment => `
    <div style="padding:8px 0;border-bottom:1px solid #eee;">
    <b>${escapeHTML(comment.name)}</b><br>
    ${escapeHTML(comment.text)}
    </div>
    `).join("")}

    <input id="commentInput" placeholder="Write a comment..." style="width:100%;margin-top:12px;padding:10px;border-radius:10px;border:1px solid #ccc;">

    <button id="sendCommentBtn" style="margin-top:10px;padding:10px 16px;border:none;background:#1565c0;color:white;border-radius:10px;cursor:pointer;">Post</button>

    </div>

    </div>
    `;

    document.getElementById("likeBtn").onclick = toggleLike;
    document.getElementById("sendCommentBtn").onclick = postComment;

}

async function toggleLike() {

    const postRef = doc(db, "posts", postId);

    try {

        const snap = await getDoc(postRef);

        if (!snap.exists()) return;

        const post = snap.data();
        const likedBy = post.likedBy || [];
        const alreadyLiked = likedBy.includes(currentUID);

        if (alreadyLiked) {

            await updateDoc(postRef, {
                likes: increment(-1),
                likedBy: arrayRemove(currentUID)
            });

        } else {

            await updateDoc(postRef, {
                likes: increment(1),
                likedBy: arrayUnion(currentUID)
            });

            if (post.uid && post.uid !== currentUID) {
                await createNotification(post.uid, currentUID, "like", "liked your post");
            }

        }

        const updatedSnap = await getDoc(postRef);
        renderPost(updatedSnap.data());

    } catch (error) {

        alert(error.message);

    }

}

async function postComment() {

    const input = document.getElementById("commentInput");
    const text = input.value.trim();

    if (text === "") {
        alert("Write a comment first.");
        return;
    }

    const postRef = doc(db, "posts", postId);

    try {

        const snap = await getDoc(postRef);

        if (!snap.exists()) return;

        const post = snap.data();
        const comments = post.comments || [];

        const userSnap = await getDoc(doc(db, "users", currentUID));

        let userName = "Anonymous";

        if (userSnap.exists()) {
            userName = userSnap.data().name;
        }

        comments.push({
            name: userName,
            text: text,
            createdAt: Date.now()
        });

        await updateDoc(postRef, {
            comments: comments
        });

        if (post.uid && post.uid !== currentUID) {
            await createNotification(post.uid, currentUID, "comment", "commented on your post");
        }

        const updatedSnap = await getDoc(postRef);
        renderPost(updatedSnap.data());

    } catch (error) {

        alert(error.message);

    }

}
