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
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const messagesBox = document.getElementById("messages");

backBtn.addEventListener("click",()=>{
history.back();
});

const urlParams = new URLSearchParams(window.location.search);
const otherUID = urlParams.get("uid");

if(!otherUID){
alert("Invalid chat.");
window.location.href="home.html";
}

onAuthStateChanged(auth,async(user)=>{

if(!user){
window.location.href="login.html";
return;
}

const currentUID=user.uid;
const chatId=[currentUID,otherUID].sort().join("_");

// Load other user's name
try{

const userSnap=await getDoc(doc(db,"users",otherUID));

if(userSnap.exists()){

chatName.textContent=userSnap.data().name;

}else{

chatName.textContent="Unknown User";

}

}catch(error){

chatName.textContent="Unknown User";

}

// Send Message

sendBtn.addEventListener("click", async ()=>{

const text=messageInput.value.trim();

if(text==="") return;

try{

await addDoc(
collection(db,"chats",chatId,"messages"),
{

sender:currentUID,
receiver:otherUID,
text:text,
createdAt:serverTimestamp()

}
);

messageInput.value="";

}catch(error){

alert(error.message);

}

});
// Real-time Messages

const q = query(
collection(db,"chats",chatId,"messages"),
orderBy("createdAt")
);

onSnapshot(q,(snapshot)=>{

messagesBox.innerHTML="";

snapshot.forEach((docSnap)=>{

const msg=docSnap.data();

const div=document.createElement("div");

div.dataset.id=docSnap.id;

if(msg.sender===currentUID){

div.className="message myMessage";

}else{

div.className="message otherMessage";

}

div.textContent=msg.text;

messagesBox.appendChild(div);

// Long Press Delete

let pressTimer;

div.addEventListener("touchstart",()=>{

if(msg.sender!==currentUID) return;

pressTimer=setTimeout(async()=>{

const confirmDelete=confirm("Delete this message?");

if(!confirmDelete) return;

try{

await deleteDoc(
doc(
db,
"chats",
chatId,
"messages",
div.dataset.id
)
);

}catch(error){

alert(error.message);

}

},700);

});

div.addEventListener("touchend",()=>{

clearTimeout(pressTimer);

});

div.addEventListener("touchmove",()=>{

clearTimeout(pressTimer);

});

});

messagesBox.scrollTop=messagesBox.scrollHeight;

});
// Close authentication block

});
