import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, where, doc, getDoc, setDoc, updateDoc, getDocs, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut, updateProfile } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

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
const DEFAULT_AVATAR = "https://ui-avatars.com/api/?name=User&background=8b20e8&color=fff";

let currentChatId = null;
let unsubscribeMessages = null;
let unsubscribeComments = {};

// دالة التنبيهات
function showToast(msg) {
    const t = document.getElementById('toast');
    if(t) { t.innerText = msg; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 3000); }
}

// --- 1. التنقل ---
window.switchTab = function(tab) {
    document.querySelectorAll('main').forEach(m => m.style.display = 'none');
    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tabs button').forEach(btn => btn.classList.remove('active'));

    if (tab === 'home') {
        document.getElementById('home-section').style.display = 'block';
        document.getElementById('nav-home').classList.add('active');
        document.getElementById('tab-home').classList.add('active');
    } else if (tab === 'chats') {
        document.getElementById('chats-section').style.display = 'block';
        document.getElementById('nav-chats').classList.add('active');
        document.getElementById('tab-chats').classList.add('active');
        if(typeof loadUsersList === 'function') loadUsersList();
    } else if (tab === 'friends') {
        document.getElementById('friends-section').style.display = 'block';
        document.getElementById('nav-friends').classList.add('active');
        document.getElementById('tab-friends').classList.add('active');
        if(typeof loadFriendsList === 'function') loadFriendsList();
    } else if (tab === 'profile') {
        document.getElementById('profile-section').style.display = 'block';
        document.getElementById('nav-profile').classList.add('active');
        if(typeof loadProfile === 'function') loadProfile();
    } else if (tab === 'games') {
        document.getElementById('games-section').style.display = 'block';
        document.getElementById('nav-games').classList.add('active');
        document.getElementById('tab-games').classList.add('active');
    }
};

window.triggerLightning = function() {
    const overlay = document.getElementById('lightning-overlay');
    if(!overlay) return;
    overlay.classList.remove('strike');
    void overlay.offsetWidth;
    overlay.classList.add('strike');
    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
};

// --- 2. الأزرار العلوية والنوافذ ---
document.getElementById('menu-btn')?.addEventListener('click', () => document.getElementById('logout-modal').style.display = 'flex');
document.getElementById('logout-yes')?.addEventListener('click', () => signOut(auth).then(() => window.location.href = './login.html'));
document.getElementById('logout-no')?.addEventListener('click', () => document.getElementById('logout-modal').style.display = 'none');

document.getElementById('notif-btn')?.addEventListener('click', () => document.getElementById('notif-modal').style.display = 'flex');
document.getElementById('notif-close')?.addEventListener('click', () => document.getElementById('notif-modal').style.display = 'none');

const performSearch = () => {
    document.getElementById('search-modal').style.display = 'flex';
    document.getElementById('search-input').value = ''; 
    document.getElementById('search-input').focus();
};
document.getElementById('search-submit')?.addEventListener('click', () => {
    const query = document.getElementById('search-input').value.trim();
    document.getElementById('search-modal').style.display = 'none'; 
    if(query !== "") {
        const feeds = document.querySelectorAll('#feeds-container .feed');
        let found = 0;
        feeds.forEach(feed => {
            if(feed.textContent.includes(query)) { feed.style.display = 'block'; found++; } 
            else { feed.style.display = 'none'; }
        });
        if(found === 0) {
            showToast("لم يتم العثور على أي منشور.");
            feeds.forEach(feed => feed.style.display = 'block');
        }
    } else {
        document.querySelectorAll('#feeds-container .feed').forEach(feed => feed.style.display = 'block');
    }
});
document.getElementById('search-cancel')?.addEventListener('click', () => document.getElementById('search-modal').style.display = 'none');
document.getElementById('top-search-btn')?.addEventListener('click', performSearch);
document.getElementById('quick-search-btn')?.addEventListener('click', performSearch);

// --- 3. تسجيل الدخول ورفع الصورة ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {
            const userRef = doc(db, "users", user.uid);
            const userSnap = await getDoc(userRef);
            if (!userSnap.exists()) {
                await setDoc(userRef, { uid: user.uid, name: user.displayName || user.email.split("@")[0], email: user.email, photoURL: DEFAULT_AVATAR, createdAt: serverTimestamp() });
            }
        } catch (e) { console.log(e); }
        loadPosts(); 
    } else {
        window.location.href = './login.html';
    }
});

const profilePicInput = document.getElementById('profile-pic-input');
if(profilePicInput) {
    profilePicInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if(!file) return;
        if(file.size > 5 * 1024 * 1024) return showToast("الصورة كبيرة جداً (الحد 5MB)");
        
        const user = auth.currentUser;
        if(!user) return;
        
        showToast("جاري رفع الصورة...");
        try {
            const formData = new FormData(); formData.append('image', file);
            const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: 'POST', body: formData });
            const data = await res.json(); 
            
            if (data.success) {
                await updateDoc(doc(db, "users", user.uid), { photoURL: data.data.url });
                await updateProfile(user, { photoURL: data.data.url });
                showToast("تم تحديث الصورة بنجاح!");
            } else {
                showToast("فشل رفع الصورة.");
            }
        } catch (error) {
            showToast("حدث خطأ أثناء الرفع.");
        }
    });
}

// --- 4. النشر والمنشورات والتعليقات ---
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
            reader.onload = (ev) => { previewImg.src = ev.target.result; previewContainer.hidden = false; };
            reader.readAsDataURL(file);
        } else { previewImg.src = ""; previewContainer.hidden = true; }
    });
}

if(postBtn) {
    postBtn.addEventListener('click', async () => {
        const text = postInput.value.trim();
        const imageFile = imageInput.files[0];
        const user = auth.currentUser;
        if (!user) return showToast("يجب تسجيل الدخول أولاً");

        if (text !== '' || imageFile) {
            postBtn.innerText = "..."; postBtn.disabled = true;
            try {
                let imageUrl = "";
                if (imageFile) {
                    if(imageFile.size > 5 * 1024 * 1024) throw new Error("حجم الصورة يتجاوز 5 ميجابايت");
                    const formData = new FormData(); formData.append('image', imageFile);
                    const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: 'POST', body: formData });
                    const data = await res.json(); 
                    if (data.success) imageUrl = data.data.url;
                    else throw new Error("فشل رفع الصورة");
                }
                await addDoc(collection(db, "posts"), { 
                    uid: user.uid, text, imageUrl, 
                    author: user.displayName || user.email.split("@")[0], 
                    authorImage: user.photoURL || DEFAULT_AVATAR, 
                    createdAt: serverTimestamp() 
                });
                postInput.value = ''; imageInput.value = ''; previewImg.src = ""; previewContainer.hidden = true;
            } catch (e) { showToast("حدث خطأ: " + e.message); } 
            finally { postBtn.innerText = "نشر ✦"; postBtn.disabled = false; }
        } else { showToast("اكتب شيئاً أو اختر صورة"); }
    });
}

function loadPosts() {
    const container = document.getElementById('feeds-container');
    if(!container) return;
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    
    onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            const docSnap = change.doc;
            const data = docSnap.data();
            const postId = docSnap.id;

            if (change.type === "added") {
                const feed = document.createElement('div'); feed.className = 'feed'; feed.id = `post-${postId}`;
                
                const header = document.createElement('div'); header.className = 'feed-header';
                const img = document.createElement('img'); img.src = data.authorImage || DEFAULT_AVATAR;
                img.onerror = () => { img.src = DEFAULT_AVATAR; img.onerror = null; }; // إصلاح الصورة المكسورة
                const info = document.createElement('div'); info.className = 'feed-info';
                const h4 = document.createElement('h4'); h4.textContent = data.author;
                const span = document.createElement('span'); 
                const date = data.createdAt?.toDate?.();
                span.textContent = date ? date.toLocaleTimeString('ar-DZ') : 'الآن';
                info.append(h4, span); header.append(img, info);

                const content = document.createElement('div'); content.className = 'feed-content';
                const p = document.createElement('p'); p.textContent = data.text || ''; content.appendChild(p);
                if(data.imageUrl) {
                    const postImg = document.createElement('img'); postImg.src = data.imageUrl; postImg.className = 'feed-img'; 
                    postImg.onerror = () => { postImg.style.display = 'none'; }; // إخفاء الصورة المكسورة للمنشور
                    content.appendChild(postImg);
                }

                const actions = document.createElement('div'); actions.className = 'feed-actions';
                actions.style.cssText = 'display:flex; gap:10px; margin-top:15px; padding-top:10px; border-top:1px dashed #3a2315;';
                const commentToggle = document.createElement('button');
                commentToggle.className = 'action-btn';
                commentToggle.style.cssText = 'flex:1; background:none; border:none; color:var(--muted); font-size:13px; display:flex; justify-content:center; align-items:center; gap:5px;';
                commentToggle.innerHTML = '<i class="uil uil-comment-alt-message"></i> تعليق';
                actions.appendChild(commentToggle);

                const commentsContainer = document.createElement('div'); commentsContainer.id = `comments-container-${postId}`;
                commentsContainer.style.cssText = 'display:none; margin-top:10px;';
                const commentsList = document.createElement('div'); commentsList.id = `comments-list-${postId}`;
                commentsList.style.cssText = 'max-height:150px; overflow-y:auto; margin-bottom:10px;';
                
                const inputArea = document.createElement('div'); inputArea.style.cssText = 'display:flex; gap:5px;';
                const cInput = document.createElement('input'); cInput.type = 'text'; cInput.id = `comment-input-${postId}`; cInput.placeholder = 'اكتب تعليقاً...';
                cInput.style.cssText = 'flex:1; padding:8px; border-radius:10px; border:1px solid #3a2315; background:#170d09; color:white; font-size:13px;';
                const cBtn = document.createElement('button'); cBtn.id = `comment-btn-${postId}`; cBtn.textContent = 'إرسال';
                cBtn.style.cssText = 'background:var(--purple); color:white; border:none; padding:8px 15px; border-radius:10px; font-weight:bold; font-size:12px;';
                inputArea.append(cInput, cBtn);
                commentsContainer.append(commentsList, inputArea);

                feed.append(header, content, actions, commentsContainer);
                container.prepend(feed);

                commentToggle.onclick = () => {
                    if(commentsContainer.style.display === 'none') {
                        commentsContainer.style.display = 'block';
                        loadComments(postId, commentsList);
                    } else {
                        commentsContainer.style.display = 'none';
                    }
                };

                cBtn.onclick = async () => {
                    const cText = cInput.value.trim();
                    if(cText && auth.currentUser) {
                        cBtn.disabled = true;
                        try {
                            await addDoc(collection(db, "posts", postId, "comments"), {
                                uid: auth.currentUser.uid,
                                author: auth.currentUser.displayName || auth.currentUser.email.split("@")[0],
                                text: cText,
                                createdAt: serverTimestamp()
                            });
                            cInput.value = '';
                        } catch(e) { showToast("خطأ في إرسال التعليق"); }
                        cBtn.disabled = false;
                    }
                };
                
                cInput.addEventListener('keypress', (e) => {
                    if(e.key === 'Enter') { e.preventDefault(); cBtn.click(); }
                });

            } else if (change.type === "modified") {
                // للتحديثات المستقبلية
            } else if (change.type === "removed") {
                const existing = document.getElementById(`post-${postId}`);
                if(existing) existing.remove();
            }
        });
    });
}

function loadComments(postId, listContainer) {
    if (unsubscribeComments[postId]) unsubscribeComments[postId](); // إلغاء المستمع القديم
    
    const q = query(collection(db, "posts", postId, "comments"), orderBy("createdAt", "asc"));
    unsubscribeComments[postId] = onSnapshot(q, (snapshot) => {
        listContainer.innerHTML = '';
        if(snapshot.empty) {
            const p = document.createElement('p');
            p.style.cssText = 'font-size:12px; color:var(--muted); text-align:center;';
            p.textContent = 'لا توجد تعليقات بعد.';
            listContainer.appendChild(p);
            return;
        }
        snapshot.forEach((doc) => {
            const c = doc.data();
            const div = document.createElement('div');
            div.style.cssText = 'background:rgba(0,0,0,0.3); padding:8px; border-radius:8px; margin-bottom:5px; font-size:13px;';
            const strong = document.createElement('strong');
            strong.style.cssText = 'color:var(--gold); display:block; margin-bottom:3px;';
            strong.textContent = c.author;
            const span = document.createElement('span');
            span.textContent = c.text;
            div.append(strong, span);
            listContainer.appendChild(div);
        });
        listContainer.scrollTop = listContainer.scrollHeight;
    });
}

// --- 5. المحادثات ---
async function loadUsersList() {
    const container = document.getElementById('users-container'); 
    if (!container || !auth.currentUser) return;
    container.innerHTML = '<p style="text-align:center; color:gray;">جاري التحميل...</p>';
    try {
        const q = query(collection(db, "users"), where("uid", "!=", auth.currentUser.uid));
        const snapshot = await getDocs(q);
        container.innerHTML = '';
        if (snapshot.empty) { container.innerHTML = '<p style="text-align:center; color:gray;">لا يوجد مستخدمون.</p>'; return; }
        snapshot.forEach((doc) => {
            const u = doc.data();
            const div = document.createElement('div'); div.className = 'chat-item';
            const img = document.createElement('img'); img.src = u.photoURL || DEFAULT_AVATAR;
            img.onerror = () => { img.src = DEFAULT_AVATAR; img.onerror = null; };
            const info = document.createElement('div'); info.className = 'chat-info';
            const h4 = document.createElement('h4'); h4.textContent = u.name || 'مستخدم';
            const p = document.createElement('p'); p.textContent = 'انقر لبدء المحادثة';
            info.append(h4, p); div.append(img, info);
            div.onclick = () => startChat(u.uid, u.name);
            container.appendChild(div);
        });
    } catch (e) { container.innerHTML = '<p style="color:red; text-align:center;">حدث خطأ</p>'; }
}

async function loadFriendsList() { loadUsersList(); }

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

document.getElementById('send-message-btn')?.addEventListener('click', sendMessage);
document.getElementById('message-input')?.addEventListener('keypress', (e) => {
    if(e.key === 'Enter') { e.preventDefault(); sendMessage(); }
});

async function sendMessage() {
    const input = document.getElementById('message-input'); const text = input.value.trim();
    if (text && currentChatId && auth.currentUser) {
        input.value = '';
        try {
            await addDoc(collection(db, "chats", currentChatId, "messages"), { senderId: auth.currentUser.uid, text: text, createdAt: serverTimestamp() });
            await updateDoc(doc(db, "chats", currentChatId), { lastMessage: text, lastSender: auth.currentUser.uid, updatedAt: serverTimestamp() });
        } catch (e) { showToast("فشل الإرسال"); }
    }
}

window.closeChatRoom = function() {
    document.getElementById('chat-room-view').style.display = 'none'; 
    document.getElementById('chat-list-view').style.display = 'block';
    if (unsubscribeMessages) unsubscribeMessages(); currentChatId = null;
};

// --- 6. الملف الشخصي ---
function loadProfile() {
    const user = auth.currentUser;
    if (!user) return;
    document.getElementById('profile-page-name').innerText = user.displayName || user.email.split("@")[0];
    document.getElementById('profile-page-email').innerText = user.email;
    document.getElementById('profile-page-avatar').src = user.photoURL || DEFAULT_AVATAR;
    const container = document.getElementById('my-posts-container');
    
    const q = query(collection(db, "posts"), where("uid", "==", user.uid));
    
    onSnapshot(q, (snapshot) => {
        let posts = [];
        snapshot.forEach(doc => posts.push({ id: doc.id, ...doc.data() }));
        posts.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        
        container.innerHTML = '';
        document.getElementById('profile-post-count').innerText = posts.length;
        
        if (posts.length === 0) {
            container.innerHTML = '<p style="text-align:center; color:gray;">لم تنشر أي شيء بعد.</p>';
            return;
        }
        posts.forEach((data) => {
            const div = document.createElement('div');
            div.className = 'feed';
            const content = document.createElement('div'); content.className = 'feed-content';
            const p = document.createElement('p'); p.textContent = data.text || ''; content.appendChild(p);
            if(data.imageUrl) { const img = document.createElement('img'); img.src = data.imageUrl; img.className = 'feed-img'; 
                img.onerror = () => { img.style.display = 'none'; }; // إخفاء الصورة المكسورة
                content.appendChild(img); 
            }
            div.appendChild(content);
            container.appendChild(div);
        });
    }, (error) => {
        container.innerHTML = '<p style="color:red; text-align:center;">خطأ في جلب المنشورات: ' + error.message + '</p>';
    });
}

// فلاتر الألعاب
const buttons = [...document.querySelectorAll('.filter')];
const cards = [...document.querySelectorAll('.game')];
const search = document.getElementById('search');
let category = 'all';

function updateGames() {
    if(!search) return;
    const q = search.value.trim().toLowerCase();
    cards.forEach(card => {
        card.style.display = (category === 'all' || card.dataset.category === category) && 
        (card.dataset.search + ' ' + card.innerText).toLowerCase().includes(q) ? 'flex' : 'none';
    });
}
buttons.forEach(btn => btn.addEventListener('click', () => {
    category = btn.dataset.category;
    buttons.forEach(b => b.classList.toggle('active', b === btn));
    updateGames();
}));
if(search) search.addEventListener('input', updateGames);
