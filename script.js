// تحديد العناصر
const createPostInput = document.getElementById('create-post');
const postButton = document.querySelector('.create-post input[type="submit"]');
const feedsContainer = document.querySelector('.feeds');

// دالة إضافة منشور جديد
function addNewPost() {
    const text = createPostInput.value.trim();
    
    if(text !== "") {
        // إنشاء عنصر المنشور الجديد
        const newFeed = document.createElement('div');
        newFeed.classList.add('feed');
        
        newFeed.innerHTML = `
            <div class="head">
                <div class="user">
                    <div class="profile-photo">
                        <img src="./profile.jpg">
                    </div>
                    <div class="info">
                        <h3>أنت (مستخدم وصال)</h3>
                        <small>الآن</small>
                    </div>
                </div>
                <span class="edit"><i class="uil uil-ellipsis-h"></i></span>
            </div>
            <div class="caption">
                <p>${text}</p>
            </div>
            <div class="action-buttons">
                <div class="interaction-buttons">
                    <span><i class="uil uil-heart"></i></span>
                    <span><i class="uil uil-comment-dots"></i></span>
                    <span><i class="uil uil-share-alt"></i></span>
                </div>
                <div class="bookmark">
                    <span><i class="uil uil-bookmark-full"></i></span>
                </div>
            </div>
        `;
        
        // إضافة المنشور في أعلى القائمة
        feedsContainer.prepend(newFeed);
        
        // مسح مربع النص بعد النشر
        createPostInput.value = "";
    }
}

// تفعيل الزر عند الضغط
if(postButton) {
    postButton.addEventListener('click', function(e) {
        e.preventDefault(); // منع إعادة تحميل الصفحة
        addNewPost();
    });
}
