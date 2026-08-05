import { auth, db } from "./firebase.js";

import {
    doc,
    getDoc,
    updateDoc,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

const callId = localStorage.getItem("currentCall");
let role = localStorage.getItem("currentCallRole");

const callType = document.querySelector(".callType");
const callerName = document.getElementById("callerName");
const callerPhoto = document.getElementById("callerPhoto");
const profilePlaceholder = document.getElementById("profilePlaceholder");
const callStatus = document.querySelector(".callStatus");
const acceptBtn = document.getElementById("acceptBtn");
const rejectBtn = document.getElementById("rejectBtn");
const cancelBtn = document.getElementById("cancelBtn");

let callHandled = false;
let unsubscribe = null;
let timeoutId = null;

function clearLocalCall() {
    localStorage.removeItem("currentCall");
    localStorage.removeItem("currentCallRole");
}

function stopWatching() {
    if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
    }

    if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
    }
}

function setStatus(text) {
    callStatus.textContent = text;
}

function setPhoto(user) {
    callerPhoto.onload = () => {
        callerPhoto.style.display = "block";
        profilePlaceholder.style.display = "none";
    };

    callerPhoto.onerror = () => {
        callerPhoto.style.display = "none";
        profilePlaceholder.style.display = "flex";
    };

    callerPhoto.style.display = "none";
    profilePlaceholder.style.display = "flex";
    profilePlaceholder.textContent =
        (user.name || "?").charAt(0).toUpperCase();

    const photoURL = typeof user.photoURL === "string"
        ? user.photoURL.trim()
        : "";

    if (photoURL) {
        callerPhoto.src = photoURL;
    } else {
        callerPhoto.removeAttribute("src");
    }
}

function goHome() {
    stopWatching();
    clearLocalCall();
    window.location.href = "home.html";
}

function configureUI() {
    const isCaller = role === "caller";

    if (isCaller) {
        callType.textContent = "📞 Outgoing Voice Call";
        setStatus("📞 Calling...");

        acceptBtn.style.display = "none";
        rejectBtn.style.display = "none";
        cancelBtn.style.display = "block";
    } else {
        callType.textContent = "📞 Incoming Voice Call";
        setStatus("📞 Calling you...");

        acceptBtn.style.display = "block";
        rejectBtn.style.display = "block";
        cancelBtn.style.display = "none";
    }
}

async function finishWithStatus(text, delay = 900) {
    if (callHandled) return;

    callHandled = true;
    stopWatching();
    setStatus(text);

    acceptBtn.disabled = true;
    rejectBtn.disabled = true;
    cancelBtn.disabled = true;

    setTimeout(goHome, delay);
}

async function handleCallUpdate(data) {
    if (callHandled) return;

    if (data.status === "accepted") {
        callHandled = true;
        stopWatching();
        clearLocalCall();

        setStatus("🤝 Accepted — connecting...");

        setTimeout(() => {
            window.location.href = `voiceCall.html?callId=${callId}`;
        }, 250);

        return;
    }

    if (data.status === "rejected") {
        await finishWithStatus("❌ Call Declined");
        return;
    }

    if (data.status === "missed") {
        await finishWithStatus(
            role === "caller"
                ? "📵 No Answer"
                : "📵 Missed Call"
        );
        return;
    }

    if (data.status === "cancelled") {
        await finishWithStatus(
            role === "caller"
                ? "📴 Call Cancelled"
                : "📵 Caller Cancelled"
        );
        return;
    }

    if (data.status === "ended") {
        await finishWithStatus("📴 Call Ended");
    }
}

async function loadCall(user) {
    if (!callId) {
        goHome();
        return;
    }

    const callRef = doc(db, "calls", callId);
    const callSnap = await getDoc(callRef);

    if (!callSnap.exists()) {
        goHome();
        return;
    }

    const call = callSnap.data();

    // Recover the role if localStorage was cleared or changed.
    if (role !== "caller" && role !== "receiver") {
        role = call.caller === user.uid ? "caller" : "receiver";
        localStorage.setItem("currentCallRole", role);
    }

    const isCaller = role === "caller";

    // Only the actual caller or receiver should be allowed to use this page.
    if (user.uid !== call.caller && user.uid !== call.receiver) {
        goHome();
        return;
    }

    configureUI();

    const otherUID = isCaller ? call.receiver : call.caller;
    const userSnap = await getDoc(doc(db, "users", otherUID));

    if (userSnap.exists()) {
        const otherUser = userSnap.data();
        callerName.textContent = otherUser.name || "Unknown User";
        setPhoto(otherUser);
    } else {
        callerName.textContent = "Unknown User";
        setPhoto({ name: "?", photoURL: "" });
    }

    // If the call changed before this page finished loading, handle it now.
    if (call.status !== "ringing") {
        await handleCallUpdate(call);
        return;
    }

    // Both sides watch the same Firestore document.
    unsubscribe = onSnapshot(callRef, async (snapshot) => {
        if (callHandled) return;

        if (!snapshot.exists()) {
            await finishWithStatus("📴 Call Ended");
            return;
        }

        await handleCallUpdate(snapshot.data());
    });

    // Safety timeout. This is now on the call screen itself, so it survives
    // navigation away from chat.html.
    timeoutId = setTimeout(async () => {
        if (callHandled) return;

        try {
            const latest = await getDoc(callRef);

            if (latest.exists() && latest.data().status === "ringing") {
                await updateDoc(callRef, {
                    status: "missed",
                    answered: true
                });
            }
        } catch (error) {
            console.log("Call timeout error:", error);
        }
    }, 30000);
}

acceptBtn.addEventListener("click", async () => {
    if (callHandled || role !== "receiver") return;

    try {
        callHandled = true;
        stopWatching();
        acceptBtn.disabled = true;
        rejectBtn.disabled = true;

        setStatus("🤝 Accepted — connecting...");

        await updateDoc(doc(db, "calls", callId), {
            status: "accepted",
            answered: true
        });

        clearLocalCall();

        window.location.href = `voiceCall.html?callId=${callId}`;

    } catch (error) {
        callHandled = false;
        acceptBtn.disabled = false;
        rejectBtn.disabled = false;
        setStatus("⚠️ Could not accept the call");
        console.log(error);
    }
});

rejectBtn.addEventListener("click", async () => {
    if (callHandled || role !== "receiver") return;

    try {
        callHandled = true;
        stopWatching();
        acceptBtn.disabled = true;
        rejectBtn.disabled = true;

        setStatus("❌ Call Declined");

        await updateDoc(doc(db, "calls", callId), {
            status: "rejected",
            answered: true
        });

        clearLocalCall();
        setTimeout(() => {
            window.location.href = "home.html";
        }, 700);

    } catch (error) {
        callHandled = false;
        acceptBtn.disabled = false;
        rejectBtn.disabled = false;
        setStatus("⚠️ Could not reject the call");
        console.log(error);
    }
});

cancelBtn.addEventListener("click", async () => {
    if (callHandled || role !== "caller") return;

    try {
        callHandled = true;
        stopWatching();
        cancelBtn.disabled = true;

        setStatus("📴 Cancelling call...");

        await updateDoc(doc(db, "calls", callId), {
            status: "cancelled",
            answered: true
        });

        clearLocalCall();
        setTimeout(() => {
            window.location.href = "home.html";
        }, 500);

    } catch (error) {
        callHandled = false;
        cancelBtn.disabled = false;
        setStatus("⚠️ Could not cancel the call");
        console.log(error);
    }
});

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "login.html";
        return;
    }

    try {
        await loadCall(user);
    } catch (error) {
        console.log("Incoming call error:", error);
        goHome();
    }
});
