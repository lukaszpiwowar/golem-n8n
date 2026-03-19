import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  arrayUnion
} from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js';

// ===== INIT =====
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ===== STATE =====
let currentUser = null;
let currentFamilyId = null;
let unsubscribeEvents = null;
let allEvents = [];
let pendingDeleteId = null;
let babyName = null;
let defaultFeedingSource = 'breast_left';

// ===== UTILS =====

function getCurrentDateTimeLocal() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

function generateCode() {
  return Math.random().toString(36).substr(2, 6).toUpperCase();
}

function formatTimeAgo(date) {
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return 'przed chwilą';
  const mins = Math.floor(diff / 60);
  if (mins < 60) return `${mins} min temu`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) {
    if (hours === 1) return '1 godz. temu';
    return `${hours} godz. temu`;
  }
  const days = Math.floor(hours / 24);
  if (days === 1) return 'wczoraj';
  return `${days} dni temu`;
}

function formatTime(date) {
  return date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
}

function formatDateLabel(date) {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Dzisiaj';
  if (date.toDateString() === yesterday.toDateString()) return 'Wczoraj';
  return date.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' });
}

function formatDuration(hours, minutes) {
  if (hours > 0) return `${hours}h ${minutes}min`;
  return `${minutes}min`;
}

function showToast(msg, duration = 2500) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), duration);
}

// ===== SCREEN MANAGEMENT =====

function showAuthScreen() {
  document.getElementById('auth-screen').classList.add('active');
  document.getElementById('app-screen').classList.remove('active');
}

function showAppScreen() {
  document.getElementById('auth-screen').classList.remove('active');
  document.getElementById('app-screen').classList.add('active');
}

// ===== MODAL MANAGEMENT =====

function openModal(name) {
  const modal = document.getElementById(`${name}-modal`);
  if (!modal) return;
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';

  if (name === 'feeding') {
    document.getElementById('feeding-time').value = getCurrentDateTimeLocal();
    document.getElementById('feeding-duration').value = '';
    document.getElementById('feeding-amount').value = '';
    document.getElementById('feeding-note').value = '';
    // Pre-select default feeding source
    document.querySelectorAll('#feeding-source-group .option-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.value === defaultFeedingSource);
    });
    const isBottle = defaultFeedingSource === 'bottle';
    document.getElementById('bottle-amount-group').style.display = isBottle ? 'flex' : 'none';
  } else if (name === 'poop') {
    document.getElementById('poop-time').value = getCurrentDateTimeLocal();
    document.getElementById('poop-note').value = '';
  } else if (name === 'pee') {
    document.getElementById('pee-time').value = getCurrentDateTimeLocal();
    document.getElementById('pee-note').value = '';
  } else if (name === 'family') {
    loadFamilyInfo();
  }
}

function closeModal(name) {
  const modal = document.getElementById(`${name}-modal`);
  if (!modal) return;
  modal.classList.remove('active');
  document.body.style.overflow = '';
}

// ===== AUTH =====

onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        currentFamilyId = userDoc.data().familyId;
      } else {
        currentFamilyId = await createFamily(user.uid, user.displayName || 'Rodzic');
      }
      await loadFamilyData();
      showAppScreen();
      subscribeToEvents();
      checkBabySetup();
    } catch (err) {
      console.error('Auth state error:', err);
      showAuthScreen();
    }
  } else {
    currentUser = null;
    currentFamilyId = null;
    allEvents = [];
    if (unsubscribeEvents) {
      unsubscribeEvents();
      unsubscribeEvents = null;
    }
    showAuthScreen();
  }
});

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errorEl = document.getElementById('login-error');
  errorEl.textContent = '';

  const btn = e.target.querySelector('button[type=submit]');
  btn.disabled = true;
  btn.textContent = 'Logowanie...';

  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (err) {
    errorEl.textContent = translateAuthError(err.code);
    btn.disabled = false;
    btn.textContent = 'Zaloguj się';
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const name = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  const familyCodeInput = document.getElementById('reg-family-code').value.trim().toUpperCase();
  const errorEl = document.getElementById('register-error');
  errorEl.textContent = '';

  if (!name) { errorEl.textContent = 'Podaj swoje imię.'; return; }
  if (password.length < 6) { errorEl.textContent = 'Hasło musi mieć min. 6 znaków.'; return; }

  const btn = e.target.querySelector('button[type=submit]');
  btn.disabled = true;
  btn.textContent = 'Rejestracja...';

  try {
    const { user } = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(user, { displayName: name });

    if (familyCodeInput) {
      // Try to join existing family
      const codeDoc = await getDoc(doc(db, 'familyCodes', familyCodeInput));
      if (!codeDoc.exists()) {
        errorEl.textContent = 'Nieprawidłowy kod rodziny.';
        await user.delete();
        btn.disabled = false;
        btn.textContent = 'Zarejestruj się';
        return;
      }
      const familyId = codeDoc.data().familyId;
      await joinExistingFamily(user.uid, name, email, familyId);
    } else {
      await createFamily(user.uid, name, email);
    }
  } catch (err) {
    errorEl.textContent = translateAuthError(err.code);
    btn.disabled = false;
    btn.textContent = 'Zarejestruj się';
  }
}

function translateAuthError(code) {
  const errors = {
    'auth/email-already-in-use': 'Ten email jest już zarejestrowany.',
    'auth/invalid-email': 'Nieprawidłowy adres email.',
    'auth/wrong-password': 'Nieprawidłowe hasło.',
    'auth/user-not-found': 'Nie znaleziono konta dla tego emaila.',
    'auth/weak-password': 'Hasło jest zbyt słabe.',
    'auth/too-many-requests': 'Zbyt wiele prób. Spróbuj później.',
    'auth/invalid-credential': 'Nieprawidłowe dane logowania.',
  };
  return errors[code] || 'Wystąpił błąd. Spróbuj ponownie.';
}

// ===== FAMILY MANAGEMENT =====

async function createFamily(uid, name, email) {
  const code = generateCode();
  const familyId = uid;

  // User doc must be written FIRST – family write rule reads it via getUserFamilyId()
  await setDoc(doc(db, 'users', uid), {
    familyId,
    displayName: name,
    email: email || currentUser?.email || '',
    createdAt: serverTimestamp()
  });

  await setDoc(doc(db, 'families', familyId), {
    code,
    members: [uid],
    createdAt: serverTimestamp()
  });

  await setDoc(doc(db, 'familyCodes', code), { familyId });

  currentFamilyId = familyId;
  return familyId;
}

async function joinExistingFamily(uid, name, email, familyId) {
  await setDoc(doc(db, 'users', uid), {
    familyId,
    displayName: name,
    email,
    createdAt: serverTimestamp()
  });

  await updateDoc(doc(db, 'families', familyId), {
    members: arrayUnion(uid)
  });

  currentFamilyId = familyId;
}

async function handleJoinFamily() {
  const code = document.getElementById('join-code-input').value.trim().toUpperCase();
  const errorEl = document.getElementById('join-error');
  errorEl.textContent = '';

  if (!code || code.length !== 6) {
    errorEl.textContent = 'Podaj 6-znakowy kod rodziny.';
    return;
  }

  const btn = document.getElementById('join-family-btn');
  btn.disabled = true;
  btn.textContent = 'Szukam...';

  try {
    const codeDoc = await getDoc(doc(db, 'familyCodes', code));
    if (!codeDoc.exists()) {
      errorEl.textContent = 'Nie znaleziono rodziny z tym kodem.';
      btn.disabled = false;
      btn.textContent = 'Dołącz do rodziny';
      return;
    }

    const familyId = codeDoc.data().familyId;
    if (familyId === currentFamilyId) {
      errorEl.textContent = 'Już jesteś w tej rodzinie!';
      btn.disabled = false;
      btn.textContent = 'Dołącz do rodziny';
      return;
    }

    await updateDoc(doc(db, 'users', currentUser.uid), { familyId });
    await updateDoc(doc(db, 'families', familyId), {
      members: arrayUnion(currentUser.uid)
    });

    currentFamilyId = familyId;

    if (unsubscribeEvents) unsubscribeEvents();
    subscribeToEvents();

    closeModal('family');
    showToast('Dołączono do rodziny! 🎉');
  } catch (err) {
    console.error(err);
    errorEl.textContent = 'Błąd. Spróbuj ponownie.';
    btn.disabled = false;
    btn.textContent = 'Dołącz do rodziny';
  }
}

async function loadFamilyData() {
  if (!currentFamilyId) return;
  try {
    const familyDoc = await getDoc(doc(db, 'families', currentFamilyId));
    if (!familyDoc.exists()) return;
    const data = familyDoc.data();
    babyName = data.babyName || null;
    defaultFeedingSource = data.defaultFeedingSource || 'breast_left';
    updateHeaderBabyName();
  } catch (err) {
    console.error('Error loading family data:', err);
  }
}

function updateHeaderBabyName() {
  const el = document.getElementById('header-baby-name');
  el.textContent = babyName ? `👶 ${babyName}` : 'Baby Tracker';
}

function checkBabySetup() {
  if (!babyName) openModal('baby-setup');
}

async function saveBabySetup() {
  const name = document.getElementById('baby-name-input').value.trim();
  const sourceEl = document.querySelector('#baby-default-source-group .option-btn.active');
  const source = sourceEl ? sourceEl.dataset.value : 'bottle';
  const errorEl = document.getElementById('baby-setup-error');
  errorEl.textContent = '';

  if (!name) { errorEl.textContent = 'Podaj imię maluszka.'; return; }

  const btn = document.getElementById('save-baby-setup-btn');
  btn.disabled = true;
  btn.textContent = 'Zapisuję...';

  try {
    await updateDoc(doc(db, 'families', currentFamilyId), {
      babyName: name,
      defaultFeedingSource: source
    });
    babyName = name;
    defaultFeedingSource = source;
    updateHeaderBabyName();
    closeModal('baby-setup');
    showToast(`Cześć, ${name}! 🎉`);
  } catch (err) {
    console.error(err);
    errorEl.textContent = 'Błąd zapisu. Spróbuj ponownie.';
    btn.disabled = false;
    btn.textContent = 'Zapisz';
  }
}

async function loadFamilyInfo() {
  if (!currentFamilyId) return;

  try {
    const familyDoc = await getDoc(doc(db, 'families', currentFamilyId));
    if (!familyDoc.exists()) return;

    const data = familyDoc.data();
    document.getElementById('family-code-display').textContent = data.code || '–';

    // Baby settings display
    const sourceLabels = { breast_left: 'Lewa pierś', breast_right: 'Prawa pierś', bottle: 'Butelka' };
    document.getElementById('family-baby-name').textContent = data.babyName || 'Nie ustawiono';
    document.getElementById('family-baby-source').textContent =
      `Domyślnie: ${sourceLabels[data.defaultFeedingSource] || 'Lewa pierś'}`;

    const membersEl = document.getElementById('family-members-list');
    if (data.members && data.members.length > 0) {
      const memberDocs = await Promise.all(
        data.members.map(uid => getDoc(doc(db, 'users', uid)))
      );
      membersEl.innerHTML = memberDocs
        .filter(d => d.exists())
        .map(d => {
          const m = d.data();
          const isMe = d.id === currentUser.uid;
          const initial = (m.displayName || 'R').charAt(0).toUpperCase();
          return `
            <div class="family-member">
              <div class="member-avatar">${initial}</div>
              <div>
                <div class="member-name">${escapeHtml(m.displayName || 'Rodzic')}</div>
                ${isMe ? '<div class="member-you">To Ty</div>' : ''}
              </div>
            </div>`;
        }).join('');
    }
  } catch (err) {
    console.error('Error loading family info:', err);
  }
}

// ===== EVENTS =====

function subscribeToEvents() {
  if (!currentFamilyId) return;
  if (unsubscribeEvents) unsubscribeEvents();

  const q = query(
    collection(db, 'families', currentFamilyId, 'events'),
    orderBy('timestamp', 'desc'),
    limit(100)
  );

  unsubscribeEvents = onSnapshot(q, (snapshot) => {
    allEvents = snapshot.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(e => e.timestamp);
    renderTimeline(allEvents);
    updateStats(allEvents);
  }, (err) => {
    console.error('Events snapshot error:', err);
  });
}

async function saveFeeding() {
  if (!currentFamilyId) return;

  const sourceEl = document.querySelector('#feeding-source-group .option-btn.active');
  const source = sourceEl ? sourceEl.dataset.value : 'breast_left';
  const amountVal = document.getElementById('feeding-amount').value;
  const durationVal = document.getElementById('feeding-duration').value;
  const timeVal = document.getElementById('feeding-time').value;
  const note = document.getElementById('feeding-note').value.trim();

  const timestamp = timeVal ? new Date(timeVal) : new Date();

  const data = {
    type: 'feeding',
    timestamp,
    userId: currentUser.uid,
    userDisplayName: currentUser.displayName || 'Rodzic',
    source,
    note,
    ...(source === 'bottle' && amountVal ? { amount: parseInt(amountVal) } : {}),
    ...(durationVal ? { duration: parseInt(durationVal) } : {})
  };

  try {
    await addDoc(collection(db, 'families', currentFamilyId, 'events'), data);
    closeModal('feeding');
    showToast('Karmienie zapisane 🍼');
  } catch (err) {
    console.error(err);
    showToast('Błąd zapisu. Spróbuj ponownie.');
  }
}

async function saveDiaper(type) {
  if (!currentFamilyId) return;

  const timeVal = document.getElementById(`${type}-time`).value;
  const note = document.getElementById(`${type}-note`).value.trim();
  const timestamp = timeVal ? new Date(timeVal) : new Date();

  const data = {
    type,
    timestamp,
    userId: currentUser.uid,
    userDisplayName: currentUser.displayName || 'Rodzic',
    note
  };

  try {
    await addDoc(collection(db, 'families', currentFamilyId, 'events'), data);
    closeModal(type);
    const label = type === 'poop' ? 'Kupa zapisana 💩' : 'Siku zapisane 💧';
    showToast(label);
  } catch (err) {
    console.error(err);
    showToast('Błąd zapisu. Spróbuj ponownie.');
  }
}

function confirmDeleteEvent(eventId) {
  pendingDeleteId = eventId;
  const modal = document.getElementById('delete-modal');
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

async function executeDelete() {
  if (!pendingDeleteId || !currentFamilyId) return;
  try {
    await deleteDoc(doc(db, 'families', currentFamilyId, 'events', pendingDeleteId));
    showToast('Wpis usunięty');
  } catch (err) {
    console.error(err);
    showToast('Błąd usuwania.');
  } finally {
    pendingDeleteId = null;
    closeModal('delete');
  }
}

// ===== TIMELINE RENDERING =====

function getEventConfig(type) {
  const configs = {
    feeding: { icon: '🍼', label: 'Karmienie', cls: 'feeding' },
    poop: { icon: '💩', label: 'Kupa', cls: 'poop' },
    pee: { icon: '💧', label: 'Siku', cls: 'pee' }
  };
  return configs[type] || { icon: '📝', label: type, cls: 'feeding' };
}

function getEventDetails(event) {
  if (event.type === 'feeding') {
    const parts = [];
    const sourceLabels = {
      breast_left: 'Lewa pierś',
      breast_right: 'Prawa pierś',
      bottle: 'Butelka'
    };
    parts.push(sourceLabels[event.source] || event.source);
    if (event.amount) parts.push(`${event.amount} ml`);
    if (event.duration) parts.push(`${event.duration} min`);
    if (event.note) parts.push(event.note);
    return parts.join(' · ');
  }
  if (event.note) return event.note;
  return '';
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderEventCard(event) {
  const cfg = getEventConfig(event.type);
  const date = event.timestamp instanceof Date
    ? event.timestamp
    : event.timestamp.toDate ? event.timestamp.toDate() : new Date(event.timestamp);
  const details = getEventDetails(event);
  const isOwn = event.userId === currentUser?.uid;

  return `
    <div class="event-card" data-id="${event.id}">
      <div class="event-icon event-icon--${cfg.cls}">${cfg.icon}</div>
      <div class="event-body">
        <div class="event-title">${cfg.label}</div>
        ${details ? `<div class="event-details">${escapeHtml(details)}</div>` : ''}
        ${!isOwn ? `<div class="event-author">${escapeHtml(event.userDisplayName || 'Partner/ka')}</div>` : ''}
      </div>
      <div class="event-meta">
        <div class="event-time">${formatTime(date)}</div>
        <div class="event-ago">${formatTimeAgo(date)}</div>
      </div>
      ${isOwn ? `<button class="delete-event-btn" data-id="${event.id}" title="Usuń">✕</button>` : ''}
    </div>`;
}

function renderTimeline(events) {
  const timeline = document.getElementById('timeline');

  if (!events.length) {
    timeline.innerHTML = '<p class="empty-state">Brak wpisów. Naciśnij przycisk aby dodać pierwszy wpis!</p>';
    return;
  }

  const groups = new Map();
  events.forEach(event => {
    const date = event.timestamp instanceof Date
      ? event.timestamp
      : event.timestamp.toDate ? event.timestamp.toDate() : new Date(event.timestamp);
    const key = date.toDateString();
    if (!groups.has(key)) groups.set(key, { date, items: [] });
    groups.get(key).items.push(event);
  });

  let html = '';
  for (const [, group] of groups) {
    html += `<div class="day-group">
      <h4 class="day-label">${formatDateLabel(group.date)}</h4>
      ${group.items.map(renderEventCard).join('')}
    </div>`;
  }

  timeline.innerHTML = html;

  // Attach delete listeners
  timeline.querySelectorAll('.delete-event-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      confirmDeleteEvent(btn.dataset.id);
    });
  });
}

// ===== STATS =====

function updateStats(events) {
  if (!events) return;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const todayEvents = events.filter(e => {
    const date = e.timestamp instanceof Date
      ? e.timestamp
      : e.timestamp.toDate ? e.timestamp.toDate() : new Date(e.timestamp);
    return date >= todayStart;
  });

  const feedingsToday = todayEvents.filter(e => e.type === 'feeding').length;
  const diapersToday = todayEvents.filter(e => e.type === 'poop' || e.type === 'pee').length;
  const mlToday = todayEvents
    .filter(e => e.type === 'feeding' && e.amount)
    .reduce((sum, e) => sum + (e.amount || 0), 0);

  document.getElementById('stat-feedings').textContent = feedingsToday;
  document.getElementById('stat-diapers').textContent = diapersToday;
  document.getElementById('stat-ml').textContent = mlToday > 0 ? `${mlToday}` : '–';

  const lastFeeding = events.find(e => e.type === 'feeding');
  if (lastFeeding) {
    const date = lastFeeding.timestamp instanceof Date
      ? lastFeeding.timestamp
      : lastFeeding.timestamp.toDate ? lastFeeding.timestamp.toDate() : new Date(lastFeeding.timestamp);
    const diffMins = Math.floor((now - date) / 60000);
    if (diffMins < 60) {
      document.getElementById('stat-last-feeding').textContent = `${diffMins}min`;
    } else {
      const h = Math.floor(diffMins / 60);
      const m = diffMins % 60;
      document.getElementById('stat-last-feeding').textContent = m > 0 ? `${h}h${m}m` : `${h}h`;
    }
  } else {
    document.getElementById('stat-last-feeding').textContent = '–';
  }
}

// Update stats every minute so "time ago" stays fresh
setInterval(() => {
  if (allEvents.length) updateStats(allEvents);
}, 60000);

// ===== EVENT LISTENERS =====

// Auth tabs
document.querySelectorAll('.auth-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(`${tab.dataset.tab}-form`).classList.add('active');
  });
});

// Auth forms
document.getElementById('login-form').addEventListener('submit', handleLogin);
document.getElementById('register-form').addEventListener('submit', handleRegister);

// Logout
document.getElementById('logout-btn').addEventListener('click', () => signOut(auth));

// Family
document.getElementById('family-btn').addEventListener('click', () => openModal('family'));
document.getElementById('join-family-btn').addEventListener('click', handleJoinFamily);

// Copy family code
document.getElementById('copy-code-btn').addEventListener('click', () => {
  const code = document.getElementById('family-code-display').textContent;
  if (navigator.clipboard && code !== '–') {
    navigator.clipboard.writeText(code).then(() => showToast('Kod skopiowany!'));
  }
});

// Quick action buttons
document.getElementById('btn-feeding').addEventListener('click', () => openModal('feeding'));
document.getElementById('btn-poop').addEventListener('click', () => openModal('poop'));
document.getElementById('btn-pee').addEventListener('click', () => openModal('pee'));

// Save buttons
document.getElementById('save-feeding-btn').addEventListener('click', saveFeeding);
document.getElementById('save-poop-btn').addEventListener('click', () => saveDiaper('poop'));
document.getElementById('save-pee-btn').addEventListener('click', () => saveDiaper('pee'));

// Feeding source selection
document.querySelectorAll('#feeding-source-group .option-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#feeding-source-group .option-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const isBottle = btn.dataset.value === 'bottle';
    document.getElementById('bottle-amount-group').style.display = isBottle ? 'flex' : 'none';
  });
});

// Close modals via backdrop click or close button
document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
  backdrop.addEventListener('click', () => {
    const modal = backdrop.closest('.modal');
    const id = modal.id.replace('-modal', '');
    closeModal(id);
  });
});

document.querySelectorAll('.close-btn[data-modal]').forEach(btn => {
  btn.addEventListener('click', () => closeModal(btn.dataset.modal));
});

// Delete modal
document.getElementById('delete-confirm-btn').addEventListener('click', executeDelete);
document.getElementById('delete-cancel-btn').addEventListener('click', () => {
  pendingDeleteId = null;
  closeModal('delete');
});

// Baby setup modal
document.getElementById('save-baby-setup-btn').addEventListener('click', saveBabySetup);
document.getElementById('baby-setup-skip-btn').addEventListener('click', () => closeModal('baby-setup'));

document.querySelectorAll('#baby-default-source-group .option-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#baby-default-source-group .option-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

// Edit baby button in family modal
document.getElementById('edit-baby-btn').addEventListener('click', () => {
  closeModal('family');
  // Pre-fill baby setup form with current values
  document.getElementById('baby-name-input').value = babyName || '';
  document.querySelectorAll('#baby-default-source-group .option-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.value === defaultFeedingSource);
  });
  document.getElementById('baby-setup-title').textContent = '👶 Edytuj maluszka';
  document.getElementById('baby-setup-error').textContent = '';
  openModal('baby-setup');
});

// Register form: auto-uppercase the family code field
document.getElementById('reg-family-code').addEventListener('input', function () {
  this.value = this.value.toUpperCase();
});

document.getElementById('join-code-input').addEventListener('input', function () {
  this.value = this.value.toUpperCase();
});

// ===== SERVICE WORKER =====
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(err => {
      console.warn('SW registration failed:', err);
    });
  });
}
