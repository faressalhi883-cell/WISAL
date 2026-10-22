
import { initializeApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";
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

// مفتاح ImgBB الخاص بك
const IMGBB_API_KEY = "b1a7511ae786e607536e4211bc606ab5";

// 1. مراقبة تسجيل الدخول وإضافة زر الخروج
onAuthStateChanged(auth, (user) => {
    if (user) {
        const headerRight = document.querySelector('.header-right');
        if(headerRight && !document.getElementById('logout-btn')) {
            const logoutBtn = document.createElement('button');
            logoutBtn.id = 'logout-btn';
            logoutBtn.innerHTML = '<i class="uil uil-signout"></i>';
            logoutBtn.style.cssText = 'background: none; border: none; font-size: 24px; color: #ff4d4d; cursor: pointer; margin-left: 10px;';
            logoutBtn.onclick = () => {
                if(confirm("هل أنت متأكد من تسجيل الخروج؟")) signOut(auth).then(() => window.location.href = './login.html');
            };
            headerRight.prepend(logoutBtn);
        }
        loadPosts(); 
    } else {
        window.location.href = './login.html';
    }
});

// 2. التنقل والوضع الليلي
document.querySelectorAll('.tab-btn[data-target]').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(btn.getAttribute('data-target')).classList.add('active');
    });
});

const themeToggleBtn = document.getElementById('theme-toggle');
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

// 3. النشر مع رفع الصور إلى ImgBB
const postBtn = document.getElementById('post-btn');
const postInput = document.getElementById('create-post-input');
const imageInput = document.getElementById('image-input');

postBtn.addEventListener('click', async () => {
    const text = postInput.value.trim();
    const imageFile = imageInput.files[0];
    const user = auth.currentUser;

    if ((text !== '' || imageFile) && user) {
        postBtn.innerText = "...";
        postBtn.disabled = true;
        
        try {
            let imageUrl = "";

            // رفع الصورة إلى ImgBB إذا تم اختيار صورة
            if (imageFile) {
                const formData = new FormData();
                formData.append('image', imageFile);

                const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
                    method: 'POST',
                    body: formData
                });
                const data = await response.json();
                
                if (data.success) {
                    imageUrl = data.data.url; // رابط الصورة المرفوعة
                } else {
                    throw new Error("فشل رفع الصورة");
                }
            }

            // حفظ المنشور في Firebase
            await addDoc(collection(db, "posts"), {
                text: text,
                imageUrl: imageUrl, 
                author: user.displayName || "مستخدم", 
                authorImage: "./profile.jpg", 
                createdAt: serverTimestamp()
            });
            
            postInput.value = ''; 
            imageInput.value = ''; 
        } catch (e) {
            alert("حدث خطأ: " + e.message);
        } finally {
            postBtn.innerText = "نشر";
            postBtn.disabled = false;
        }
    }
});

// 4. جلب وعرض المنشورات (مع الصور وزر المشاركة)
function loadPosts() {
    const feedsContainer = document.getElementById('feeds-container');
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    
    onSnapshot(q, (snapshot) => {
        feedsContainer.innerHTML = ""; 
        snapshot.forEach((doc) => {
            const data = doc.data();
            const newFeed = document.createElement('div');
            newFeed.classList.add('feed');
            
            const imageHTML = data.imageUrl ? `<img src="${data.imageUrl}" style="width:100%; border-radius:8px; margin-top:10px;">` : '';

            newFeed.innerHTML = `
                <div class="feed-header">
                    <img src="${data.authorImage}" alt="User" class="profile-pic">
                    <div class="feed-info">
                        <h4>${data.author}</h4>
                        <span>الآن · <i class="uil uil-globe"></i></span>
                    </div>
                </div>
                <div class="feed-content">
                    <p>${data.text}</p>
                    ${imageHTML}
                </div>
                <div class="feed-actions">
                    <button><i class="uil uil-thumbs-up"></i> أعجبني</button>
                    <button><i class="uil uil-comment-alt-message"></i> تعليق</button>
                    <button onclick="sharePost('${data.author}', '${data.text.replace(/'/g, "\\'")}')"><i class="uil uil-share-alt"></i> مشاركة</button>
                </div>
            `;
            feedsContainer.appendChild(newFeed);
        });
    });
}

// 5. دالة المشاركة
window.sharePost = function(author, text) {
    if (navigator.share) {
        navigator.share({
            title: 'منشور من CHAT ROOM',
            text: `${author} كتب: "${text}"\n\nشاهد المزيد على CHAT ROOM!`,
            url: window.location.href
        }).catch(console.error);
    } else {
        navigator.clipboard.writeText(`${author} كتب: "${text}" - ${window.location.href}`);
        alert("تم نسخ المنشور للمشاركة!");
    }
};
