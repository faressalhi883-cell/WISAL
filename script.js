import { initializeApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, where, doc, getDoc, setDoc, updateDoc, getDocs, deleteDoc, arrayUnion, arrayRemove } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";
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
const DEFAULT_AVATAR = "https://ui-avatars.com/api/?name=User&background=7b2cbf&color=fff";

// 1. التنقل
window.switchTab = function(tabName) {
    document.querySelectorAll('.section').forEach(sec => sec.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    const target = document.getElementById(tabName + '-tab');
    if (target) target.classList.add('active');
    
    const buttons = document.querySelectorAll('.mobile-tabs .tab-btn');
    const index = ["home", "reels", "chats", "groups"].indexOf(tabName);
    if (index !== -1 && buttons[index]) buttons[index].classList.add('active');
    
    if(tabName === 'chats' && typeof loadUsersList === 'function') loadUsersList();
};

// 2. الحساب والوضع الليلي
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const headerRight = document.querySelector('.header-right');
        if(headerRight && !document.getElementById('logout-btn')) {
            const logoutBtn = document.createElement('button');
            logoutBtn.id = 'logout-btn';
            logoutBtn.innerHTML = '<i class="uil uil-signout"></i>';
            logoutBtn.style.cssText = 'background: none; border: none; font-size: 24px; color: #ff4d4d; cursor: pointer; margin-right: 15px;';
            logoutBtn.onclick = () => { if(confirm("تسجيل الخروج؟")) signOut(auth).then(() => window.location.href = './login.html'); };
            headerRight.prepend(logoutBtn);
        }
        
        try {
            const userRef = doc(db, "users", user.uid);
            const userSnap = await getDoc(userRef);
            if (!userSnap.exists()) {
                await setDoc(userRef, { uid: user.uid, name: user.displayName || user.email.split("@")[0], email: user.email, createdAt: serverTimestamp() });
            }
        } catch (e) { console.log("User error:", e); }
        
        loadPosts(); 
    } else {
        window.location.href = './login.html';
    }
});

document.addEventListener("DOMContentLoaded", () => {
    const themeBtn = document.getElementById('theme-toggle');
    if(themeBtn) {
        const icon = themeBtn.querySelector('i');
        themeBtn.addEventListener('click', () => {
            document.body.classList.toggle('dark-theme');
            const isDark = document.body.classList.contains('dark-theme');
            icon.className = isDark ? 'uil uil-sun' : 'uil uil-moon';
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
        });
        if (localStorage.getItem('theme') === 'dark') {
            document.body.classList.add('dark-theme');
            icon.className = 'uil uil-sun';
        }
    }
});

// 3. المنشورات
const postBtn = document.getElementById('post-btn');
const postInput = document.getElementById('create-post-input');
const imageInput = document.getElementById('image-input');
const previewContainer = document.getElementById('image-preview-container');
const previewImg = document.getElementById('image-preview');

if(imageInput) {
    imageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                previewImg.src = event.target.result;
                previewContainer.style.display = 'block';
            };
            reader.readAsDataURL(file);
        } else {
            previewImg.src = "";
            previewContainer.style.display = 'none';
        }
    });
}

if(postBtn) {
    postBtn.addEventListener('click', async () => {
        const text = postInput.value.trim();
        const imageFile = imageInput.files[0];
        const user = auth.currentUser;
        if (!user) return alert("يجب تسجيل الدخول أولاً");

        if (text !== '' || imageFile) {
            postBtn.innerText = "..."; postBtn.disabled = true;
            try {
                let imageUrl = "";
                if (imageFile) {
                    const formData = new FormData(); formData.append('image', imageFile);
                    const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: 'POST', body: formData });
                    const data = await res.json(); if (data.success) imageUrl = data.data.url;
                }
                
                await addDoc(collection(db, "posts"), { 
                    uid: user.uid, text: text, imageUrl: imageUrl, 
                    author: user.displayName || user.email.split("@")[0], 
                    authorImage: DEFAULT_AVATAR, createdAt: serverTimestamp(),
                    likedBy: [] // مصفوفة فارغة للمعجبين
                });
                postInput.value = ''; imageInput.value = ''; 
                previewImg.src = ""; previewContainer.style.display = 'none';
            } catch (e) { alert("حدث خطأ: " + e.message); } 
            finally { postBtn.innerText = "نشر"; postBtn.disabled = false; }
        } else { alert("اكتب شيئاً أو اختر صورة"); }
    });
}

window.deletePost = async (postId) => {
    if(confirm("هل أنت متأكد من حذف هذا المنشور؟")) {
        try { await deleteDoc(doc(db, "posts", postId)); } 
        catch (error) { alert("حدث خطأ أثناء الحذف: " + error.message); }
    }
};

function fallbackCopyTextToClipboard(text) {
    var textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    document.body.appendChild(textArea);
    textArea.focus(); textArea.select();
    try {
        document.execCommand('copy');
        alert("تم نسخ نص المشاركة بنجاح!");
    } catch (err) { alert("لم يتمكن المتصفح من نسخ النص."); }
    document.body.removeChild(textArea);
}

function loadPosts() {
    const container = document.getElementById('feeds-container');
    if(!container) return;
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    
    onSnapshot(q, (snapshot) => {
        container.innerHTML = ""; 
        snapshot.forEach((docSnap) => { // استخدام docSnap لتجنب التعارض
            const data = docSnap.data();
            const postId = docSnap.id;
            const user = auth.currentUser;
            
            const feed = document.createElement('div'); feed.className = 'feed';
            
            // الهيدر
            const header = document.createElement('div'); header.className = 'feed-header';
            const avatar = document.createElement('img'); avatar.src = data.authorImage || DEFAULT_AVATAR; avatar.className = 'profile-pic';
            avatar.onerror = () => { avatar.src = DEFAULT_AVATAR; };

            const info = document.createElement('div'); info.className = 'feed-info';
            const name = document.createElement('h4'); name.textContent = data.author || 'مستخدم';
            const time = document.createElement('span'); const date = data.createdAt?.toDate?.(); time.textContent = date ? date.toLocaleString('ar-DZ') : 'الآن';
            info.append(name, time); 
            header.append(avatar, info);

            if (data.uid === user.uid) {
                const deleteBtn = document.createElement('button');
                deleteBtn.innerHTML = '<i class="uil uil-trash-alt"></i>';
                deleteBtn.style.cssText = 'background:none; border:none; color:#ff4d4d; cursor:pointer; font-size:20px; margin-right:auto;';
                deleteBtn.onclick = () => window.deletePost(postId);
                header.appendChild(deleteBtn);
            }

            // المحتوى
            const content = document.createElement('div'); content.className = 'feed-content';
            const text = document.createElement('p'); text.textContent = data.text || ''; content.appendChild(text);
            if (data.imageUrl) { 
                const img = document.createElement('img'); img.src = data.imageUrl; img.className = 'feed-img'; 
                img.onerror = () => { img.style.display = 'none'; }; 
                content.appendChild(img); 
            }

            // الأزرار
            const actions = document.createElement('div'); actions.className = 'feed-actions';
            
            // --- منطق زر الإعجاب ---
            const likedBy = data.likedBy || [];
            const isLiked = likedBy.includes(user.uid);
            const likeCount = likedBy.length;

            const likeBtn = document.createElement('button');
            likeBtn.style.cssText = 'display:flex; align-items:center; gap:5px; cursor:pointer; background:none; border:none;';
            
            if (isLiked) {
                likeBtn.style.color = '#1877f2';
                likeBtn.innerHTML = `<i class="uil uil-thumbs-up"></i> أعجبني (${likeCount})`;
            } else {
                likeBtn.style.color = 'var(--text-muted)';
                likeBtn.innerHTML = `<i class="uil uil-thumbs-up"></i> أعجبني ${likeCount > 0 ? `(${likeCount})` : ''}`;
            }

            likeBtn.onclick = async () => {
                const postRef = doc(db, "posts", postId);
                try {
                    if (isLiked) {
                        await updateDoc(postRef, { likedBy: arrayRemove(user.uid) });
                    } else {
                        await updateDoc(postRef, { likedBy: arrayUnion(user.uid) });
                    }
                } catch (error) { alert("حدث خطأ: " + error.message); }
            };
            // ----------------------

            const commentBtn = document.createElement('button');
            commentBtn.innerHTML = '<i class="uil uil-comment-alt-message"></i> تعليق';
            commentBtn.style.cssText = 'background:none; border:none; color:var(--text-muted); cursor:pointer;';
            commentBtn.onclick = () => alert("ميزة التعليقات قريباً!");

            const shareBtn = document.createElement('button');
            shareBtn.innerHTML = '<i class="uil uil-share-alt"></i> مشاركة';
            shareBtn.style.cssText = 'background:none; border:none; color:var(--text-muted); cursor:pointer;';
            shareBtn.onclick = () => {
                const shareText = `${data.author} كتب: "${data.text}"\n\nشاهد المزيد على CHAT ROOM:\n${window.location.href}`;
                if (navigator.share) {
                    navigator.share({ title: 'CHAT ROOM', text: shareText }).catch(() => fallbackCopyTextToClipboard(shareText));
                } else {
                    fallbackCopyTextToClipboard(shareText);
                }
            };

            actions.append(likeBtn, commentBtn, shareBtn);
            feed.append(header, content, actions); 
            container.appendChild(feed);
        });
    });
}

// 4. المحادثات
let currentChatId = null;
let unsubscribeMessages = null;

async function loadUsersList() {
    const container = document.getElementById('users-container');
    if (!container || !auth.currentUser) return;
    container.innerHTML = '<p style="text-align:center; color:gray;">جاري التحميل...</p>';
    try {
        const q = query(collection(db, "users"), where("uid", "!=", auth.currentUser.uid));
        const snapshot = await getDocs(q);
        container.innerHTML = '';
        if (snapshot.empty) { container.innerHTML = '<p style="text-align:center; color:gray;">لا يوجد مستخدمون آخرون.</p>'; return; }
        snapshot.forEach((doc) => {
            const u = doc.data();
            const div = document.createElement('div'); div.className = 'chat-item';
            const img = document.createElement('img'); img.src = DEFAULT_AVATAR; img.className = 'profile-pic';
            const info = document.createElement('div'); info.className = 'chat-info';
            const name = document.createElement('h4'); name.textContent = u.name || 'مستخدم';
            const hint = document.createElement('p'); hint.textContent = 'انقر لبدء المحادثة';
            info.append(name, hint); div.append(img, info);
            div.onclick = () => startChat(u.uid, u.name);
            container.appendChild(div);
        });
    } catch (e) { container.innerHTML = '<p style="color:red;">حدث خطأ في التحميل</p>'; }
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
    const container = document.getElementById('messages-container');
    container.innerHTML = '';
    if (unsubscribeMessages) unsubscribeMessages();
    const q = query(collection(db, "chats", currentChatId, "messages"), orderBy("createdAt", "asc"));
    unsubscribeMessages = onSnapshot(q, (snapshot) => {
        container.innerHTML = '';
        snapshot.forEach((doc) => {
            const msg = doc.data(); const isMe = msg.senderId === auth.currentUser.uid;
            const div = document.createElement('div');
            div.className = isMe ? 'message sent' : 'message received';
            div.textContent = msg.text; container.appendChild(div);
        });
        container.scrollTop = container.scrollHeight;
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
