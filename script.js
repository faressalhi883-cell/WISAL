import { initializeApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, where, doc, getDoc, setDoc, updateDoc, getDocs } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyDyV14xihKJ7pLeQ6z0k_lJmdXxpb5qoto",
    authDomain: "chat-room-c33af.firebaseapp.com",
    projectId: "chat-room-c33af",
    storageBucket: "chat-room-c33af.firebasestorage.app",
    messagingSenderId: "101331704281",
    appId: "1:101331704281:web:00a9d33be52f0e0caba1c8",
    measurementId: "G-SCM4W2SHYF"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const IMGBB_API_KEY = "b1a7511ae786e607536e4211bc606ab5";
const DEFAULT_AVATAR = "https://www.w3schools.com/howto/img_avatar.png";

// 1. التنقل
window.switchTab = function(tabName) {
    document.querySelectorAll('.section').forEach(sec => sec.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    const targetSection = document.getElementById(tabName + '-tab');
    if (targetSection) targetSection.classList.add('active');
    
    const buttons = document.querySelectorAll('.mobile-tabs .tab-btn');
    const index = ["home", "reels", "chats", "groups"].indexOf(tabName);
    if (index !== -1 && buttons[index]) buttons[index].classList.add('active');
    
    if(tabName === 'chats' && typeof loadUsersList === 'function') loadUsersList();
};

// 2. تسجيل الدخول والتحقق
onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {
            const userRef = doc(db, "users", user.uid);
            const userSnap = await getDoc(userRef);
            if (!userSnap.exists()) {
                await setDoc(userRef, { uid: user.uid, name: user.displayName || user.email.split("@")[0], email: user.email, createdAt: serverTimestamp() });
            }
            const headerRight = document.querySelector('.header-right');
            if(headerRight && !document.getElementById('logout-btn')) {
                const logoutBtn = document.createElement('button');
                logoutBtn.id = 'logout-btn';
                logoutBtn.innerHTML = '<i class="uil uil-signout"></i>';
                logoutBtn.style.cssText = 'background: none; border: none; font-size: 24px; color: #ff4d4d; cursor: pointer; margin-right: 15px;';
                logoutBtn.onclick = () => { if(confirm("تسجيل الخروج؟")) signOut(auth).then(() => window.location.href = './login.html'); };
                headerRight.prepend(logoutBtn);
            }
            loadPosts(); 
        } catch (e) { console.error(e); }
    } else {
        window.location.href = './login.html';
    }
});

// 3. الوضع الليلي
document.addEventListener("DOMContentLoaded", () => {
    const themeToggleBtn = document.getElementById('theme-toggle');
    if(themeToggleBtn) {
        const themeIcon = themeToggleBtn.querySelector('i');
        themeToggleBtn.addEventListener('click', () => {
            document.body.classList.toggle('dark-theme');
            const isDark = document.body.classList.contains('dark-theme');
            themeIcon.className = isDark ? 'uil uil-sun' : 'uil uil-moon';
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
        });
        if (localStorage.getItem('theme') === 'dark') {
            document.body.classList.add('dark-theme');
            themeIcon.className = 'uil uil-sun';
        }
    }
});

// 4. المنشورات
const postBtn = document.getElementById('post-btn');
const postInput = document.getElementById('create-post-input');
const imageInput = document.getElementById('image-input');

if(postBtn) {
    postBtn.addEventListener('click', async () => {
        const text = postInput.value.trim();
        const imageFile = imageInput.files[0];
        const user = auth.currentUser;
        if (!user) return;
        if (imageFile && imageFile.size > 5 * 1024 * 1024) return alert("حجم الصورة يجب أن يكون أقل من 5 ميغابايت");

        if (text !== '' || imageFile) {
            postBtn.innerText = "..."; postBtn.disabled = true;
            try {
                let imageUrl = "";
                if (imageFile) {
                    const formData = new FormData(); formData.append('image', imageFile);
                    const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: 'POST', body: formData });
                    const data = await res.json(); if (data.success) imageUrl = data.data.url;
                }
                await addDoc(collection(db, "posts"), { uid: user.uid, text: text, imageUrl: imageUrl, author: user.displayName || user.email.split("@")[0], authorImage: DEFAULT_AVATAR, createdAt: serverTimestamp() });
                postInput.value = ''; imageInput.value = ''; 
            } catch (e) { alert("حدث خطأ: " + e.message); } finally { postBtn.innerText = "نشر"; postBtn.disabled = false; }
        }
    });
}

function loadPosts() {
    const feedsContainer = document.getElementById('feeds-container');
    if(!feedsContainer) return;
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    onSnapshot(q, (snapshot) => {
        feedsContainer.innerHTML = ""; 
        snapshot.forEach((doc) => {
            const data = doc.data();
            const newFeed = document.createElement('div'); newFeed.classList.add('feed');
            const header = document.createElement('div'); header.className = 'feed-header';
            const avatar = document.createElement('img'); avatar.src = data.authorImage || DEFAULT_AVATAR; avatar.className = 'profile-pic';
            const info = document.createElement('div'); info.className = 'feed-info';
            const name = document.createElement('h4'); name.textContent = data.author || 'مستخدم';
            const time = document.createElement('span'); const date = data.createdAt?.toDate?.(); time.textContent = date ? date.toLocaleString('ar-DZ') : 'الآن';
            info.append(name, time); header.append(avatar, info);
            const content = document.createElement('div'); content.className = 'feed-content';
            const text = document.createElement('p'); text.textContent = data.text || ''; content.appendChild(text);
            if (data.imageUrl) { const img = document.createElement('img'); img.src = data.imageUrl; img.style.cssText = 'width:100%;border-radius:8px;margin-top:10px;'; content.appendChild(img); }
            newFeed.append(header, content); feedsContainer.appendChild(newFeed);
        });
    });
}

// 5. المحادثات
let currentChatId = null;
let unsubscribeMessages = null;

async function loadUsersList() {
    const usersContainer = document.getElementById('users-container');
    if (!usersContainer || !auth.currentUser) return;
    usersContainer.innerHTML = '<p style="text-align:center; color:gray;">جاري التحميل...</p>';
    try {
        const q = query(collection(db, "users"), where("uid", "!=", auth.currentUser.uid));
        const snapshot = await getDocs(q);
        usersContainer.innerHTML = '';
        if (snapshot.empty) { usersContainer.innerHTML = '<p style="text-align:center; color:gray;">لا يوجد مستخدمون آخرون.</p>'; return; }
        snapshot.forEach((doc) => {
            const userData = doc.data();
            const div = document.createElement('div'); div.className = 'chat-item'; div.style.cursor = 'pointer';
            const img = document.createElement('img'); img.src = DEFAULT_AVATAR; img.className = 'profile-pic';
            const info = document.createElement('div'); info.className = 'chat-info';
            const name = document.createElement('h4'); name.textContent = userData.name || 'مستخدم';
            const hint = document.createElement('p'); hint.textContent = 'انقر لبدء المحادثة'; hint.style.cssText = 'color:gray; font-size:12px;';
            info.append(name, hint); div.append(img, info);
            div.onclick = () => startChat(userData.uid, userData.name);
            usersContainer.appendChild(div);
        });
    } catch (error) { usersContainer.innerHTML = '<p style="color:red; text-align:center;">حدث خطأ في التحميل</p>'; }
}

async function startChat(otherUid, otherName) {
    currentChatId = [auth.currentUser.uid, otherUid].sort().join("_");
    document.getElementById('chat-list-view').style.display = 'none';
    document.getElementById('chat-room-view').style.display = 'flex';
    document.getElementById('chat-with-name').innerText = otherName;
    const chatRef = doc(db, "chats", currentChatId);
    const chatSnap = await getDoc(chatRef);
    if (!chatSnap.exists()) {
        await setDoc(chatRef, { participants: [auth.currentUser.uid, otherUid], lastMessage: "", lastSender: "", updatedAt: serverTimestamp() });
    }
    loadMessages();
}

function loadMessages() {
    const messagesContainer = document.getElementById('messages-container');
    messagesContainer.innerHTML = '';
    if (unsubscribeMessages) unsubscribeMessages();
    const q = query(collection(db, "chats", currentChatId, "messages"), orderBy("createdAt", "asc"));
    unsubscribeMessages = onSnapshot(q, (snapshot) => {
        messagesContainer.innerHTML = '';
        snapshot.forEach((doc) => {
            const msg = doc.data(); const isMe = msg.senderId === auth.currentUser.uid;
            const msgDiv = document.createElement('div');
            msgDiv.style.cssText = `max-width: 75%; padding: 8px 12px; border-radius: 15px; font-size: 14px; align-self: ${isMe ? 'flex-end' : 'flex-start'}; background: ${isMe ? '#1877f2' : 'var(--bg-color)'}; color: ${isMe ? 'white' : 'var(--text-color)'}; border: 1px solid var(--border-color);`;
            msgDiv.textContent = msg.text; messagesContainer.appendChild(msgDiv);
        });
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    });
}

document.getElementById('send-message-btn')?.addEventListener('click', async () => {
    const input = document.getElementById('message-input');
    const text = input.value.trim();
    if (text && currentChatId && auth.currentUser) {
        input.value = '';
        try {
            await addDoc(collection(db, "chats", currentChatId, "messages"), { senderId: auth.currentUser.uid, text: text, createdAt: serverTimestamp() });
            await updateDoc(doc(db, "chats", currentChatId), { lastMessage: text, lastSender: auth.currentUser.uid, updatedAt: serverTimestamp() });
        } catch (e) { alert("فشل الإرسال: " + e.message); }
    }
});

window.closeChatRoom = function() {
    document.getElementById('chat-room-view').style.display = 'none';
    document.getElementById('chat-list-view').style.display = 'block';
    if (unsubscribeMessages) unsubscribeMessages();
    currentChatId = null;
};

