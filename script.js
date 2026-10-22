// 1. تفعيل الوضع الليلي والنهاري
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

// حفظ الوضع المفضل للمستخدم عند إعادة فتح الصفحة
if (localStorage.getItem('theme') === 'dark') {
    document.body.classList.add('dark-theme');
    themeIcon.className = 'uil uil-sun';
}

// 2. التنقل بين الأقسام (الرئيسية، الريلز، المحادثات، المجموعات)
function switchTab(tabName) {
    // إخفاء كل الأقسام
    document.querySelectorAll('.section').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    
    // إظهار القسم المطلوب
    document.getElementById(`${tabName}-tab`).classList.add('active');
    
    // تفعيل الأيقونة المختارة في الشريط العلوي
    const btns = document.querySelectorAll('.tab-btn');
    if(tabName === 'home') btns[0].classList.add('active');
    if(tabName === 'reels') btns[1].classList.add('active');
    if(tabName === 'chats') btns[2].classList.add('active');
    if(tabName === 'groups') btns[3].classList.add('active');
}

// 3. إضافة منشور جديد
const postBtn = document.getElementById('post-btn');
const postInput = document.getElementById('create-post-input');
const feedsContainer = document.getElementById('feeds-container');

postBtn.addEventListener('click', () => {
    const text = postInput.value.trim();
    if (text !== '') {
        const newFeed = document.createElement('div');
        newFeed.classList.add('feed');
        newFeed.innerHTML = `
            <div class="feed-header">
                <img src="./profile.jpg" alt="User" class="profile-pic">
                <div class="feed-info">
                    <h4>أنت</h4>
                    <span>الآن · <i class="uil uil-globe"></i></span>
                </div>
                <i class="uil uil-ellipsis-h more-icon"></i>
            </div>
            <div class="feed-content">
                <p>${text}</p>
            </div>
            <div class="feed-actions">
                <button><i class="uil uil-thumbs-up"></i> أعجبني</button>
                <button><i class="uil uil-comment-alt-message"></i> تعليق</button>
                <button><i class="uil uil-share-alt"></i> مشاركة</button>
            </div>
        `;
        feedsContainer.prepend(newFeed);
        postInput.value = ''; // مسح مربع النص
    }
});
