import { initializeApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";

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
const auth = getAuth(app);

const form = document.getElementById('auth-form');
const nameGroup = document.getElementById('name-group');
const fullnameInput = document.getElementById('fullname');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const submitBtn = document.getElementById('submit-btn');
const toggleMsg = document.getElementById('toggle-msg');
const errorMsg = document.getElementById('error-msg');

let isLogin = true;

function setupToggle() {
    const toggleBtn = document.getElementById('toggle-btn');
    if(!toggleBtn) return;
    
    toggleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        isLogin = !isLogin;
        errorMsg.style.display = 'none';
        
        if (isLogin) {
            nameGroup.style.display = 'none';
            submitBtn.innerText = 'تسجيل الدخول';
            toggleMsg.innerHTML = 'ليس لديك حساب؟ <a id="toggle-btn">إنشاء حساب جديد</a>';
        } else {
            nameGroup.style.display = 'block';
            submitBtn.innerText = 'إنشاء حساب';
            toggleMsg.innerHTML = 'لديك حساب بالفعل؟ <a id="toggle-btn">تسجيل الدخول</a>';
        }
        setupToggle();
    });
}
setupToggle();

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = emailInput.value;
    const password = passwordInput.value;
    const fullname = fullnameInput.value;
    
    submitBtn.disabled = true;
    submitBtn.innerText = 'جاري التحميل...';
    errorMsg.style.display = 'none';

    try {
        if (isLogin) {
            await signInWithEmailAndPassword(auth, email, password);
        } else {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            await updateProfile(userCredential.user, { displayName: fullname });
        }
        window.location.href = './index.html';
    } catch (error) {
        errorMsg.style.display = 'block';
        if(error.code === 'auth/email-already-in-use') errorMsg.innerText = "هذا البريد مسجل بالفعل!";
        else if(error.code === 'auth/wrong-password') errorMsg.innerText = "كلمة المرور خاطئة!";
        else if(error.code === 'auth/user-not-found') errorMsg.innerText = "لا يوجد حساب بهذا البريد!";
        else if(error.code === 'auth/weak-password') errorMsg.innerText = "كلمة المرور ضعيفة (6 أحرف على الأقل).";
        else errorMsg.innerText = "خطأ: " + error.message;
        
        submitBtn.disabled = false;
        submitBtn.innerText = isLogin ? 'تسجيل الدخول' : 'إنشاء حساب';
    }
});
