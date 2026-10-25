import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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
const db = getFirestore(app);
const DEFAULT_AVATAR = "https://ui-avatars.com/api/?name=User&background=8b20e8&color=fff";
const $ = (id) => document.getElementById(id);

let isLogin = true;
let busy = false;

// مستخدم مسجّل بالفعل: ادخل مباشرة
onAuthStateChanged(auth, (user) => {
  if (user && !busy) location.replace('./index.html');
});

function render() {
  $('name-group').style.display = isLogin ? 'none' : 'block';
  $('password').autocomplete = isLogin ? 'current-password' : 'new-password';
  $('submit-btn').textContent = isLogin ? 'تسجيل الدخول' : 'إنشاء حساب';
  $('toggle-msg').innerHTML = isLogin
    ? 'ليس لديك حساب؟ <a id="toggle-btn">إنشاء حساب جديد</a>'
    : 'لديك حساب بالفعل؟ <a id="toggle-btn">تسجيل الدخول</a>';
  $('error-msg').style.display = 'none';
}
$('toggle-msg').addEventListener('click', (e) => {
  if (e.target.id === 'toggle-btn') { isLogin = !isLogin; render(); }
});

function showError(msg) { const m = $('error-msg'); m.textContent = msg; m.style.display = 'block'; }
function errorText(code) {
  return ({
    'auth/email-already-in-use': 'هذا البريد مسجّل بالفعل.',
    'auth/invalid-credential': 'البريد أو كلمة المرور غير صحيحة.',
    'auth/wrong-password': 'البريد أو كلمة المرور غير صحيحة.',
    'auth/user-not-found': 'البريد أو كلمة المرور غير صحيحة.',
    'auth/weak-password': 'كلمة المرور ضعيفة (6 أحرف على الأقل).',
    'auth/invalid-email': 'صيغة البريد غير صحيحة.',
    'auth/too-many-requests': 'محاولات كثيرة. انتظر قليلاً ثم أعد المحاولة.',
    'auth/network-request-failed': 'تحقق من اتصالك بالإنترنت.'
  })[code] || 'حدث خطأ غير متوقع. حاول مجدداً.';
}

$('auth-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = $('email').value.trim();
  const password = $('password').value;
  const fullname = $('fullname').value.trim();

  if (!email || !password) return showError('أدخل البريد وكلمة المرور.');
  if (!isLogin && fullname.length < 2) return showError('اكتب اسمك (حرفان على الأقل).');

  busy = true;
  $('submit-btn').disabled = true;
  $('submit-btn').textContent = 'جاري التحميل...';
  $('error-msg').style.display = 'none';

  try {
    if (isLogin) {
      await signInWithEmailAndPassword(auth, email, password);
    } else {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: fullname });
      await setDoc(doc(db, "users", cred.user.uid), {
        uid: cred.user.uid, name: fullname, photoURL: DEFAULT_AVATAR, createdAt: serverTimestamp()
      });
    }
    location.replace('./index.html');
  } catch (err) {
    busy = false;
    showError(errorText(err.code));
    $('submit-btn').disabled = false;
    $('submit-btn').textContent = isLogin ? 'تسجيل الدخول' : 'إنشاء حساب';
  }
});
