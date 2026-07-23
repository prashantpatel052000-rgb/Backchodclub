import { auth, db } from "./firebase.js";

import {
collection,
query,
where,
orderBy,
onSnapshot,
doc,
getDoc,
updateDoc
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

import {
onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

window.onerror = function(message){
    alert(message);
};

const notificationList =
document.getElementById("notificationList");

onAuthStateChanged(auth,(user)=>{

if(!user){

window.location.href="login.html";
return;

}

alert("Current UID = " + user.uid);

const q=query(
collection(db,"notifications"),
where("to","==",user.uid),
orderBy("createdAt","desc")
);

onSnapshot(q, async (snapshot) => {

try{

notificationList.innerHTML="";

if(snapshot.empty){

notificationList.innerHTML=`
<p style="text-align:center;padding:20px;">
No notifications yet.
</p>
`;

return;

}

for(const notificationDoc of snapshot.docs){

const notification=notificationDoc.data();

let senderName="Someone";
let senderPhoto="";

try{

const senderSnap=await getDoc(
doc(db,"users",notification.from)
);

if(senderSnap.exists()){

senderName=senderSnap.data().name;
senderPhoto=senderSnap.data().photoURL || "";

}

}catch(e){

console.log(e);

}

const card=document.createElement("div");

card.className=`notification ${notification.read ? "" : "unread"}`;

card.innerHTML=`
<div style="display:flex;align-items:center;gap:12px;">

<img
src="${senderPhoto || ""}"
style="
width:50px;
height:50px;
border-radius:50%;
object-fit:cover;
background:#ddd;
">

<div>

<b>${senderName}</b><br>

${notification.text}

</div>

</div>
`;

card.onclick = async () => {

    await updateDoc(
        doc(db,"notifications",notificationDoc.id),
        {
            read:true
        }
    );

    if(notification.type === "message"){

        window.location.href =
        `chat.html?uid=${notification.from}`;

    }

};

notificationList.appendChild(card);

}

}catch(error){

alert(error.message);

console.log(error);

}

});
});