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

const CLOUD_NAME = "wl7uusrv";
const UPLOAD_PRESET = "bakchod_uploads";

const MAX_IMAGE_SIZE = 2 * 1024 * 1024;
const TARGET_IMAGE_SIZE = 1.9 * 1024 * 1024;
const MAX_VIDEO_DURATION = 90;
const MAX_VIDEO_WIDTH = 1280;
const MAX_VIDEO_HEIGHT = 720;

let currentUser = null;
let currentProfile = null;
let selectedFile = null;
let mediaType = null;
let videoNeeds720p = false;

const postBtn = document.getElementById("postBtn");
const postText = document.getElementById("postText");
const imageInput = document.getElementById("imageInput");
const videoInput = document.getElementById("videoInput");
const preview = document.getElementById("preview");

function setStatus(message) {
    let status = document.getElementById("uploadStatus");

    if (!status) {
        status = document.createElement("div");
        status.id = "uploadStatus";
        status.style.cssText = `
            margin:15px 0;
            padding:12px 14px;
            border-radius:14px;
            background:#eef5ff;
            color:#1565c0;
            font-size:14px;
            line-height:1.4;
            text-align:center;
        `;
        preview.after(status);
    }

    status.textContent = message;
    status.style.display = message ? "block" : "none";
}

function clearPreviewURL() {
    const media = preview.querySelector("img, video");
    if (media?.src?.startsWith("blob:")) {
        URL.revokeObjectURL(media.src);
    }
}

function showImagePreview(file) {
    clearPreviewURL();
    const url = URL.createObjectURL(file);

    preview.innerHTML = `
        <img
            src="${url}"
            alt="Selected image"
            style="max-width:100%;border-radius:15px;margin-top:15px;">
    `;
}

function showVideoPreview(file) {
    clearPreviewURL();
    const url = URL.createObjectURL(file);

    preview.innerHTML = `
        <video controls playsinline
            style="width:100%;border-radius:15px;margin-top:15px;">
            <source src="${url}">
        </video>
    `;
}

let heic2anyPromise = null;

// Loads the heic2any library only the first time it's actually needed,
// instead of on every page visit.
function loadHeic2Any() {
    if (!heic2anyPromise) {
        heic2anyPromise = import("https://esm.sh/heic2any@0.0.4")
            .then((mod) => mod.default);
    }
    return heic2anyPromise;
}

async function convertHeicToJpeg(file) {

    const heic2any = await loadHeic2Any();

    const result = await heic2any({
        blob: file,
        toType: "image/jpeg",
        quality: 0.85
    });

    // heic2any returns an array only for multi-image HEIC files
    // (e.g. Live Photos) - normal single photos return one Blob.
    const jpegBlob = Array.isArray(result) ? result[0] : result;

    const newName =
        (file.name || "photo").replace(/\.[^.]+$/, "") + ".jpg";

    return new File([jpegBlob], newName, { type: "image/jpeg" });

}

function getImageElement(file) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();

        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve(img);
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error("Could not read the image."));
        };

        img.src = url;
    });
}

async function compressImage(file) {
    if (file.size <= MAX_IMAGE_SIZE) {
        return file;
    }

    setStatus("🗜️ Compressing image... Please wait");

    let img;

    try {
        if (window.createImageBitmap) {
            try {
                const bitmap = await createImageBitmap(file, {
                    imageOrientation: "from-image"
                });
                img = bitmap;
            } catch {
                img = await getImageElement(file);
            }
        } else {
            img = await getImageElement(file);
        }

        const originalWidth = img.width;
        const originalHeight = img.height;

        // Keep the original dimensions first. Only reduce dimensions if
        // quality compression alone cannot bring the file below the target.
        let width = originalWidth;
        let height = originalHeight;
        let quality = 0.88;
        let blob = null;

        for (let attempt = 0; attempt < 7; attempt++) {
            const canvas = document.createElement("canvas");
            canvas.width = Math.max(1, Math.round(width));
            canvas.height = Math.max(1, Math.round(height));

            const ctx = canvas.getContext("2d", { alpha: true });
            if (!ctx) throw new Error("Image compression is not supported on this device.");

            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            blob = await new Promise(resolve => {
                canvas.toBlob(resolve, "image/webp", quality);
            });

            if (!blob) {
                throw new Error("Could not compress the image.");
            }

            if (blob.size <= TARGET_IMAGE_SIZE) {
                break;
            }

            if (quality > 0.62) {
                quality -= 0.06;
            } else {
                width *= 0.85;
                height *= 0.85;
                quality = 0.78;
            }
        }

        if (img.close) img.close();

        if (!blob) throw new Error("Could not compress the image.");

        return new File(
            [blob],
            `${file.name.replace(/\.[^/.]+$/, "")}.webp`,
            { type: "image/webp", lastModified: Date.now() }
        );

    } catch (error) {
        if (img?.close) img.close();
        throw error;
    }
}

function readVideoMetadata(file) {
    return new Promise((resolve, reject) => {
        const video = document.createElement("video");
        const url = URL.createObjectURL(file);

        video.preload = "metadata";
        video.muted = true;
        video.playsInline = true;

        video.onloadedmetadata = () => {
            const metadata = {
                duration: video.duration,
                width: video.videoWidth,
                height: video.videoHeight
            };

            URL.revokeObjectURL(url);
            video.removeAttribute("src");
            video.load();
            resolve(metadata);
        };

        video.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error("Could not read the video."));
        };

        video.src = url;
    });
}

function getCloudinaryVideoUrl(data) {
    if (!data.public_id) return data.secure_url;

    // Cloudinary creates the optimized 720p delivery version on request.
    // The original upload remains available in Cloudinary.
    return `https://res.cloudinary.com/${CLOUD_NAME}/video/upload/c_limit,w_${MAX_VIDEO_WIDTH},h_${MAX_VIDEO_HEIGHT},q_auto,vc_auto/${data.public_id}`;
}

async function uploadToCloudinary(file, type) {
    const formData = new FormData();

    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET);

    const resourceType = type === "video" ? "video" : "image";

    const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`,
        {
            method: "POST",
            body: formData
        }
    );

    const data = await response.json();

    if (!response.ok) {
        console.error(data);
        throw new Error(data?.error?.message || "Upload failed.");
    }

    if (type === "video") {
        return getCloudinaryVideoUrl(data);
    }

    return data.secure_url;
}

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        alert("Please login first.");
        window.location.href = "login.html";
        return;
    }

    currentUser = user;

    const snap = await getDoc(doc(db, "users", user.uid));

    if (snap.exists()) {
        currentProfile = snap.data();
    }
});

imageInput.addEventListener("change", async () => {
    const file = imageInput.files[0];
    if (!file) return;

    const nameLower = (file.name || "").toLowerCase();
    const isHeic =
        file.type === "image/heic" ||
        file.type === "image/heif" ||
        nameLower.endsWith(".heic") ||
        nameLower.endsWith(".heif");

    if (isHeic) {

        try {

            setStatus("🔄 Converting iPhone photo... Please wait");

            const convertedFile = await convertHeicToJpeg(file);

            selectedFile = convertedFile;
            mediaType = "image";
            videoNeeds720p = false;
            videoInput.value = "";

            showImagePreview(convertedFile);

            if (convertedFile.size > MAX_IMAGE_SIZE) {
                setStatus(`✅ Converted. Image is ${(convertedFile.size / 1024 / 1024).toFixed(1)} MB and will be compressed before upload.`);
            } else {
                setStatus("✅ Converted and ready to post.");
            }

        } catch (error) {

            console.error(error);

            selectedFile = null;
            mediaType = null;
            imageInput.value = "";
            setStatus("");

            alert(
                "😕 Couldn't convert this iPhone photo automatically.\n\n" +
                "Please pick a JPG or PNG instead, or check your iPhone's Settings > Camera > Formats and switch to \"Most Compatible\"."
            );

        }

        return;

    }

    try {
        selectedFile = file;
        mediaType = "image";
        videoNeeds720p = false;
        videoInput.value = "";

        showImagePreview(file);

        if (file.size > MAX_IMAGE_SIZE) {
            setStatus(`📦 Image is ${(file.size / 1024 / 1024).toFixed(1)} MB. It will be compressed before upload.`);
        } else {
            setStatus("✅ Image is within the 2 MB limit.");
        }
    } catch (error) {
        selectedFile = null;
        mediaType = null;
        imageInput.value = "";
        setStatus("");
        alert(error.message);
    }
});

videoInput.addEventListener("change", async () => {
    const file = videoInput.files[0];
    if (!file) return;

    try {
        setStatus("🔎 Checking video duration and resolution...");

        const metadata = await readVideoMetadata(file);

        if (!Number.isFinite(metadata.duration) || metadata.duration > MAX_VIDEO_DURATION + 0.05) {
            videoInput.value = "";
            selectedFile = null;
            mediaType = null;
            videoNeeds720p = false;
            preview.innerHTML = "";
            setStatus("");
            alert("⏱️ Video must be 90 seconds or shorter.");
            return;
        }

        selectedFile = file;
        mediaType = "video";
        videoNeeds720p =
            metadata.width > MAX_VIDEO_WIDTH ||
            metadata.height > MAX_VIDEO_HEIGHT;

        imageInput.value = "";
        showVideoPreview(file);

        if (videoNeeds720p) {
            setStatus(`🎥 ${metadata.width}×${metadata.height} detected. It will be delivered at a maximum of 720p.`);
        } else {
            setStatus(`✅ Video accepted: ${metadata.width}×${metadata.height}, ${metadata.duration.toFixed(1)} seconds.`);
        }

    } catch (error) {
        selectedFile = null;
        mediaType = null;
        videoNeeds720p = false;
        videoInput.value = "";
        preview.innerHTML = "";
        setStatus("");
        alert(error.message);
    }
});

postBtn.addEventListener("click", async () => {
    const text = postText.value.trim();

    if (text === "" && !selectedFile) {
        alert("Write something or select an image/video.");
        return;
    }

    if (!currentUser) {
        alert("Please wait for your account to finish loading.");
        return;
    }

    try {
        postBtn.disabled = true;
        postBtn.innerText = "Uploading...";

        let mediaUrl = null;
        let fileToUpload = selectedFile;

        if (selectedFile && mediaType === "image") {
            if (selectedFile.size > MAX_IMAGE_SIZE) {
                fileToUpload = await compressImage(selectedFile);
                setStatus(`✅ Image compressed to ${(fileToUpload.size / 1024 / 1024).toFixed(2)} MB.`);
            }

            setStatus("☁️ Uploading image...");
            mediaUrl = await uploadToCloudinary(fileToUpload, "image");
        }

        if (selectedFile && mediaType === "video") {
            setStatus(
                videoNeeds720p
                    ? "☁️ Uploading video and preparing 720p delivery..."
                    : "☁️ Uploading video..."
            );

            mediaUrl = await uploadToCloudinary(selectedFile, "video");
        }

        await addDoc(collection(db, "posts"), {
            uid: currentUser.uid,
            name: currentProfile?.name || currentUser.displayName || "Unknown",
            email: currentProfile?.email || currentUser.email || "",
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
        clearPreviewURL();
        preview.innerHTML = "";
        setStatus("");
        selectedFile = null;
        mediaType = null;
        videoNeeds720p = false;

        window.location.href = "home.html";

    } catch (error) {
        console.error(error);

        if (error.message === "Could not read the image.") {
            alert(
                "😕 This photo couldn't be opened - it may be in an unsupported format or corrupted.\n\n" +
                "Try a different photo, or a JPG/PNG exported from your gallery."
            );
        } else {
            alert(error.message || "Something went wrong.");
        }
    } finally {
        postBtn.disabled = false;
        postBtn.innerText = "🚀 Post";
    }
});
