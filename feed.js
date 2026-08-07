import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";

import {
    getAuth
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

import {
    getFirestore,
    collection,
    getDocs,
    query,
    orderBy,
    doc,
    getDoc,
    updateDoc,
    increment,
    arrayUnion,
    arrayRemove,
    addDoc,
    serverTimestamp
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

async function loadPosts() {

    const feed = document.getElementById("feed");

    feed.innerHTML = `
        <p style="text-align:center;padding:20px;">
            Loading posts...
        </p>
    `;

    try {

        const q = query(
            collection(db, "posts"),
            orderBy("createdAt", "desc")
        );

        const snapshot = await getDocs(q);

        feed.innerHTML = "";

        if (snapshot.empty) {

            feed.innerHTML = `
                <p style="text-align:center;color:#666;">
                    No posts yet.
                </p>
            `;

            return;
        }

        snapshot.forEach((docSnap) => {

            const post = docSnap.data();

            const liked =
                auth.currentUser &&
                (post.likedBy || []).includes(auth.currentUser.uid);

            const heart = liked ? "❤️" : "🤍";

            const comments = post.comments || [];

            feed.innerHTML += `

<div class="post">

<h3>👤 ${escapeHTML(post.name)}</h3>

<small>${escapeHTML(post.email)}</small>

<p>${escapeHTML(post.text) || ""}</p>

${
post.mediaType==="image"
?`
<img
src="${escapeHTML(post.mediaUrl)}"
style="
width:100%;
margin-top:12px;
border-radius:15px;
max-height:500px;
object-fit:cover;
">
`
:""
}

${
post.mediaType==="video"
?`
<video
controls
style="
width:100%;
margin-top:12px;
border-radius:15px;
max-height:500px;
">
<source src="${escapeHTML(post.mediaUrl)}">
</video>
`
:""
}

<div class="actions">

<button
class="likeBtn"
data-id="${docSnap.id}"
style="
border:none;
background:none;
font-size:22px;
cursor:pointer;
">
${heart}
</button>

<span>${post.likes || 0}</span>

&nbsp;&nbsp;&nbsp;

<button
class="commentBtn"
data-id="${docSnap.id}"
style="
border:none;
background:none;
font-size:20px;
cursor:pointer;
">
💬
</button>

<span>${comments.length}</span>

<button
class="shareBtn"
data-id="${docSnap.id}"
style="
border:none;
background:none;
font-size:20px;
cursor:pointer;
">
🔗
</button>

<button
class="sendToBtn"
data-id="${docSnap.id}"
style="
border:none;
background:none;
font-size:20px;
cursor:pointer;
">
↪️
</button>

</div>

<div
class="commentsBox"
id="comments-${docSnap.id}"
style="display:none;margin-top:15px;">

${comments.map(comment=>`
<div style="
padding:8px 0;
border-bottom:1px solid #eee;
">
<b>${escapeHTML(comment.name)}</b><br>
${escapeHTML(comment.text)}
</div>
`).join("")}

<input
id="input-${docSnap.id}"
class="commentInput"
placeholder="Write a comment..."
style="
width:100%;
margin-top:12px;
padding:10px;
border-radius:10px;
border:1px solid #ccc;
">

<button
class="sendComment"
data-id="${docSnap.id}"
style="
margin-top:10px;
padding:10px 16px;
border:none;
background:#1565c0;
color:white;
border-radius:10px;
cursor:pointer;
">
Post
</button>

</div>

</div>

<hr style="margin:20px 0;">

`;

        });

    } catch (error) {

        feed.innerHTML = `
            <p style="color:red;text-align:center;">
                ${error.message}
            </p>
        `;

    }

}

document.addEventListener("click", async (e) => {

    // ❤️ LIKE / UNLIKE
    if (e.target.classList.contains("likeBtn")) {

        const postId = e.target.dataset.id;
        const postRef = doc(db, "posts", postId);

        try {

            const snap = await getDoc(postRef);

            if (!snap.exists()) return;

            const post = snap.data();

            const uid = auth.currentUser.uid;

            const likedBy = post.likedBy || [];

            if (likedBy.includes(uid)) {

                await updateDoc(postRef, {
                    likes: increment(-1),
                    likedBy: arrayRemove(uid)
                });

            } else {

                await updateDoc(postRef, {
                    likes: increment(1),
                    likedBy: arrayUnion(uid)
                });

                // 🔔 Notify post owner
                if (post.uid !== uid) {

                    await createNotification(
                        post.uid,
                        uid,
                        "like",
                        "liked your post"
                    );

                }

            }

            await loadPosts();

        } catch (error) {

            alert(error.message);

        }

        return;

    }

    // 💬 OPEN / CLOSE COMMENTS
    if (e.target.classList.contains("commentBtn")) {

        const id = e.target.dataset.id;

        const box = document.getElementById(`comments-${id}`);

        box.style.display =
            box.style.display === "none"
            ? "block"
            : "none";

        return;

    }

    // 🔗 NATIVE SHARE
    if (e.target.classList.contains("shareBtn")) {

        const postId = e.target.dataset.id;
        const shareUrl = `${window.location.origin}${window.location.pathname.replace("feed.html", "")}post.html?postId=${postId}`;

        if (navigator.share) {

            try {
                await navigator.share({
                    title: "Backchod Club",
                    text: "Check out this post!",
                    url: shareUrl
                });
            } catch (e) {
                // User cancelled the share sheet - nothing to do
            }

        } else {

            try {
                await navigator.clipboard.writeText(shareUrl);
                alert("🔗 Link copied to clipboard!");
            } catch (e) {
                prompt("Copy this link:", shareUrl);
            }

        }

        return;

    }

    // ↪️ SEND TO A FRIEND
    if (e.target.classList.contains("sendToBtn")) {

        openSharePicker(e.target.dataset.id);

        return;

    }

    // ✍ POST COMMENT
    if (e.target.classList.contains("sendComment")) {

        const id = e.target.dataset.id;

        const input =
            document.getElementById(`input-${id}`);

        const text = input.value.trim();

        if (!text) {

            alert("Write a comment first.");

            return;

        }

        const postRef = doc(db, "posts", id);

        try {

            const snap = await getDoc(postRef);

            if (!snap.exists()) return;

            const post = snap.data();

            const comments = post.comments || [];

            const userSnap = await getDoc(
                doc(db, "users", auth.currentUser.uid)
            );

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

            // 🔔 Notify post owner
            if (post.uid !== auth.currentUser.uid) {

                await createNotification(
                    post.uid,
                    auth.currentUser.uid,
                    "comment",
                    "commented on your post"
                );

            }

            await loadPosts();

        } catch (error) {

            console.error(error);;

        }

    }

});

// ---------- Share To Friend Popup ----------

const sharePopupOverlay = document.getElementById("sharePopupOverlay");
const closeSharePopup = document.getElementById("closeSharePopup");
const shareSearch = document.getElementById("shareSearch");
const shareResultsBox = document.getElementById("shareResultsBox");

let sharePostId = null;

function openSharePicker(postId) {

    sharePostId = postId;

    shareSearch.value = "";
    shareResultsBox.innerHTML = "";

    sharePopupOverlay.classList.add("show");

    shareSearch.focus();

}

closeSharePopup.addEventListener("click", () => {
    sharePopupOverlay.classList.remove("show");
});

sharePopupOverlay.addEventListener("click", (event) => {
    if (event.target === sharePopupOverlay) {
        sharePopupOverlay.classList.remove("show");
    }
});

shareSearch.addEventListener("input", async () => {

    const search = shareSearch.value.trim().toLowerCase();

    shareResultsBox.innerHTML = "";

    if (search === "" || !auth.currentUser) return;

    try {

        const usersSnapshot = await getDocs(collection(db, "users"));

        usersSnapshot.forEach((userDoc) => {

            if (userDoc.id === auth.currentUser.uid) return;

            const member = userDoc.data();

            if (member.name && member.name.toLowerCase().includes(search)) {

                shareResultsBox.innerHTML += `
                <div class="opponentResult" data-id="${userDoc.id}">
                    <span>${escapeHTML(member.name)}</span>
                    <button class="sendPostBtn" data-id="${userDoc.id}">
                        Send
                    </button>
                </div>
                `;

            }

        });

        document.querySelectorAll(".sendPostBtn").forEach((btn) => {

            btn.onclick = () => sendPostToFriend(btn.dataset.id);

        });

    } catch (error) {

        console.log(error);

    }

});

async function sendPostToFriend(friendUID) {

    if (!sharePostId || !auth.currentUser) return;

    try {

        const postSnap = await getDoc(doc(db, "posts", sharePostId));

        if (!postSnap.exists()) {
            alert("This post no longer exists.");
            return;
        }

        const post = postSnap.data();

        const currentUID = auth.currentUser.uid;
        const chatId = [currentUID, friendUID].sort().join("_");

        const snippet =
            (post.text || "").slice(0, 120) +
            ((post.text || "").length > 120 ? "..." : "");

        await addDoc(
            collection(db, "chats", chatId, "messages"),
            {
                sender: currentUID,
                receiver: friendUID,
                type: "shared_post",
                text: "📎 Shared a post",
                sharedPostId: sharePostId,
                sharedPostAuthor: post.name || "Unknown",
                sharedPostText: snippet,
                sharedPostMedia:
                    post.mediaType === "image" ? (post.mediaUrl || null) : null,
                createdAt: serverTimestamp()
            }
        );

        await createNotification(
            friendUID,
            currentUID,
            "message",
            "shared a post with you"
        );

        alert("✅ Post sent!");

        sharePopupOverlay.classList.remove("show");

    } catch (error) {

        alert(error.message);

    }

}

loadPosts();