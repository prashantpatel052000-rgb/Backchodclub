importScripts("https://www.gstatic.com/firebasejs/12.16.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.16.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyDJei-ATL-ka3b-bkD0nSvNZnUTMnCwS2k",
  authDomain: "bakchod-club.firebaseapp.com",
  projectId: "bakchod-club",
  storageBucket: "bakchod-club.firebasestorage.app",
  messagingSenderId: "197529524538",
  appId: "1:197529524538:web:e3c4260d37020b59789803"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {

  self.registration.showNotification(
    payload.notification.title,
    {
      body: payload.notification.body,
      icon: "/icon.png"
    }
  );

});