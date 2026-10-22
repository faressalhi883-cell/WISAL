
import { initializeApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";

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

const themeToggleBtn = document.getElementById('theme-toggle');
const themeIcon = themeToggleBtn.querySelector('i');

themeToggleBtn.addEventListener('click', () => {
    document.body.classList.toggle('dark-theme');
    if (document.body.classList.contains('dark-theme')) {
        themeIcon.className = 'uil uil-sun';
        localStorage.setItem('theme', 'dark');
    } else {
        themeIcon.className = 'uil uil-moon';
        localStorage.setItem('theme', 'light');
    }
});

if (localStorage.getItem('theme') === 'dark') {
    document.body.classList.add('dark-theme');
    themeIcon.className = 'uil uil-sun';
}

function switchTab(tabName) {
    document.querySelectorAll('.section').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`${tabName}-tab`).classList.add('active');
    const btns = document.querySelectorAll('.tab-btn');
    if(tabName === 'home') btns[0].classList.add('active');
    if(tabName === 'reels') btns[1].classList.add('active');
    if(tabName === 'chats') btns[2].classList.add('active');
    if(tabName === 'groups') btns[3].classList.add('active');
}
window.switchTab = switchTab;

const postBtn = document.getElementById('post-btn');
const postInput = document.getElementById('create-post-input');
const feedsContainer = document.getElementById('feeds-container');

postBtn.addEventListener('click', async () => {
    const text = postInput.value.trim();
    if (text !== '') {
        try {
            await addDoc(collection(db, "posts"), {
                text: text,
                author: "فارس صالحي", 
                authorImage: "./profile.jpg",
                createdAt: serverTimestamp()
            });
            postInput.value = ''; 
        } catch (e) {
            console.error("Error adding document: ", e);
            alert("حدث خطأ أثناء النشر: " + e.message);
        }
    }
});

function loadPosts() {
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    onSnapshot(q, (snapshot) => {
        feedsContainer.innerHTML = ""; 
        snapshot.forEach((doc) => {
            const data = doc.data();
            const newFeed = document.createElement('div');
            newFeed.classList.add('feed');
            newFeed.innerHTML = `
                <div class="feed-header">
                    <img src="${data.authorImage}" alt="User" class="profile-pic">
                    <div class="feed-info">
                        <h4>${data.author}</h4>
                        <span>الآن · <i class="uil uil-globe"></i></span>
                    </div>
                    <i class="uil uil-ellipsis-h more-icon"></i>
                </div>
                <div class="feed-content">
                    <p>${data.text}</p>
                </div>
                <div class="feed-actions">
                    <button><i class="uil uil-thumbs-up"></i> أعجبني</button>
                    <button><i class="uil uil-comment-alt-message"></i> تعليق</button>
                    <button><i class="uil uil-share-alt"></i> مشاركة</button>
                </div>
            `;
            feedsContainer.appendChild(newFeed);
        });
    });
}

loadPosts();
