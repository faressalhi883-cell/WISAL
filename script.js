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

let currentChatId = null;
let unsubscribeMessages = null;
let currentUserData = null;

// 1. دالة التنقل بين الأقسام
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

// 2. دالة تفعيل البرق (تغطية الشاشة واهتزاز الهاتف)
window.triggerLightning = function() {
    const overlay = document.getElementById('lightning-overlay');
    if(overlay) {
        overlay.classList.remove('strike');
        void overlay.offsetWidth; // إعادة تشغيل الأنيميشن
        overlay.classList.add('strike');
    }
    // اهتزاز الهاتف إذا كان يدعم ذلك
    if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100, 50, 200]);
    }
};

// 3. مراقبة تسجيل الدخول وإضافة زر الخروج
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const headerRight = document.querySelector('.header-right');
        if(headerRight && !document.getElementById('logout-btn')) {
            const logoutBtn = document.createElement('button');
            logoutBtn.id = 'logout-btn';
            logoutBtn.innerHTML = '<i class="uil uil-signout"></i>';
            logoutBtn.style.cssText = 'background: none; border: none; font-size: 24px; color: #ff4d4d; cursor: pointer; margin-right: 15px; text-shadow: 1px 1px 2px #000;';
            logoutBtn.onclick = () => { if(confirm("تسجيل الخروج؟")) signOut(auth).then(() => window.location.href = './login.html'); };
            headerRight.prepend(logoutBtn);
        }
        
        try {
            const userRef = doc(db, "users", user.uid);
            const userSnap = await getDoc(userRef);
            if (!userSnap.exists()) {
                await setDoc(userRef, { uid: user.uid, name: user.displayName || user.email.split("@")[0], email: user.email, photoURL: DEFAULT_AVATAR, createdAt: serverTimestamp() });
            }
            currentUserData = (await getDoc(userRef)).data();
            updateAvatars(currentUserData.photoURL || DEFAULT_AVATAR);
        } catch (e) { console.log("User error:", e); }
        
        loadPosts(); 
    } else {
        window.location.href = './login.html';
    }
});

// دالة تحديث الصور في الواجهة
function updateAvatars(url) {
    const headerAvatar = document.getElementById('header-avatar');
    const postAvatar = document.getElementById('post-avatar');
    if(headerAvatar) headerAvatar.src = url;
    if(postAvatar) postAvatar.src = url;
}

// 4. تغيير الصورة الشخصية
const profilePicInput = document.getElementById('profile-pic-input');
if(profilePicInput) {
    profilePicInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if(file && auth.currentUser) {
            try {
                alert("جاري رفع الصورة...");
                const formData = new FormData(); formData.append('image', file);
                const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: 'POST', body: formData });
                const data = await res.json();
                
                if (data.success) {
                    const newUrl = data.data.url;
                    await updateDoc(doc(db, "users", auth.currentUser.uid), { photoURL: newUrl });
                    updateAvatars(newUrl);
                    currentUserData.photoURL = newUrl;
                    alert("تم تحديث الصورة بنجاح!");
                }
            } catch (err) { alert("حدث خطأ أثناء رفع الصورة: " + err.message); }
        }
    });
}

// 5. نظام المنشورات (النشر)
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
            reader.onload = (event) => { previewImg.src = event.target.result; previewContainer.style.display = 'block'; };
            reader.readAsDataURL(file);
        } else { previewImg.src = ""; previewContainer.style.display = 'none'; }
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
                    authorImage: currentUserData.photoURL || DEFAULT_AVATAR, 
                    createdAt: serverTimestamp(), likedBy: []
                });
                postInput.value = ''; imageInput.value = ''; 
                previewImg.src = ""; previewContainer.style.display = 'none';
            } catch (e) { alert("حدث خطأ: " + e.message); } 
            finally { postBtn.innerText = "نشر"; postBtn.disabled = false; }
        } else { alert("اكتب شيئاً أو اختر صورة"); }
    });
}

// حذف المنشور
window.deletePost = async (postId) => {
    if(confirm("هل أنت متأكد من حذف هذا المنشور؟")) {
        try { await deleteDoc(doc(db, "posts", postId)); } catch (error) { alert("حدث خطأ: " + error.message); }
    }
};

// 6. جلب وعرض المنشورات
function loadPosts() {
    const container = document.getElementById('feeds-container');
    if(!container) return;
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    
    onSnapshot(q, (snapshot) => {
        container.innerHTML = ""; 
        snapshot.forEach((docSnap) => {
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
            info.append(name, time); header.append(avatar, info);

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
            if (data.imageUrl) { const img = document.createElement('img'); img.src = data.imageUrl; img.className = 'feed-img'; content.appendChild(img); }

            // الأزرار
            const actions = document.createElement('div'); actions.className = 'feed-actions';
            
            // الإعجاب
            const likedBy = data.likedBy || []; const isLiked = likedBy.includes(user.uid); const likeCount = likedBy.length;
            const likeBtn = document.createElement('button');
            likeBtn.style.cssText = 'display:flex; align-items:center; gap:5px; cursor:pointer; background:none; border:none;';
            likeBtn.innerHTML = isLiked ? `<i class="uil uil-thumbs-up"></i> أعجبني (${likeCount})` : `<i class="uil uil-thumbs-up"></i> أعجبني`;
            if (isLiked) likeBtn.style.color = 'var(--gold)'; else likeBtn.style.color = 'var(--text-muted)';

            likeBtn.onclick = async () => {
                window.triggerLightning(); // تشغيل البرق عند الإعجاب
                const postRef = doc(db, "posts", postId);
                try {
                    if (isLiked) await updateDoc(postRef, { likedBy: arrayRemove(user.uid) });
                    else await updateDoc(postRef, { likedBy: arrayUnion(user.uid) });
                } catch (error) { alert("حدث خطأ: " + error.message); }
            };

            // التعليق
            const commentBtn = document.createElement('button');
            commentBtn.innerHTML = '<i class="uil uil-comment-alt-message"></i> تعليق';
            commentBtn.style.cssText = 'background:none; border:none; color:var(--text-muted); cursor:pointer;';
            
            // المشاركة
            const shareBtn = document.createElement('button');
            shareBtn.innerHTML = '<i class="uil uil-share-alt"></i> مشاركة';
            shareBtn.style.cssText = 'background:none; border:none; color:var(--text-muted); cursor:pointer;';
            shareBtn.onclick = () => {
                const shareText = `${data.author} كتب: "${data.text}"\n\nشاهد المزيد على CHAT ROOM:\n${window.location.href}`;
                if (navigator.share) navigator.share({ title: 'CHAT ROOM', text: shareText }).catch(() => alert("تم النسخ!"));
                else alert("تم النسخ!");
            };

            actions.append(likeBtn, commentBtn, shareBtn);

            // حاوية التعليقات
            const commentsSection = document.createElement('div'); commentsSection.className = 'comments-section';
            commentsSection.style.display = 'none'; // مخفية افتراضياً
            commentsSection.innerHTML = `
                <div id="comments-list-${postId}" style="max-height: 150px; overflow-y: auto; margin-bottom: 10px;"></div>
                <div class="comment-input-area" style="display: flex; gap: 5px;">
                    <input type="text" id="comment-input-${postId}" placeholder="اكتب تعليقاً..." style="flex: 1; padding: 8px; border-radius: 4px; border: 1px solid var(--wood-light); background: #1f140d; color: #fff;">
                    <button id="comment-btn-${postId}" class="btn-primary" style="padding: 8px 12px;">إرسال</button>
                </div>
            `;

            commentBtn.onclick = () => {
                if(commentsSection.style.display === 'block') commentsSection.style.display = 'none';
                else { commentsSection.style.display = 'block'; loadComments(postId); }
            };

            feed.append(header, content, actions, commentsSection); 
            container.appendChild(feed);

            // ربط زر إرسال التعليق
            setTimeout(() => {
                const submitBtn = document.getElementById(`comment-btn-${postId}`);
                const commentInput = document.getElementById(`comment-input-${postId}`);
                if(submitBtn && commentInput) {
                    submitBtn.onclick = async () => {
                        const cText = commentInput.value.trim();
                        if(cText) {
                            await addDoc(collection(db, "posts", postId, "comments"), {
                                uid: user.uid, author: data.author || 'مستخدم', text: cText, createdAt: serverTimestamp()
                            });
                            commentInput.value = '';
                        }
                    };
                }
            }, 100);
        });
    });
}

// دالة جلب التعليقات
function loadComments(postId) {
    const listContainer = document.getElementById(`comments-list-${postId}`);
    if(!listContainer) return;
    
    const q = query(collection(db, "posts", postId, "comments"), orderBy("createdAt", "asc"));
    onSnapshot(q, (snapshot) => {
        listContainer.innerHTML = '';
        if(snapshot.empty) { listContainer.innerHTML = '<p style="font-size:12px; color:var(--text-muted);">لا توجد تعليقات بعد.</p>'; return; }
        snapshot.forEach((doc) => {
            const c = doc.data();
            const div = document.createElement('div'); div.className = 'comment-item';
            div.style.cssText = 'display:flex; gap:8px; margin-bottom:8px; background: rgba(0,0,0,0.2); padding:8px; border-radius:4px;';
            div.innerHTML = `<img src="${DEFAULT_AVATAR}" style="width:25px; height:25px; border-radius:4px;"><div><span style="font-size:11px; color:var(--gold); font-weight:bold;">${c.author}</span><p style="font-size:13px; margin:0; color:#fff;">${c.text}</p></div>`;
            listContainer.appendChild(div);
        });
    });
}

// 7. نظام المحادثات
async function loadUsersList() {
    const container = document.getElementById('users-container'); if (!container || !auth.currentUser) return;
    container.innerHTML = '<p style="text-align:center; color:var(--text-muted);">جاري التحميل...</p>';
    try {
        const q = query(collection(db, "users"), where("uid", "!=", auth.currentUser.uid));
        const snapshot = await getDocs(q); container.innerHTML = '';
        if (snapshot.empty) { container.innerHTML = '<p style="text-align:center; color:var(--text-muted);">لا يوجد مستخدمون آخرون.</p>'; return; }
        snapshot.forEach((doc) => {
            const u = doc.data(); const div = document.createElement('div'); div.className = 'chat-item';
            const img = document.createElement('img'); img.src = u.photoURL || DEFAULT_AVATAR; img.className = 'profile-pic';
            const info = document.createElement('div'); info.className = 'chat-info';
            const name = document.createElement('h4'); name.textContent = u.name || 'مستخدم';
            const hint = document.createElement('p'); hint.textContent = 'انقر لبدء المحادثة';
            info.append(name, hint); div.append(img, info); div.onclick = () => startChat(u.uid, u.name); container.appendChild(div);
        });
    } catch (e) { container.innerHTML = '<p style="color:red; text-align:center;">حدث خطأ في التحميل</p>'; }
}

async function startChat(otherUid, otherName) {
    currentChatId = [auth.currentUser.uid, otherUid].sort().join("_");
    document.getElementById('chat-list-view').style.display = 'none'; document.getElementById('chat-room-view').style.display = 'flex';
    document.getElementById('chat-with-name').innerText = otherName;
    const chatRef = doc(db, "chats", currentChatId); const chatSnap = await getDoc(chatRef);
    if (!chatSnap.exists()) { await setDoc(chatRef, { participants: [auth.currentUser.uid, otherUid], lastMessage: "", lastSender: "", updatedAt: serverTimestamp() }); }
    loadMessages();
}

function loadMessages() {
    const container = document.getElementById('messages-container'); container.innerHTML = '';
    if (unsubscribeMessages) unsubscribeMessages();
    const q = query(collection(db, "chats", currentChatId, "messages"), orderBy("createdAt", "asc"));
    unsubscribeMessages = onSnapshot(q, (snapshot) => {
        container.innerHTML = '';
        snapshot.forEach((doc) => {
            const msg = doc.data(); const isMe = msg.senderId === auth.currentUser.uid;
            const div = document.createElement('div'); div.className = isMe ? 'message sent' : 'message received';
            div.textContent = msg.text; container.appendChild(div);
        });
        container.scrollTop = container.scrollHeight;
    });
}

document.getElementById('send-message-btn')?.addEventListener('click', async () => {
    const input = document.getElementById('message-input'); const text = input.value.trim();
    if (text && currentChatId && auth.currentUser) {
        input.value = '';
        try {
            await addDoc(collection(db, "chats", currentChatId, "messages"), { senderId: auth.currentUser.uid, text: text, createdAt: serverTimestamp() });
            await updateDoc(doc(db, "chats", currentChatId), { lastMessage: text, lastSender: auth.currentUser.uid, updatedAt: serverTimestamp() });
        } catch (e) { alert("فشل الإرسال: " + e.message); }
    }
});

window.closeChatRoom = function() {
    document.getElementById('chat-room-view').style.display = 'none'; document.getElementById('chat-list-view').style.display = 'block';
    if (unsubscribeMessages) unsubscribeMessages(); currentChatId = null;
};
