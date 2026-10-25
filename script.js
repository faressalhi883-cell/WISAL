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
const $ = (id) => document.getElementById(id);

let currentChatId = null, unsubMessages = null, unsubProfile = null, unsubPosts = null;
const unsubComments = {}, unsubLikes = {}, unsubCounts = {};

function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; }
function showToast(msg) { const t = $('toast'); if (!t) return; t.textContent = msg; t.classList.add('show'); clearTimeout(showToast.t); showToast.t = setTimeout(() => t.classList.remove('show'), 2800); }
function haptic(p = 12) { if (navigator.vibrate) navigator.vibrate(p); }
function timeAgo(d) {
  if (!d) return 'الآن';
  const s = (Date.now() - d.getTime()) / 1000;
  if (s < 60) return 'الآن';
  if (s < 3600) return `منذ ${Math.floor(s / 60)} د`;
  if (s < 86400) return `منذ ${Math.floor(s / 3600)} س`;
  return d.toLocaleDateString('ar-DZ');
}
const emptyState = (t) => el('p', 'empty', t);
const userName = (u) => u.displayName || u.email.split("@")[0];
const avatarFor = (u) => u.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(userName(u))}&background=8b20e8&color=fff`;
const show = (id) => $(id).style.display = 'flex';
const hide = (id) => $(id).style.display = 'none';
const getSaved = () => { try { return JSON.parse(localStorage.getItem('saved') || '[]'); } catch { return []; } };
const setSaved = (a) => { try { localStorage.setItem('saved', JSON.stringify(a)); } catch {} };

// التنقل
const TABS = { home: 'home-section', chats: 'chats-section', friends: 'friends-section', profile: 'profile-section', games: 'games-section' };
window.switchTab = function (tab) {
  document.querySelectorAll('main').forEach(m => m.style.display = 'none');
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  $(TABS[tab]).style.display = 'block';
  $('nav-' + tab)?.classList.add('active');
  if (tab === 'chats') { closeChatRoom(); renderUsers($('users-container')); }
  if (tab === 'friends') renderUsers($('friends-container'));
  if (tab === 'profile') loadProfile();
  window.scrollTo({ top: 0 });
};
$('plus-btn').addEventListener('click', () => { switchTab('home'); setTimeout(() => $('create-post-input').focus(), 50); });

// النوافذ
$('menu-btn').addEventListener('click', () => show('logout-modal'));
$('logout-yes').addEventListener('click', () => signOut(auth).then(() => location.href = './login.html'));
$('logout-no').addEventListener('click', () => hide('logout-modal'));
$('notif-btn').addEventListener('click', () => show('notif-modal'));
$('notif-close').addEventListener('click', () => hide('notif-modal'));
$('search-cancel').addEventListener('click', () => hide('search-modal'));
const openSearch = () => { switchTab('home'); show('search-modal'); $('search-input').value = ''; $('search-input').focus(); };
$('top-search-btn').addEventListener('click', openSearch);
$('quick-search-btn').addEventListener('click', openSearch);
$('search-input').addEventListener('keypress', (e) => { if (e.key === 'Enter') $('search-submit').click(); });
$('search-submit').addEventListener('click', () => {
  const q = $('search-input').value.trim();
  hide('search-modal');
  const feeds = document.querySelectorAll('#feeds-container .feed');
  let found = 0;
  feeds.forEach(f => { const ok = !q || f.textContent.includes(q); f.style.display = ok ? '' : 'none'; if (ok) found++; });
  if (q && !found) { showToast("لا توجد منشورات تطابق بحثك"); feeds.forEach(f => f.style.display = ''); }
});
async function shareLink(text) {
  const data = { title: 'CHAT ROOM', text, url: location.origin + location.pathname.replace(/[^/]*$/, 'login.html') };
  try { if (navigator.share) await navigator.share(data); else { await navigator.clipboard.writeText(data.url); showToast("تم نسخ الرابط"); } } catch {}
}
$('share-btn').addEventListener('click', () => shareLink('انضم إلي في CHAT ROOM'));

// المصادقة
onAuthStateChanged(auth, async (user) => {
  if (!user) { location.href = './login.html'; return; }
  try {
    const ref = doc(db, "users", user.uid);
    if (!(await getDoc(ref)).exists()) await setDoc(ref, { uid: user.uid, name: userName(user), photoURL: avatarFor(user), createdAt: serverTimestamp() });
  } catch (e) { console.log(e); }
  const initial = (userName(user)[0] || 'U').toUpperCase();
  $('post-avatar').textContent = initial;
  $('logo-text').textContent = initial;
  if (!unsubPosts) loadPosts();
});

async function uploadImage(file) {
  if (file.size > 5 * 1024 * 1024) throw new Error("حجم الصورة يتجاوز 5 ميجابايت");
  const fd = new FormData(); fd.append('image', file);
  const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: 'POST', body: fd });
  const data = await res.json();
  if (!data.success) throw new Error("فشل رفع الصورة");
  return data.data.url;
}
$('profile-pic-input').addEventListener('change', async (e) => {
  const file = e.target.files[0], user = auth.currentUser;
  if (!file || !user) return;
  showToast("جاري رفع الصورة...");
  try {
    const url = await uploadImage(file);
    await updateDoc(doc(db, "users", user.uid), { photoURL: url });
    await updateProfile(user, { photoURL: url });
    $('profile-page-avatar').src = url;
    showToast("تم تحديث صورتك");
  } catch (err) { showToast(err.message || "تعذّر رفع الصورة"); }
  e.target.value = '';
});

// النشر
const postBtn = $('post-btn'), postInput = $('create-post-input'), imageInput = $('image-input');
imageInput.addEventListener('change', (e) => {
  const f = e.target.files[0];
  if (!f) { $('image-preview').src = ""; $('image-preview-container').hidden = true; return; }
  const r = new FileReader();
  r.onload = (ev) => { $('image-preview').src = ev.target.result; $('image-preview-container').hidden = false; };
  r.readAsDataURL(f);
});
postBtn.addEventListener('click', async () => {
  const text = postInput.value.trim(), file = imageInput.files[0], user = auth.currentUser;
  if (!user) return showToast("سجّل الدخول أولاً");
  if (!text && !file) return showToast("اكتب شيئاً أو اختر صورة");
  postBtn.disabled = true;
  try {
    const imageUrl = file ? await uploadImage(file) : "";
    await addDoc(collection(db, "posts"), { uid: user.uid, text, imageUrl, author: userName(user), authorImage: avatarFor(user), createdAt: serverTimestamp() });
    postInput.value = ''; imageInput.value = ''; $('image-preview').src = ""; $('image-preview-container').hidden = true;
    haptic(15); showToast("تم النشر");
  } catch (e) { showToast(e.message || "حدث خطأ"); }
  finally { postBtn.disabled = false; }
});

function skeletons(container, n = 3) {
  container.innerHTML = '';
  for (let i = 0; i < n; i++) {
    const f = el('div', 'feed skeleton-feed');
    f.append(el('div', 'skeleton sk-head'), el('div', 'skeleton sk-line'), el('div', 'skeleton sk-line short'));
    container.appendChild(f);
  }
}

function buildPost(postId, data) {
  const feed = el('div', 'feed'); feed.id = `post-${postId}`;
  const header = el('div', 'feed-header');
  const img = el('img'); img.src = data.authorImage || DEFAULT_AVATAR; img.loading = 'lazy'; img.alt = '';
  img.onerror = () => { img.onerror = null; img.src = DEFAULT_AVATAR; };
  const info = el('div', 'feed-info');
  const time = el('span', '', timeAgo(data.createdAt?.toDate?.()));
  info.append(el('h4', '', data.author), time);
  header.append(img, info);

  const content = el('div', 'feed-content');
  if (data.text) content.appendChild(el('p', '', data.text));
  if (data.imageUrl) {
    const pi = el('img', 'feed-img'); pi.src = data.imageUrl; pi.loading = 'lazy'; pi.alt = '';
    pi.onerror = () => { pi.style.display = 'none'; };
    content.appendChild(pi);
  }

  const uid = auth.currentUser.uid;
  let liked = false, count = 0, cCount = 0;

  const likeBtn = el('button', 'act');
  const commentBtn = el('button', 'act');
  const shareBtn = el('button', 'act'); shareBtn.innerHTML = '<i class="uil uil-share-alt"></i>';
  const saveBtn = el('button', 'act save'); saveBtn.innerHTML = '<i class="uil uil-bookmark"></i>';
  const paint = () => {
    likeBtn.classList.toggle('liked', liked); likeBtn.textContent = `${liked ? '❤️' : '🤍'} ${count || ''}`;
    commentBtn.innerHTML = `<i class="uil uil-comment-alt-message"></i> ${cCount || ''}`;
  };
  paint();
  saveBtn.classList.toggle('saved', getSaved().includes(postId));

  const likeRef = doc(db, "posts", postId, "likes", uid);
  unsubLikes[postId] = onSnapshot(collection(db, "posts", postId, "likes"), (s) => { count = s.size; liked = s.docs.some(d => d.id === uid); paint(); });
  unsubCounts[postId] = onSnapshot(collection(db, "posts", postId, "comments"), (s) => { cCount = s.size; paint(); });

  likeBtn.onclick = async () => {
    const prev = { liked, count };
    liked = !liked; count += liked ? 1 : -1; paint(); haptic(10);
    try { liked ? await setDoc(likeRef, { createdAt: serverTimestamp() }) : await deleteDoc(likeRef); }
    catch { liked = prev.liked; count = prev.count; paint(); showToast("تعذّر تسجيل الإعجاب"); }
  };
  shareBtn.onclick = () => shareLink((data.text || 'منشور').slice(0, 80));
  saveBtn.onclick = () => {
    let s = getSaved();
    if (s.includes(postId)) { s = s.filter(x => x !== postId); showToast("أُزيل من المحفوظات"); }
    else { s.push(postId); showToast("تم الحفظ على هذا الجهاز"); }
    setSaved(s); saveBtn.classList.toggle('saved', s.includes(postId)); haptic(8);
  };

  const actions = el('div', 'feed-actions'); actions.append(likeBtn, commentBtn, shareBtn, saveBtn);

  const box = el('div', 'comments-box'); box.hidden = true;
  const list = el('div', 'comments-list');
  const row = el('div', 'comment-row');
  const cInput = el('input'); cInput.type = 'text'; cInput.placeholder = 'اكتب تعليقاً...'; cInput.maxLength = 300;
  const cBtn = el('button', 'btn primary', 'إرسال');
  row.append(cInput, cBtn); box.append(list, row);

  commentBtn.onclick = () => {
    box.hidden = !box.hidden;
    if (!box.hidden) loadComments(postId, list);
    else { unsubComments[postId]?.(); delete unsubComments[postId]; }
  };
  cBtn.onclick = async () => {
    const t = cInput.value.trim(); if (!t || !auth.currentUser) return;
    cBtn.disabled = true;
    try { await addDoc(collection(db, "posts", postId, "comments"), { uid, author: userName(auth.currentUser), text: t, createdAt: serverTimestamp() }); cInput.value = ''; }
    catch { showToast("تعذّر إرسال التعليق"); }
    cBtn.disabled = false;
  };
  cInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') { e.preventDefault(); cBtn.click(); } });

  feed.append(header, content, actions, box);
  feed._time = time; feed._date = data.createdAt?.toDate?.();
  return feed;
}

function loadPosts() {
  const container = $('feeds-container');
  skeletons(container);
  let first = true;
  unsubPosts = onSnapshot(query(collection(db, "posts"), orderBy("createdAt", "desc")), (snap) => {
    if (first) { container.innerHTML = ''; first = false; }
    snap.docChanges().forEach((ch) => {
      const id = ch.doc.id;
      if (ch.type === "added") {
        const f = buildPost(id, ch.doc.data());
        const ref = container.children[ch.newIndex];
        ref ? container.insertBefore(f, ref) : container.appendChild(f);
      } else if (ch.type === "modified") {
        const f = $(`post-${id}`), d = ch.doc.data();
        if (f && d.createdAt?.toDate) { f._date = d.createdAt.toDate(); f._time.textContent = timeAgo(f._date); }
      } else if (ch.type === "removed") {
        $(`post-${id}`)?.remove(); unsubLikes[id]?.(); unsubComments[id]?.(); unsubCounts[id]?.();
      }
    });
    container.querySelector('.empty')?.remove();
    if (!container.children.length) container.appendChild(emptyState('لا توجد منشورات بعد. كن أول من ينشر.'));
  }, () => { container.innerHTML = ''; container.appendChild(emptyState('تعذّر تحميل المنشورات. تحقق من اتصالك.')); });
  setInterval(() => container.querySelectorAll('.feed').forEach(f => { if (f._date) f._time.textContent = timeAgo(f._date); }), 60000);
}

function loadComments(postId, list) {
  unsubComments[postId]?.();
  unsubComments[postId] = onSnapshot(query(collection(db, "posts", postId, "comments"), orderBy("createdAt", "asc")), (snap) => {
    list.innerHTML = '';
    if (snap.empty) { list.appendChild(emptyState('كن أول من يعلّق.')); return; }
    snap.forEach((d) => {
      const c = d.data(), item = el('div', 'comment');
      item.append(el('strong', '', c.author), el('span', '', c.text));
      list.appendChild(item);
    });
    list.scrollTop = list.scrollHeight;
  });
}

// المستخدمون والمحادثات
async function renderUsers(container) {
  if (!container || !auth.currentUser) return;
  container.innerHTML = '';
  for (let i = 0; i < 4; i++) container.appendChild(el('div', 'skeleton sk-chat'));
  try {
    const snap = await getDocs(query(collection(db, "users"), where("uid", "!=", auth.currentUser.uid)));
    container.innerHTML = '';
    if (snap.empty) { container.appendChild(emptyState('لا يوجد مستخدمون آخرون بعد. شارك الرابط مع أصدقائك.')); return; }
    snap.forEach((d) => {
      const u = d.data(), row = el('div', 'chat-item');
      const img = el('img'); img.src = u.photoURL || DEFAULT_AVATAR; img.loading = 'lazy'; img.alt = '';
      img.onerror = () => { img.onerror = null; img.src = DEFAULT_AVATAR; };
      const info = el('div', 'chat-info'); info.append(el('h4', '', u.name || 'مستخدم'), el('p', '', 'اضغط لبدء المحادثة'));
      row.append(img, info);
      row.onclick = () => { switchTab('chats'); startChat(u.uid, u.name); };
      container.appendChild(row);
    });
  } catch { container.innerHTML = ''; container.appendChild(emptyState('تعذّر تحميل القائمة.')); }
}

async function startChat(otherUid, otherName) {
  currentChatId = [auth.currentUser.uid, otherUid].sort().join("_");
  $('chat-list-view').style.display = 'none'; $('chat-room-view').style.display = 'flex';
  $('chat-with-name').textContent = otherName || 'محادثة';
  try {
    const ref = doc(db, "chats", currentChatId);
    if (!(await getDoc(ref)).exists()) await setDoc(ref, { participants: [auth.currentUser.uid, otherUid], lastMessage: "", lastSender: "", updatedAt: serverTimestamp() });
    loadMessages();
  } catch { showToast("تعذّر فتح المحادثة"); closeChatRoom(); }
}
function loadMessages() {
  const box = $('messages-container'); box.innerHTML = '';
  unsubMessages?.();
  let first = true;
  unsubMessages = onSnapshot(query(collection(db, "chats", currentChatId, "messages"), orderBy("createdAt", "asc")), (snap) => {
    if (first) { box.innerHTML = ''; first = false; snap.forEach(d => addMsg(box, d.data(), false)); }
    else snap.docChanges().forEach(c => { if (c.type === 'added') addMsg(box, c.doc.data(), true); });
    box.scrollTo({ top: box.scrollHeight, behavior: 'smooth' });
  });
}
function addMsg(box, m, animate) {
  const d = el('div', 'message ' + (m.senderId === auth.currentUser.uid ? 'sent' : 'received'), m.text);
  if (!animate) d.style.animation = 'none';
  box.appendChild(d);
}
$('send-message-btn').addEventListener('click', sendMessage);
$('message-input').addEventListener('keypress', (e) => { if (e.key === 'Enter') { e.preventDefault(); sendMessage(); } });
async function sendMessage() {
  const input = $('message-input'), text = input.value.trim();
  if (!text || !currentChatId || !auth.currentUser) return;
  input.value = ''; haptic(8);
  try {
    await addDoc(collection(db, "chats", currentChatId, "messages"), { senderId: auth.currentUser.uid, text, createdAt: serverTimestamp() });
    await updateDoc(doc(db, "chats", currentChatId), { lastMessage: text, lastSender: auth.currentUser.uid, updatedAt: serverTimestamp() });
  } catch { input.value = text; showToast("فشل الإرسال، حاول مجدداً"); }
}
window.closeChatRoom = function () {
  $('chat-room-view').style.display = 'none'; $('chat-list-view').style.display = 'block';
  unsubMessages?.(); unsubMessages = null; currentChatId = null;
};

// الملف الشخصي
function loadProfile() {
  const user = auth.currentUser; if (!user) return;
  $('profile-page-name').textContent = userName(user);
  $('profile-page-email').textContent = user.email;
  $('profile-page-avatar').src = avatarFor(user);
  $('profile-page-avatar').onerror = function () { this.onerror = null; this.src = DEFAULT_AVATAR; };
  const box = $('my-posts-container');
  unsubProfile?.();
  unsubProfile = onSnapshot(query(collection(db, "posts"), where("uid", "==", user.uid)), (snap) => {
    const posts = snap.docs.map(d => d.data()).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    box.innerHTML = ''; $('profile-post-count').textContent = posts.length;
    if (!posts.length) { box.appendChild(emptyState('لم تنشر شيئاً بعد.')); return; }
    posts.forEach((p) => {
      const f = el('div', 'feed'), c = el('div', 'feed-content');
      if (p.text) c.appendChild(el('p', '', p.text));
      if (p.imageUrl) { const i = el('img', 'feed-img'); i.src = p.imageUrl; i.loading = 'lazy'; i.alt = ''; i.onerror = () => i.style.display = 'none'; c.appendChild(i); }
      f.appendChild(c); box.appendChild(f);
    });
  }, () => { box.innerHTML = ''; box.appendChild(emptyState('تعذّر جلب منشوراتك.')); });
}

// فلاتر الألعاب
const buttons = [...document.querySelectorAll('.filter')], cards = [...document.querySelectorAll('.game')], gSearch = $('search');
let category = 'all';
function updateGames() {
  const q = gSearch.value.trim().toLowerCase();
  cards.forEach(c => { c.style.display = (category === 'all' || c.dataset.category === category) && (c.dataset.search + ' ' + c.innerText).toLowerCase().includes(q) ? 'flex' : 'none'; });
}
buttons.forEach(b => b.addEventListener('click', () => { category = b.dataset.category; buttons.forEach(x => x.classList.toggle('active', x === b)); updateGames(); }));
gSearch.addEventListener('input', updateGames);
