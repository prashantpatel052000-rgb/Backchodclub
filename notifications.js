import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";

import {
getAuth,
onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

import {
getFirestore,
collection,
query,
where,
orderBy,
onSnapshot,
updateDoc,
doc
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

const notificationList =
document.getElementById("notificationList");

onAuthStateChanged(auth,(user)=>{

if(!user) return;

const q = query(
collection(db,"notifications"),
where("to","==",user.uid),
orderBy("createdAt","desc")
);

onSnapshot(q,(snapshot)=>{

notificationList.innerHTML="";

if(snapshot.empty){

notificationList.innerHTML=
"<p style='text-align:center;'>No notifications yet.</p>";

return;

}

snapshot.forEach((docSnap)=>{

const n = docSnap.data();

notificationList.innerHTML += `
<div class="notification ${!n.read ? "unread" : ""}"
data-id="${docSnap.id}">
<h3>${n.text}</h3>
</div>
`;

});

document.querySelectorAll(".notification").forEach((item)=>{

item.addEventListener("click",async()=>{

await updateDoc(
doc(db,"notifications",item.dataset.id),
{
read:true
}
);

// Navigation based on notification type
// We'll add this in the next step.

});

});

});

});