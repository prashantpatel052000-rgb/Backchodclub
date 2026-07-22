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
    arrayRemove
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

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

                <h3>👤 ${post.name}</h3>

                <small>${post.email}</small>

                <p>${post.text || ""}</p>

${
post.mediaType === "image"
? `
<img
src="${post.mediaUrl}"
style="
width:100%;
margin-top:12px;
border-radius:15px;
max-height:500px;
object-fit:cover;
">
`
: ""
}

${
post.mediaType === "video"
? `
<video
controls
style="
width:100%;
margin-top:12px;
border-radius:15px;
max-height:500px;
">
<source src="${post.mediaUrl}">
</video>
`
: ""
}

                <div class="actions">

                    <button
                        class="likeBtn"
                        data-id="${docSnap.id}"
                        style="border:none;background:none;font-size:22px;cursor:pointer;">

                        ${heart}
                    </button>

                    <span>${post.likes || 0}</span>

                    &nbsp;&nbsp;&nbsp;

                    <button
                        class="commentBtn"
                        data-id="${docSnap.id}"
                        style="border:none;background:none;font-size:20px;cursor:pointer;">

                        💬
                    </button>

                    <span>${comments.length}</span>

                </div>

                <div
                    class="commentsBox"
                    id="comments-${docSnap.id}"
                    style="display:none;margin-top:15px;">

                    ${comments.map(comment => `
                        <div style="padding:8px 0;border-bottom:1px solid #eee;">
                            <b>${comment.name}</b><br>
                            ${comment.text}
                        </div>
                    `).join("")}

                    <input
                        id="input-${docSnap.id}"
                        class="commentInput"
                        placeholder="Write a comment..."
                        style="width:100%;margin-top:12px;padding:10px;border-radius:10px;border:1px solid #ccc;">

                    <button
                        class="sendComment"
                        data-id="${docSnap.id}"
                        style="margin-top:10px;padding:10px 16px;border:none;background:#1565c0;color:white;border-radius:10px;cursor:pointer;">

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

        if (box.style.display === "none") {
            box.style.display = "block";
        } else {
            box.style.display = "none";
        }

        return;
    }

    // ✍ POST COMMENT
    if (e.target.classList.contains("sendComment")) {

        const id = e.target.dataset.id;

        const input = document.getElementById(`input-${id}`);

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

            const userRef = doc(db, "users", auth.currentUser.uid);

const userSnap = await getDoc(userRef);

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

            await loadPosts();

        } catch (error) {

            alert(error.message);

        }

    }

});

loadPosts();