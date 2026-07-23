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
getDocs,
query,
where,
deleteDoc,
updateDoc,
arrayUnion,
arrayRemove
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

import { createNotification } from "./notificationHelper.js";

const firebaseConfig={
apiKey:"AIzaSyDJei-ATL-ka3b-bkD0nSvNZnUTMnCwS2k",
authDomain:"bakchod-club.firebaseapp.com",
projectId:"bakchod-club",
storageBucket:"bakchod-club.firebasestorage.app",
messagingSenderId:"197529524538",
appId:"1:197529524538:web:e3c4260d37020b59789803"
};

const app=initializeApp(firebaseConfig);
const auth=getAuth(app);
const db=getFirestore(app);

const CLOUD_NAME="wl7uusrv";
const UPLOAD_PRESET="bakchod_uploads";

const profileInput=document.getElementById("profileInput");
const profileImage=document.getElementById("profileImage");
const defaultAvatar=document.getElementById("defaultAvatar");
const changePhotoBtn=document.getElementById("changePhotoBtn");
const followBtn = document.getElementById("followBtn");

const followingBox = document.getElementById("followingBox");
const followersBox = document.getElementById("followersBox");

const memberList = document.getElementById("memberList");
const listTitle = document.getElementById("listTitle");
const listContent = document.getElementById("listContent");
const closeList = document.getElementById("closeList");
const deletePhotoBtn = document.getElementById("deletePhotoBtn");

changePhotoBtn.addEventListener("click",()=>{
profileInput.click();
});

let currentUser=null;

onAuthStateChanged(auth,async(user)=>{

if(!user){
window.location.href="login.html";
return;
}

currentUser=user;

try{

const urlParams = new URLSearchParams(window.location.search);

const profileUID = urlParams.get("uid") || user.uid;

const isMyProfile = profileUID === user.uid;

if(isMyProfile){

followBtn.style.display = "none";

}else{

followBtn.style.display = "block";

}

const docSnap = await getDoc(doc(db,"users",profileUID));

if(!docSnap.exists()){
alert("Profile not found.");
return;
}

const data=docSnap.data();
document.getElementById("followersCount").textContent =
(data.followers || []).length;

document.getElementById("followingCount").textContent =
(data.following || []).length;

const myDoc = await getDoc(doc(db,"users",user.uid));
const myData = myDoc.data();

if(!isMyProfile){

if((myData.following || []).includes(profileUID)){

followBtn.textContent = "✔ Following";

}else{

followBtn.textContent = "➕ Follow";

}

}

document.getElementById("name").textContent=data.name;
document.getElementById("email").textContent=data.email;
document.getElementById("gender").textContent=data.gender;
document.getElementById("intellect").textContent=data.intellect;
document.getElementById("work").textContent=data.favouriteWork;
document.getElementById("experience").textContent=data.experience;
document.getElementById("reason").textContent=data.reason;
document.getElementById("comment").textContent=data.comment;

if(data.photoURL){

profileImage.src=data.photoURL;
profileImage.style.display="block";
defaultAvatar.style.display="none";

}

const q=query(
collection(db,"posts"),
where("uid","==",profileUID)
);

const snapshot=await getDocs(q);

const myPosts=document.getElementById("myPosts");

myPosts.innerHTML="";

let totalPosts=0;
let totalLikes=0;
let totalComments=0;

snapshot.forEach((postDoc)=>{

const post=postDoc.data();

totalPosts++;

totalLikes+=post.likes||0;

totalComments+=(post.comments||[]).length;

myPosts.innerHTML+=`

<div class="postCard">

<p>${post.text||""}</p>

${
post.mediaType==="image"
?`<img src="${post.mediaUrl}" style="width:100%;border-radius:15px;margin-top:10px;">`
:""
}

${
post.mediaType==="video"
?`<video controls style="width:100%;border-radius:15px;margin-top:10px;"><source src="${post.mediaUrl}"></video>`
:""
}

<button
class="deleteBtn"
data-id="${postDoc.id}">
🗑 Delete Post
</button>

</div>

`;

});
document.getElementById("totalPosts").textContent=totalPosts;
document.getElementById("totalLikes").textContent=totalLikes;
document.getElementById("totalComments").textContent=totalComments;

document.querySelectorAll(".deleteBtn").forEach((btn)=>{

btn.addEventListener("click",async()=>{

const confirmDelete=confirm(
"Are you sure you want to delete this post?"
);

if(!confirmDelete) return;

try{

await deleteDoc(doc(db,"posts",btn.dataset.id));

btn.closest(".postCard").remove();

totalPosts--;

document.getElementById("totalPosts").textContent=totalPosts;

alert("🗑️ Post deleted successfully!");

}catch(error){

alert(error.message);

}

});

});

}catch(error){

alert(error.message);

}

});
async function uploadToCloudinary(file){

const formData=new FormData();

formData.append("file",file);
formData.append("upload_preset",UPLOAD_PRESET);

const response=await fetch(
`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
{
method:"POST",
body:formData
}
);

if(!response.ok){
throw new Error("Failed to upload profile picture.");
}

const data=await response.json();

return data.secure_url;

}

profileInput.addEventListener("change",async()=>{

const file=profileInput.files[0];

if(!file) return;

try{

changePhotoBtn.innerText="Uploading...";

const photoURL=await uploadToCloudinary(file);

await updateDoc(
doc(db,"users",currentUser.uid),
{
photoURL:photoURL
}
);

profileImage.src=photoURL;
profileImage.style.display="block";
defaultAvatar.style.display="none";

alert("🎉 Profile picture updated!");

}catch(error){

alert(error.message);

}finally{

changePhotoBtn.innerText="📷 Change Profile Picture";

}

});
deletePhotoBtn.addEventListener("click", async () => {

if(!currentUser) return;

const confirmDelete=confirm(
"Remove your profile picture?"
);

if(!confirmDelete) return;

try{

await updateDoc(
doc(db,"users",currentUser.uid),
{
photoURL:null
}
);

profileImage.src="";
profileImage.style.display="none";
defaultAvatar.style.display="block";

alert("✅ Profile picture removed.");

}catch(error){

alert(error.message);

}

});

followBtn.addEventListener("click", async () => {

const currentUser = auth.currentUser;

const urlParams = new URLSearchParams(window.location.search);
const profileUID = urlParams.get("uid");

if(!profileUID || profileUID===currentUser.uid) return;

try{

const myRef = doc(db,"users",currentUser.uid);
const profileRef = doc(db,"users",profileUID);

const mySnap = await getDoc(myRef);
const myData = mySnap.data();

const alreadyFollowing =
(myData.following || []).includes(profileUID);

if(alreadyFollowing){

await updateDoc(myRef,{
following:arrayRemove(profileUID)
});

await updateDoc(profileRef,{
followers:arrayRemove(currentUser.uid)
});

followBtn.textContent="➕ Follow";

}
else{

await updateDoc(myRef,{
following:arrayUnion(profileUID)
});

await updateDoc(profileRef,{
followers:arrayUnion(currentUser.uid)
});

await createNotification(
profileUID,
currentUser.uid,
"follow",
"started following you"
);

followBtn.textContent="✔ Following";

}

}catch(error){

alert(error.message);

}

});

closeList.addEventListener("click", () => {

memberList.style.display = "none";

});

followingBox.addEventListener("click", async () => {

const urlParams = new URLSearchParams(window.location.search);

const profileUID = urlParams.get("uid") || auth.currentUser.uid;

const userSnap = await getDoc(doc(db,"users",profileUID));

const userData = userSnap.data();

listTitle.textContent = "Following";

listContent.innerHTML = "";

for(const uid of (userData.following || [])){

const memberSnap = await getDoc(doc(db,"users",uid));

if(memberSnap.exists()){

const member = memberSnap.data();

listContent.innerHTML += `
<div
class="memberItem"
data-id="${uid}"
style="
padding:15px;
border-bottom:1px solid #ddd;
cursor:pointer;
">
${member.name}
</div>
`;

}

}

memberList.style.display = "block";

document.querySelectorAll(".memberItem").forEach((item)=>{

item.addEventListener("click",()=>{

window.location.href =
`profile.html?uid=${item.dataset.id}`;

});

});

});

followersBox.addEventListener("click", async () => {

const urlParams = new URLSearchParams(window.location.search);

const profileUID = urlParams.get("uid") || auth.currentUser.uid;

const userSnap = await getDoc(doc(db,"users",profileUID));

const userData = userSnap.data();

listTitle.textContent = "Followers";

listContent.innerHTML = "";

for(const uid of (userData.followers || [])){

const memberSnap = await getDoc(doc(db,"users",uid));

if(memberSnap.exists()){

const member = memberSnap.data();

listContent.innerHTML += `
<div
class="memberItem"
data-id="${uid}"
style="
padding:15px;
border-bottom:1px solid #ddd;
cursor:pointer;
">
${member.name}
</div>
`;

}

}

memberList.style.display = "block";

document.querySelectorAll(".memberItem").forEach((item)=>{

item.addEventListener("click",()=>{

window.location.href =
`profile.html?uid=${item.dataset.id}`;

});

});

});

const messageBtn = document.getElementById("messageBtn");

messageBtn.addEventListener("click", () => {

    const urlParams = new URLSearchParams(window.location.search);

    let profileUID = urlParams.get("uid");

    // If viewing your own profile, use your own UID
    if (!profileUID) {
        profileUID = auth.currentUser.uid;
    }

    window.location.href = `chat.html?uid=${profileUID}`;

});