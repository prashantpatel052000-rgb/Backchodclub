import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";

import {
  getAuth,
  createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

import {
  getFirestore,
  doc,
  setDoc
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

const form = document.getElementById("clubForm");

form.addEventListener("submit", async (e) => {

    e.preventDefault();

    const name = document.getElementById("username").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    const gender = document.querySelector('input[name="gender"]:checked').value;
    const intellect = document.querySelector('input[name="intellect"]:checked'). value;
    const comment = document.getElementById("comment").value;
    const favouriteWork = document.getElementById("favouriteWork").value;
    const experience = document.querySelector('input[name="bakchodi"]:checked'). value;
    const reason = document.querySelector('input[name="reason"]:checked').value;

    try {

        const userCredential = await createUserWithEmailAndPassword(auth, email, password);

        await setDoc(doc(db, "users", userCredential.user.uid), {

            name: name,
            email: email,
            gender: gender,
            intellect: intellect,
            comment: comment,
            favouriteWork: favouriteWork,
            experience: experience,
            reason: reason,
            joinedOn: new Date().toISOString()

        });

        alert("🎉 Account Created Successfully!");

        window.location.href = "form2.html";

    } catch (error) {

        alert(error.message);

    }

});