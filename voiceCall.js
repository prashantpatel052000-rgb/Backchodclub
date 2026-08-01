import { auth, db } from "./firebase.js";

import {
    doc,
    getDoc,
    updateDoc,
    onSnapshot,
    setDoc,
    collection,
    addDoc,
    getDocs,
    query,
    deleteDoc
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const urlParams = new URLSearchParams(window.location.search);

const callId = urlParams.get("callId");

if (!callId) {

    alert("Invalid Call");

    window.location.href = "home.html";

}

const callRef = doc(db, "calls", callId);

// ---------- UI ----------

const status =
document.getElementById("callStatus");

const callerName =
document.getElementById("callerName");

const callerPhoto =
document.getElementById("callerPhoto");

const profilePlaceholder =
document.getElementById("profilePlaceholder");

const timer =
document.getElementById("callTimer");

const speakerBtn =
document.getElementById("speakerBtn");

const endCallBtn =
document.getElementById("endCallBtn");

// ---------- Call ----------

let currentCall = null;

let isCaller = false;

// ---------- WebRTC ----------

let peerConnection = null;

let localStream = null;

let remoteStream = null;

const configuration = {

    iceServers: [

        {

            urls: [

                "stun:stun.l.google.com:19302"

            ]

        }

    ]

};

// ---------- Timer ----------

let timerStarted = false;

let seconds = 0;
// ---------- Load Call ----------

async function loadCall() {

    const callSnap = await getDoc(callRef);

    if (!callSnap.exists()) {

        alert("Call Not Found");

        window.location.href = "home.html";

        return;

    }

    currentCall = callSnap.data();

    isCaller =
        auth.currentUser.uid === currentCall.caller;

    const otherUID =
        isCaller
        ? currentCall.receiver
        : currentCall.caller;

    const userSnap =
        await getDoc(doc(db, "users", otherUID));

    if (userSnap.exists()) {

        const user = userSnap.data();

        callerName.innerText =
            user.name || "Unknown";

        if (user.photoURL &&
            user.photoURL.trim() !== "") {

            callerPhoto.src = user.photoURL;

            callerPhoto.style.display = "block";

            profilePlaceholder.style.display = "none";

        } else {

            callerPhoto.style.display = "none";

            profilePlaceholder.style.display = "flex";

            profilePlaceholder.innerText =
                (user.name || "?")
                .charAt(0)
                .toUpperCase();

        }

    }

}



// ---------- Call Timer ----------

function startCallTimer() {

    if (timerStarted) return;

    timerStarted = true;

    setInterval(() => {

        seconds++;

        const mins =
            String(Math.floor(seconds / 60))
            .padStart(2, "0");

        const secs =
            String(seconds % 60)
            .padStart(2, "0");

        timer.innerText =
            `${mins}:${secs}`;

    }, 1000);

}
// ---------- Initialize WebRTC ----------

async function initializeWebRTC() {

    try {

        localStream =
            await navigator.mediaDevices.getUserMedia({

                audio: true,
                video: false

            });

        console.log("🎤 Microphone Ready");

    } catch (error) {

        alert("Please allow microphone permission.");

        console.log(error);

        return;

    }

    peerConnection =
        new RTCPeerConnection(configuration);

    // Only trust "Connected" once audio is actually flowing, not the
    // moment Firestore says the call was accepted.
    peerConnection.onconnectionstatechange = () => {

        console.log("🔌 Connection state:", peerConnection.connectionState);

        if (peerConnection.connectionState === "connected") {
            status.innerText = "🟢 Connected";
            startCallTimer();
        }

        if (
            peerConnection.connectionState === "failed" ||
            peerConnection.connectionState === "disconnected"
        ) {
            status.innerText = "⚠️ Connection issue...";
        }

    };

    // Add local microphone

    localStream.getTracks().forEach(track => {

        peerConnection.addTrack(track, localStream);

    });

    // Create remote stream

    remoteStream = new MediaStream();

    const remoteAudio =
        document.createElement("audio");

    remoteAudio.autoplay = true;

    remoteAudio.playsInline = true;

    remoteAudio.srcObject = remoteStream;

    document.body.appendChild(remoteAudio);

    // Receive remote tracks

    peerConnection.ontrack = (event) => {

        event.streams[0]
            .getTracks()
            .forEach(track => {

                remoteStream.addTrack(track);

            });

    };
    // ---------- Send ICE Candidates ----------

peerConnection.onicecandidate = async (event) => {

    if (!event.candidate) return;

    await addDoc(

        collection(
            db,
            "calls",
            callId,
            isCaller
                ? "callerCandidates"
                : "receiverCandidates"
        ),

        event.candidate.toJSON()

    );

};

    console.log("🌐 WebRTC Ready");

}
// ---------- Create Offer ----------

async function createOffer() {

    if (!peerConnection) return;
    if (peerConnection.localDescription) return;

    const offer =
        await peerConnection.createOffer();

    await peerConnection.setLocalDescription(
        offer
    );

    await updateDoc(callRef, {

        offer: {

            type: offer.type,

            sdp: offer.sdp

        }

    });

    console.log("📤 Offer Created");

}
// ---------- Create Answer ----------

async function createAnswer() {

    if (!peerConnection) return;

    if (!currentCall?.offer) return;

    if (peerConnection.remoteDescription) return;

    // Use caller's offer
    await peerConnection.setRemoteDescription(

        new RTCSessionDescription(
            currentCall.offer
        )

    );

    // Create answer

    const answer =
        await peerConnection.createAnswer();

    await peerConnection.setLocalDescription(
        answer
    );

    // Save answer to Firestore

    await updateDoc(callRef, {

        answer: {

            type: answer.type,

            sdp: answer.sdp

        },

        status: "accepted",

        answered: true

    });

    console.log("📥 Answer Created");

}
// ---------- Listen For ICE Candidates ----------

function listenForIceCandidates() {

    const remoteCollection = collection(

        db,

        "calls",

        callId,

        isCaller
            ? "receiverCandidates"
            : "callerCandidates"

    );

    onSnapshot(remoteCollection, (snapshot) => {

        snapshot.docChanges().forEach(async (change) => {

            if (change.type !== "added") return;

            const candidate =
                new RTCIceCandidate(change.doc.data());

            try {

                await peerConnection.addIceCandidate(candidate);

                console.log("✅ Remote ICE Added");

            } catch (error) {

                console.log(error);

            }

        });

    });

}
// ---------- Listen For Call Updates ----------

onSnapshot(callRef, async (snapshot) => {

    if (!snapshot.exists()) {

        status.innerText = "📴 Call Ended";

        setTimeout(() => {

            window.location.href = "home.html";

        }, 1000);

        return;

    }

    const call = snapshot.data();

    currentCall = call;

// ---------- Caller receives Answer ----------

if (

    isCaller &&
    call.answer &&
    !peerConnection.remoteDescription

) {

    await peerConnection.setRemoteDescription(

        new RTCSessionDescription(call.answer)

    );

    console.log("✅ Answer Received");

}

// ---------- Receiver receives Offer ----------

if (

    !isCaller &&
    call.offer &&
    !call.answer &&
    !peerConnection.remoteDescription

) {

    currentCall = call;

    await createAnswer();

}

    switch (call.status) {

        case "ringing":

            status.innerText = "📞 Calling...";

            break;

        case "accepted":

            status.innerText = "🤝 Accepted — connecting...";

            break;

        case "rejected":

    status.innerText = "❌ Call Declined";

    await cleanupCall();

    setTimeout(() => {

        window.location.href = "home.html";

    }, 1000);

    break;

case "ended":

    status.innerText = "📴 Call Ended";

    await cleanupCall();

    setTimeout(() => {

        window.location.href = "home.html";

    }, 1000);

    break;
    }

});
// ---------- Cleanup ----------

async function clearCandidates(subcollectionName) {

    try {

        const snap = await getDocs(
            collection(db, "calls", callId, subcollectionName)
        );

        await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));

    } catch (error) {

        console.log(error);

    }

}

async function cleanupCall() {

    if (localStream) {

        localStream.getTracks().forEach(track => track.stop());

    }

    if (remoteStream) {

        remoteStream.getTracks().forEach(track => track.stop());

    }

    if (peerConnection) {

        peerConnection.close();

    }

    await Promise.all([
        clearCandidates("callerCandidates"),
        clearCandidates("receiverCandidates")
    ]);

}

// Best-effort: if this tab is closed or the user navigates away
// mid-call, tell Firestore the call ended so the other side isn't
// left stuck on a "Connected" screen forever.
function endCallSilently() {
    updateDoc(callRef, { status: "ended" }).catch(() => {});
}

window.addEventListener("pagehide", endCallSilently);
window.addEventListener("beforeunload", endCallSilently);
// ---------- End Call Button ----------

endCallBtn.onclick = async () => {

    await cleanupCall();

    await updateDoc(callRef, {

        status: "ended"

    });

    window.location.href = "home.html";

};
// ---------- Start Call System ----------

async function startCallSystem() {

    await loadCall();

    await initializeWebRTC();

    listenForIceCandidates();

    if (isCaller) {

        status.innerText = "📞 Calling...";

        await createOffer();

    } else {

        status.innerText = "⏳ Waiting for caller...";

    }

}

startCallSystem();
