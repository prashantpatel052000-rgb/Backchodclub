import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";

import {
  getAuth,
  signInWithEmailAndPassword,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";


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


document.getElementById("loginForm").addEventListener("submit", async(e)=>{

e.preventDefault();


const email = document.getElementById("loginEmail").value;
const password = document.getElementById("loginPassword").value;


try{

await signInWithEmailAndPassword(auth,email,password);

alert("Welcome back to Backchod Club 😎");

window.location.href="home.html";

}

catch(error){

alert(error.message);

}

});

document.getElementById("forgotPassword").addEventListener("click", async (e) => {
    e.preventDefault();

    const email = document.getElementById("loginEmail").value;

    if (!email) {
        alert("Please enter your email first.");
        return;
    }

    try {
        await sendPasswordResetEmail(auth, email);
        alert("Password reset email sent! Check your inbox.");
    } catch (error) {
        alert(error.message);
    }
});