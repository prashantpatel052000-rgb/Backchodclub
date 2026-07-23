import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";

import {
getAuth,
onAuthStateChanged,
signOut
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

import {
getFirestore,
doc,
getDoc,
collection,
getDocs,
query,
where,
orderBy
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

const searchInput = document.getElementById("searchInput");
const searchResults = document.getElementById("searchResults");

onAuthStateChanged(auth, async (user) => {

if (!user) {  
    window.location.href = "login.html";  
    return;  
}  

try {  

    const docSnap = await getDoc(doc(db, "users", user.uid));  

    if (docSnap.exists()) {  

        const data = docSnap.data();  

        document.getElementById("welcomeText").innerText =  
            `Welcome, ${data.name}! 👋`;  

        document.getElementById("userInfo").innerHTML = `  
            📧 <b>Email:</b> ${data.email}<br><br>  
            Congratulations on becoming an official member of the Backchod Club.  
            This is a place where fun comes first, seriousness is optional,  
            and unlimited bakchodi is always welcome.  
        `;  

    }  

} catch (error) {  

    alert(error.message);  

}

});

document.getElementById("logoutBtn").addEventListener("click", async () => {

await signOut(auth);  
window.location.href = "login.html";

});

async function loadPosts() {

const feed = document.getElementById("feed");  
feed.innerHTML = "<p>Loading posts...</p>";  

try {  

    const q = query(  
        collection(db, "posts"),  
        orderBy("createdAt", "desc")  
    );  

    const querySnapshot = await getDocs(q);  

    feed.innerHTML = "";  

    if (querySnapshot.empty) {  

        feed.innerHTML = `  
            <p style="text-align:center;color:#666;">  
                No posts yet. Be the first to post! 🎉  
            </p>  
        `;  
        return;  

    }  

    querySnapshot.forEach((docSnap) => {  

        const post = docSnap.data();  

        feed.innerHTML += `  
            <div class="post">  

                <h3>👤 ${post.name}</h3>  

                <small>${post.email}</small>  

                <p style="margin:12px 0;">  
                    ${post.text}  
                </p>  

                <hr style="margin:10px 0;">  

                ❤️ ${post.likes || 0}  
                &nbsp;&nbsp;  
                💬 ${post.comments || 0}  

            </div>  
        `;  

    });  

} catch (error) {  

    alert("Error loading posts: " + error.message);  

}

}



searchInput.addEventListener("input", async () => {

const search = searchInput.value.trim().toLowerCase();

searchResults.innerHTML = "";

if(search === ""){

searchResults.style.display = "none";
return;

}

const usersSnapshot = await getDocs(collection(db,"users"));

usersSnapshot.forEach((userDoc)=>{

const member = userDoc.data();

if(
member.name &&
member.name.toLowerCase().includes(search)
){

searchResults.innerHTML += `

<div  
class="searchUser"  
data-id="${userDoc.id}">  ${member.name}

</div>  `;

}

});

searchResults.style.display =
searchResults.innerHTML ? "block" : "none";

document.querySelectorAll(".searchUser").forEach((item)=>{

item.addEventListener("click",()=>{

window.location.href =
`profile.html?uid=${item.dataset.id}`;

});

});
});