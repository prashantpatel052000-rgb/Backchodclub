// Import Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDJei-ATL-ka3b-bkD0nSvNZnUTMnCwS2k",
  authDomain: "bakchod-club.firebaseapp.com",
  projectId: "bakchod-club",
  storageBucket: "bakchod-club.firebasestorage.app",
  messagingSenderId: "197529524538",
  appId: "1:197529524538:web:e3c4260d37020b59789803"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export app so other files can use it
export { app };