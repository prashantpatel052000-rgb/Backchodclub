import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";

import {
getAuth,
onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

import {
getFirestore,
collection,
addDoc,
serverTimestamp,
doc,
getDoc
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

const CLOUD_NAME = "wl7uusrv";
const UPLOAD_PRESET = "bakchod_uploads";

let currentUser = null;
let currentProfile = null;

let selectedFile = null;
let mediaType = null;

const postBtn = document.getElementById("postBtn");
const postText = document.getElementById("postText");

const imageInput = document.getElementById("imageInput");
const videoInput = document.getElementById("videoInput");

const preview = document.getElementById("preview");

onAuthStateChanged(auth, async (user)=>{

if(!user){

alert("Please login first.");

window.location.href="login.html";

return;

}

currentUser = user;

const snap = await getDoc(doc(db,"users",user.uid));

if(snap.exists()){

currentProfile = snap.data();

}

});

imageInput.addEventListener("change",()=>{

const file = imageInput.files[0];

if(!file) return;

selectedFile = file;
mediaType = "image";

videoInput.value = "";

preview.innerHTML = `
<img
src="${URL.createObjectURL(file)}"
style="max-width:100%;border-radius:15px;margin-top:15px;">
`;

});

videoInput.addEventListener("change",()=>{

const file = videoInput.files[0];

if(!file) return;

selectedFile = file;
mediaType = "video";

imageInput.value = "";

preview.innerHTML = `
<video controls
style="width:100%;border-radius:15px;margin-top:15px;">
<source src="${URL.createObjectURL(file)}">
</video>
`;

});

async function uploadToCloudinary(file){

const formData = new FormData();

formData.append("file", file);

formData.append("upload_preset", UPLOAD_PRESET);

const resourceType =
mediaType === "video" ? "video" : "image";

const response = await fetch(

`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`,

{
method:"POST",
body:formData
}

);

if(!response.ok){

const errorData = await response.json();

console.log(errorData);

alert(JSON.stringify(errorData));

throw new Error(errorData.error.message);

}

const data = await response.json();

return data.secure_url;

}

postBtn.addEventListener("click", async () => {

const text = postText.value.trim();

if(text === "" && !selectedFile){

alert("Write something or select an image/video.");

return;

}

try{

postBtn.disabled = true;

postBtn.innerText = "Uploading...";

let mediaUrl = null;

if(selectedFile){

mediaUrl = await uploadToCloudinary(selectedFile);

}

await addDoc(collection(db,"posts"),{

uid: currentUser.uid,

name: currentProfile.name,

email: currentProfile.email,

text: text,

mediaUrl: mediaUrl,

mediaType: mediaType,

likes: 0,

likedBy: [],

comments: [],

createdAt: serverTimestamp()

});

alert("🎉 Post created successfully!");

postText.value = "";

imageInput.value = "";

videoInput.value = "";

preview.innerHTML = "";

selectedFile = null;

mediaType = null;

window.location.href = "home.html";

}catch(error){

console.error(error);

alert(error.message);

}finally{

postBtn.disabled = false;

postBtn.innerText = "🚀 Post";

}

});