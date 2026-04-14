// =============================================================
// FRAGMENTS — app.js
// =============================================================

// =============================================================
// 1. SUPABASE SETUP
// =============================================================
const SUPABASE_URL = 'https://mtjrsoysgzdfdkjxnghi.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10anJzb3lzZ3pkZmRranhuZ2hpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxMDIzODYsImV4cCI6MjA5MTY3ODM4Nn0.BSs5cDXYWT2AbwDcllwBNGWkFWRyXrHHDdtd1E69pm0';

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// =============================================================
// 2. APP STATE
// =============================================================
let editingId = null;
let deleteCallback = null;
let storyEditingId = null;

// =============================================================
// 3. DOM REFERENCES — Fragments
// =============================================================
const cardsContainer = document.getElementById('cards-container');
const addBtn = document.getElementById('add-btn');
const modalOverlay = document.getElementById('modal-overlay');
const modalTitle = document.getElementById('modal-title');
const inputTitle = document.getElementById('input-title');
const inputContent = document.getElementById('input-content');
const modalCancel = document.getElementById('modal-cancel');
const modalSubmit = document.getElementById('modal-submit');

const confirmOverlay = document.getElementById('confirm-overlay');
const confirmText = document.getElementById('confirm-text');
const confirmCancel = document.getElementById('confirm-cancel');
const confirmDeleteBtn = document.getElementById('confirm-delete');
const toastEl = document.getElementById('toast');

// =============================================================
// 4. DOM REFERENCES — Story
// =============================================================
const timelineEl = document.getElementById('timeline');
const addMemoryBtn = document.getElementById('add-memory-btn');

const storyModalOverlay = document.getElementById('story-modal-overlay');
const storyModalTitle = document.getElementById('story-modal-title');
const storyInputYear = document.getElementById('story-input-year');
const storyInputMonth = document.getElementById('story-input-month');
const storyInputTitle = document.getElementById('story-input-title');
const storyInputDesc = document.getElementById('story-input-desc');
const storyModalCancel = document.getElementById('story-modal-cancel');
const storyModalSubmit = document.getElementById('story-modal-submit');

const storyDetailOverlay = document.getElementById('story-detail-overlay');
const storyDetailTitle = document.getElementById('story-detail-title');
const storyDetailMeta = document.getElementById('story-detail-meta');
const storyDetailContent = document.getElementById('story-detail-content');
const storyDetailClose = document.getElementById('story-detail-close');
const storyDetailEdit = document.getElementById('story-detail-edit');

// Holds the memory currently displayed in the detail modal,
// so the Edit button knows what to pre-fill.
let currentDetailMemory = null;

// =============================================================
// 5. HELPERS
// =============================================================
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text ?? '';
  return div.innerHTML;
}

function formatDate(isoString) {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

const MONTH_NAMES = [
  '',
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

let toastTimeout;
function showToast(message) {
  clearTimeout(toastTimeout);
  toastEl.textContent = message;
  toastEl.classList.add('visible');
  toastTimeout = setTimeout(() => {
    toastEl.classList.remove('visible');
  }, 2500);
}

// =============================================================
// 6. SHARED CONFIRM DIALOG
// =============================================================
function openConfirmDialog(message, callback) {
  confirmText.textContent = message;
  deleteCallback = callback;
  confirmOverlay.classList.add('active');
}

function closeConfirm() {
  confirmOverlay.classList.remove('active');
  deleteCallback = null;
}

// =============================================================
// 7. FRAGMENT MODAL LOGIC
// =============================================================
function openModal() {
  editingId = null;
  modalTitle.textContent = 'New fragment';
  inputTitle.value = '';
  inputContent.value = '';
  modalOverlay.classList.add('active');
  setTimeout(() => inputTitle.focus(), 150);
}

function openEdit(id, title, content) {
  editingId = id;
  modalTitle.textContent = 'Edit fragment';
  inputTitle.value = title;
  inputContent.value = content;
  modalOverlay.classList.add('active');
  setTimeout(() => inputTitle.focus(), 150);
}

function closeModal() {
  modalOverlay.classList.remove('active');
}

// =============================================================
// 8. STORY MODAL LOGIC
// =============================================================
function openStoryModal() {
  storyEditingId = null;
  storyModalTitle.textContent = 'New memory';
  storyInputYear.value = '2025';
  storyInputMonth.value = '9';
  storyInputTitle.value = '';
  storyInputDesc.value = '';
  storyModalOverlay.classList.add('active');
  setTimeout(() => storyInputTitle.focus(), 150);
}

function closeStoryModal() {
  storyModalOverlay.classList.remove('active');
}

function openStoryDetail(id, title, description, year, month) {
  currentDetailMemory = { id, title, description, year, month };
  storyDetailTitle.textContent = title || 'Memory';
  storyDetailMeta.textContent = `${MONTH_NAMES[month]} ${year}`;
  storyDetailContent.textContent = description || 'No additional description.';
  storyDetailOverlay.classList.add('active');
}

function closeStoryDetail() {
  storyDetailOverlay.classList.remove('active');
}

// Open the memory form pre-filled from an existing memory → update flow.
function openStoryEdit(memory) {
  if (!memory) return;
  storyEditingId = memory.id;
  storyModalTitle.textContent = 'Edit memory';
  storyInputYear.value = String(memory.year);
  storyInputMonth.value = String(memory.month);
  storyInputTitle.value = memory.title || '';
  storyInputDesc.value = memory.description || '';
  storyModalOverlay.classList.add('active');
  setTimeout(() => storyInputTitle.focus(), 150);
}

// =============================================================
// 9. FRAGMENTS — CRUD
// =============================================================
async function loadAnecdotes() {
  const { data, error } = await db
    .from('anecdotes')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    cardsContainer.innerHTML =
      '<div class="empty-state"><p>Could not load fragments. Check your Supabase config.</p></div>';
    console.error('Supabase anecdotes error:', error);
    return;
  }

  if (!data || data.length === 0) {
    cardsContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">✦</div>
        <p>No fragments yet. Add your first one.</p>
      </div>`;
    return;
  }

  cardsContainer.innerHTML = data
    .map((item, index) => `
      <div class="card" style="animation-delay: ${index * 0.05}s">
        <div class="card-title">${escapeHtml(item.title)}</div>
        <div class="card-content">${escapeHtml(item.content)}</div>
        <div class="card-footer">
          <span class="card-date">${formatDate(item.created_at)}</span>
          <div class="card-actions">
            <button
              class="edit-btn"
              data-id="${item.id}"
              data-title="${escapeHtml(item.title)}"
              data-content="${escapeHtml(item.content)}"
            >Edit</button>
            <button class="delete-btn" data-id="${item.id}">Delete</button>
          </div>
        </div>
      </div>
    `)
    .join('');
}

async function createAnecdote(title, content) {
  const { error } = await db.from('anecdotes').insert([{ title, content }]);
  if (error) {
    showToast('Error creating fragment');
    console.error(error);
    return;
  }
  showToast('Fragment added ✦');
  await loadAnecdotes();
}

async function updateAnecdote(id, title, content) {
  const { error } = await db
    .from('anecdotes')
    .update({ title, content })
    .eq('id', id);

  if (error) {
    showToast('Error updating fragment');
    console.error(error);
    return;
  }
  showToast('Fragment updated');
  await loadAnecdotes();
}

async function deleteAnecdote(id) {
  const { error } = await db.from('anecdotes').delete().eq('id', id);
  if (error) {
    showToast('Error deleting fragment');
    console.error(error);
    return;
  }
  showToast('Fragment deleted');
  await loadAnecdotes();
}

async function handleSubmit() {
  const title = inputTitle.value.trim();
  const content = inputContent.value.trim();

  if (!title || !content) {
    showToast('Please fill in both fields');
    return;
  }

  const idToEdit = editingId;
  closeModal();
  editingId = null;

  if (idToEdit) {
    await updateAnecdote(idToEdit, title, content);
  } else {
    await createAnecdote(title, content);
  }
}

// =============================================================
// 10. STORY — DATA + TIMELINE
// =============================================================
const TIMELINE_YEARS = [
  { year: 2025, startMonth: 9 },
  { year: 2026, startMonth: 1 },
  { year: 2027, startMonth: 1 },
  { year: 2028, startMonth: 1 },
  { year: 2029, startMonth: 1 },
];

function renderTimeline(events) {
  const grouped = {};

  for (const ev of events) {
    const key = `${ev.year}-${ev.month}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(ev);
  }

  let html = '';

  for (const { year, startMonth } of TIMELINE_YEARS) {
    let monthsHtml = '';

    for (let month = startMonth; month <= 12; month++) {
      const key = `${year}-${month}`;
      const monthEvents = grouped[key] || [];
      const hasEvents = monthEvents.length > 0;

      let eventsHtml = '';
      for (const ev of monthEvents) {
        eventsHtml += `
          <span
            class="tl-event"
            data-story-id="${ev.id}"
            data-story-title="${encodeURIComponent(ev.title || '')}"
            data-story-desc="${encodeURIComponent(ev.description || '')}"
            data-story-year="${ev.year}"
            data-story-month="${ev.month}"
          >
            ${escapeHtml(ev.title)}
            <button class="tl-event-delete" data-story-id="${ev.id}" title="Delete">×</button>
          </span>
        `;
      }

      monthsHtml += `
        <div class="tl-month${hasEvents ? ' has-events' : ''}">
          <span class="month-label">${MONTH_NAMES[month]}</span>
          <div class="tl-events">${eventsHtml}</div>
        </div>
      `;
    }

    html += `
      <div class="timeline-year">
        <button class="year-header">
          <span class="year-label">${year}</span>
          <span class="year-arrow">›</span>
        </button>
        <div class="year-months">${monthsHtml}</div>
      </div>
    `;
  }

  html += `
    <div class="timeline-continuation">
      <span class="continuation-dots">·  ·  ·</span>
      <span class="continuation-text">La suite s'écrit ensemble</span>
    </div>
  `;

  timelineEl.innerHTML = html;
}

async function loadStoryEvents() {
  const { data, error } = await db
    .from('story_events')
    .select('*')
    .order('year', { ascending: true })
    .order('month', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Supabase story_events error:', error);
    timelineEl.innerHTML = '<div class="empty-state"><p>Could not load timeline.</p></div>';
    return;
  }

  renderTimeline(data || []);
}

async function handleStorySubmit() {
  const year = parseInt(storyInputYear.value, 10);
  const month = parseInt(storyInputMonth.value, 10);
  const title = storyInputTitle.value.trim();
  const desc = storyInputDesc.value.trim();

  if (!title) {
    showToast('Please enter a title');
    return;
  }

  if (year === 2025 && month < 9) {
    showToast('2025 starts in September');
    return;
  }

  const idToEdit = storyEditingId;
  closeStoryModal();
  storyEditingId = null;

  if (idToEdit) {
    const { error } = await db
      .from('story_events')
      .update({ year, month, title, description: desc })
      .eq('id', idToEdit);

    if (error) {
      showToast('Error updating memory');
      console.error(error);
      return;
    }
    showToast('Memory updated');
  } else {
    const { error } = await db
      .from('story_events')
      .insert([{ year, month, title, description: desc }]);

    if (error) {
      showToast('Error adding memory');
      console.error(error);
      return;
    }
    showToast('Memory added ✦');
  }

  await loadStoryEvents();
}

async function deleteStoryEvent(id) {
  const { error } = await db.from('story_events').delete().eq('id', id);

  if (error) {
    showToast('Error deleting memory');
    console.error(error);
    return;
  }

  showToast('Memory deleted');
  await loadStoryEvents();
}

// =============================================================
// 11. NAVBAR
// =============================================================
const navbar = document.getElementById('navbar');
const navLinks = document.querySelectorAll('.nav-link');
const sectionIds = ['hero', 'book', 'our-story'];
const sections = sectionIds.map(id => document.getElementById(id)).filter(Boolean);

function onScroll() {
  const scrollY = window.scrollY;
  navbar.classList.toggle('scrolled', scrollY > 30);

  let currentId = sectionIds[0];
  const viewMid = scrollY + window.innerHeight * 0.35;

  for (const section of sections) {
    if (section.offsetTop <= viewMid) currentId = section.id;
  }

  navLinks.forEach(link => {
    link.classList.toggle('active', link.getAttribute('data-section') === currentId);
  });
}

// Scroll-driven atmosphere.
// Writes a --scroll variable (0 → 1) plus six event intensities to :root.
// Each event peaks at a specific scroll position, then fades — so the
// background behaves like a sequence of luminous moments instead of a
// continuous glow. See the CSS "LIGHT EVENTS" section.
const rootEl = document.documentElement;
function bellCurve(s, center, width) {
  // Smooth 1 → 0 falloff; 0 outside [center-width, center+width]
  const d = (s - center) / width;
  const v = 1 - d * d;
  return v > 0 ? v : 0;
}
function updateScrollAtmosphere() {
  const max = Math.max(1, document.body.scrollHeight - window.innerHeight);
  const s = Math.min(1, Math.max(0, window.scrollY / max));
  rootEl.style.setProperty('--scroll', s.toFixed(3));

  // Event scroll positions (tuned to hero / book / story layout)
  rootEl.style.setProperty('--e-hero',  bellCurve(s, 0.03, 0.20).toFixed(3));
  rootEl.style.setProperty('--e-rays',  bellCurve(s, 0.22, 0.14).toFixed(3));
  rootEl.style.setProperty('--e-gold',  bellCurve(s, 0.42, 0.18).toFixed(3));
  rootEl.style.setProperty('--e-shift', bellCurve(s, 0.58, 0.10).toFixed(3));
  rootEl.style.setProperty('--e-rose',  bellCurve(s, 0.76, 0.18).toFixed(3));
  rootEl.style.setProperty('--e-end',   bellCurve(s, 0.94, 0.12).toFixed(3));
}

let scrollTicking = false;
window.addEventListener('scroll', function () {
  if (!scrollTicking) {
    requestAnimationFrame(function () {
      onScroll();
      updateScrollAtmosphere();
      scrollTicking = false;
    });
    scrollTicking = true;
  }
});
onScroll();
updateScrollAtmosphere();

// =============================================================
// 12. EVENT LISTENERS — Fragments
// =============================================================
addBtn.addEventListener('click', openModal);

modalCancel.addEventListener('click', function () {
  closeModal();
  editingId = null;
});

modalSubmit.addEventListener('click', handleSubmit);

modalOverlay.addEventListener('click', function (e) {
  if (e.target === modalOverlay) {
    closeModal();
    editingId = null;
  }
});

// =============================================================
// 13. EVENT LISTENERS — Shared confirm
// =============================================================
confirmCancel.addEventListener('click', closeConfirm);

confirmDeleteBtn.addEventListener('click', async function () {
  const cb = deleteCallback;
  closeConfirm();
  if (cb) await cb();
});

confirmOverlay.addEventListener('click', function (e) {
  if (e.target === confirmOverlay) closeConfirm();
});

// =============================================================
// 14. EVENT LISTENERS — Fragment cards
// =============================================================
cardsContainer.addEventListener('click', function (e) {
  const editBtn = e.target.closest('.edit-btn');
  const deleteBtn = e.target.closest('.delete-btn');

  if (editBtn) {
    openEdit(
      editBtn.getAttribute('data-id'),
      editBtn.getAttribute('data-title'),
      editBtn.getAttribute('data-content')
    );
    return;
  }

  if (deleteBtn) {
    const id = deleteBtn.getAttribute('data-id');
    openConfirmDialog('Delete this fragment? This cannot be undone.', () => deleteAnecdote(id));
  }
});

// =============================================================
// 15. EVENT LISTENERS — Story modal + timeline
// =============================================================
addMemoryBtn.addEventListener('click', openStoryModal);

storyModalCancel.addEventListener('click', function () {
  closeStoryModal();
  storyEditingId = null;
});

storyModalSubmit.addEventListener('click', handleStorySubmit);

storyModalOverlay.addEventListener('click', function (e) {
  if (e.target === storyModalOverlay) {
    closeStoryModal();
    storyEditingId = null;
  }
});

storyInputYear.addEventListener('change', function () {
  if (storyInputYear.value === '2025' && parseInt(storyInputMonth.value, 10) < 9) {
    storyInputMonth.value = '9';
  }
});

storyDetailClose.addEventListener('click', closeStoryDetail);

storyDetailOverlay.addEventListener('click', function (e) {
  if (e.target === storyDetailOverlay) closeStoryDetail();
});

timelineEl.addEventListener('click', function (e) {
  const yearHeader = e.target.closest('.year-header');
  if (yearHeader) {
    const yearBlock = yearHeader.closest('.timeline-year');
    const monthsDiv = yearBlock.querySelector('.year-months');
    const isOpen = yearBlock.classList.contains('open');

    if (isOpen) {
      monthsDiv.style.maxHeight = monthsDiv.scrollHeight + 'px';
      void monthsDiv.offsetHeight;
      monthsDiv.style.maxHeight = '0px';
      yearBlock.classList.remove('open');
    } else {
      yearBlock.classList.add('open');
      monthsDiv.style.maxHeight = monthsDiv.scrollHeight + 'px';

      function onEnd(evt) {
        if (evt.propertyName === 'max-height' && yearBlock.classList.contains('open')) {
          monthsDiv.style.maxHeight = 'none';
        }
        monthsDiv.removeEventListener('transitionend', onEnd);
      }

      monthsDiv.addEventListener('transitionend', onEnd);
    }
    return;
  }

  const deleteBtn = e.target.closest('.tl-event-delete');
  if (deleteBtn) {
    e.stopPropagation();
    const id = deleteBtn.getAttribute('data-story-id');
    openConfirmDialog('Delete this memory?', () => deleteStoryEvent(id));
    return;
  }

  const storyEvent = e.target.closest('.tl-event');
  if (storyEvent) {
    const id = storyEvent.getAttribute('data-story-id');
    const title = decodeURIComponent(storyEvent.getAttribute('data-story-title') || '');
    const desc = decodeURIComponent(storyEvent.getAttribute('data-story-desc') || '');
    const year = parseInt(storyEvent.getAttribute('data-story-year'), 10);
    const month = parseInt(storyEvent.getAttribute('data-story-month'), 10);

    openStoryDetail(id, title, desc, year, month);
  }
});

// Edit current memory from the detail modal
storyDetailEdit.addEventListener('click', function () {
  const memory = currentDetailMemory;
  closeStoryDetail();
  openStoryEdit(memory);
});

// =============================================================
// 16. KEYBOARD
// =============================================================
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') {
    if (confirmOverlay.classList.contains('active')) closeConfirm();
    else if (storyDetailOverlay.classList.contains('active')) closeStoryDetail();
    else if (storyModalOverlay.classList.contains('active')) {
      closeStoryModal();
      storyEditingId = null;
    } else if (modalOverlay.classList.contains('active')) {
      closeModal();
      editingId = null;
    }
  }

  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    if (storyModalOverlay.classList.contains('active')) handleStorySubmit();
    else if (modalOverlay.classList.contains('active')) handleSubmit();
  }
});

// =============================================================
// 17. PASSWORD GATE
// Front-end only, intimate site password.
// =============================================================
const SITE_PASSWORD = 'colinejtm';

const gateEl = document.getElementById('gate');
const gateForm = document.getElementById('gate-form');
const gateInput = document.getElementById('gate-input');
const gateError = document.getElementById('gate-error');
const gateShatter = document.getElementById('gate-shatter');

function spawnShatterParticles() {
  // Burst of light points from gate center
  const rect = gateEl.getBoundingClientRect();
  const cx = rect.width / 2;
  const cy = rect.height / 2;
  const count = 48;

  for (let i = 0; i < count; i++) {
    const p = document.createElement('span');
    p.className = 'shatter-particle';
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
    const dist = 260 + Math.random() * 340;
    p.style.left = cx + 'px';
    p.style.top = cy + 'px';
    p.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
    p.style.setProperty('--dy', Math.sin(angle) * dist + 'px');
    p.style.animationDelay = (Math.random() * 0.25) + 's';
    gateShatter.appendChild(p);
  }

  setTimeout(() => { gateShatter.innerHTML = ''; }, 2000);
}

function openGate() {
  gateEl.classList.add('shattering');
  spawnShatterParticles();
  // Release the body after the dissolve finishes
  setTimeout(() => {
    document.body.classList.remove('gate-locked');
  }, 600);
}

if (gateForm) {
  gateForm.addEventListener('submit', function (e) {
    e.preventDefault();
    const value = (gateInput.value || '').trim().toLowerCase();
    if (value === SITE_PASSWORD) {
      gateError.classList.remove('visible');
      openGate();
    } else {
      gateError.classList.add('visible');
      gateInput.value = '';
      gateInput.focus();
      // subtle shake
      gateInput.animate(
        [
          { transform: 'translateX(0)' },
          { transform: 'translateX(-6px)' },
          { transform: 'translateX(6px)' },
          { transform: 'translateX(0)' },
        ],
        { duration: 320, easing: 'ease-in-out' }
      );
    }
  });
  // Focus the gate input on load
  setTimeout(() => gateInput && gateInput.focus(), 400);
}

// =============================================================
// 18. COSMIC CANVAS — drifting stars + one special easter star
// =============================================================
const cosmosCanvas = document.getElementById('cosmos-canvas');
const ctx = cosmosCanvas.getContext('2d');

let stars = [];
let easterStar = null;
let cosmosWidth = 0;
let cosmosHeight = 0;
let cosmosDPR = Math.min(window.devicePixelRatio || 1, 2);

function resizeCosmos() {
  cosmosWidth = window.innerWidth;
  cosmosHeight = window.innerHeight;
  cosmosCanvas.width = cosmosWidth * cosmosDPR;
  cosmosCanvas.height = cosmosHeight * cosmosDPR;
  cosmosCanvas.style.width = cosmosWidth + 'px';
  cosmosCanvas.style.height = cosmosHeight + 'px';
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(cosmosDPR, cosmosDPR);
  initStars();
}

function initStars() {
  stars = [];
  const density = Math.floor((cosmosWidth * cosmosHeight) / 9000);
  const count = Math.min(Math.max(density, 80), 220);
  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.random() * cosmosWidth,
      y: Math.random() * cosmosHeight,
      r: Math.random() * 1.2 + 0.2,
      baseAlpha: Math.random() * 0.6 + 0.2,
      phase: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.002 + 0.0008,
      drift: Math.random() * 0.04 + 0.01,
      hue: Math.random() < 0.15 ? 'warm' : 'white',
    });
  }

  // Easter star — placed in upper portion, slightly brighter
  easterStar = {
    x: cosmosWidth * (0.18 + Math.random() * 0.08),
    y: cosmosHeight * (0.22 + Math.random() * 0.1),
    r: 2.4,
    phase: 0,
    clicked: false,
  };
}

function drawCosmos(t) {
  ctx.clearRect(0, 0, cosmosWidth, cosmosHeight);

  // Regular stars
  for (const s of stars) {
    s.phase += s.speed;
    const twinkle = (Math.sin(s.phase) + 1) / 2;
    const alpha = s.baseAlpha * (0.5 + twinkle * 0.5);
    s.y -= s.drift;
    if (s.y < -2) {
      s.y = cosmosHeight + 2;
      s.x = Math.random() * cosmosWidth;
    }

    ctx.beginPath();
    if (s.hue === 'warm') {
      ctx.fillStyle = `rgba(230, 200, 150, ${alpha})`;
    } else {
      ctx.fillStyle = `rgba(230, 230, 245, ${alpha})`;
    }
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Easter star (special, brighter, slow pulse with a soft halo)
  if (easterStar && !easterStar.clicked) {
    easterStar.phase += 0.02;
    const pulse = (Math.sin(easterStar.phase) + 1) / 2;
    const alpha = 0.75 + pulse * 0.25;
    const haloR = 14 + pulse * 6;

    const grad = ctx.createRadialGradient(
      easterStar.x, easterStar.y, 0,
      easterStar.x, easterStar.y, haloR
    );
    grad.addColorStop(0, `rgba(255, 225, 170, ${alpha * 0.9})`);
    grad.addColorStop(0.4, `rgba(212, 177, 132, ${alpha * 0.25})`);
    grad.addColorStop(1, 'rgba(212, 177, 132, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(easterStar.x, easterStar.y, haloR, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `rgba(255, 240, 210, ${alpha})`;
    ctx.beginPath();
    ctx.arc(easterStar.x, easterStar.y, easterStar.r, 0, Math.PI * 2);
    ctx.fill();
  }

  requestAnimationFrame(drawCosmos);
}

resizeCosmos();
requestAnimationFrame(drawCosmos);
window.addEventListener('resize', resizeCosmos);

// Click detection for the easter star.
// We listen at document level so the canvas can stay behind content (pointer-events:none).
// The hero section area is mostly empty around the star, so the click reliably
// lands on the hero/body — we just check proximity to the star's screen coords.
document.addEventListener('click', function (e) {
  if (document.body.classList.contains('gate-locked')) return;
  if (!easterStar || easterStar.clicked) return;
  // Ignore clicks on interactive elements
  if (e.target.closest('a, button, input, textarea, select, .modal, .easter-overlay, .gate')) return;

  const x = e.clientX;
  const y = e.clientY;
  const dx = x - easterStar.x;
  const dy = y - easterStar.y;
  if (Math.sqrt(dx * dx + dy * dy) < 26) {
    easterStar.clicked = true;
    burstEasterStar(easterStar.x, easterStar.y);
    setTimeout(openEasterEgg, 650);
  }
});

function burstEasterStar(x, y) {
  // simple canvas ripple — expand and fade
  let radius = 2;
  let alpha = 1;
  function step() {
    ctx.beginPath();
    ctx.strokeStyle = `rgba(255, 230, 180, ${alpha})`;
    ctx.lineWidth = 1.2;
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();
    radius += 3;
    alpha -= 0.035;
    if (alpha > 0) requestAnimationFrame(step);
  }
  step();
}

// =============================================================
// 19. EASTER EGG MODAL
// =============================================================
const easterOverlay = document.getElementById('easter-egg');
const easterClose = document.getElementById('easter-close');

function openEasterEgg() {
  easterOverlay.classList.add('active');
}
function closeEasterEgg() {
  easterOverlay.classList.remove('active');
  // allow the star to be found again after a while
  setTimeout(() => { if (easterStar) easterStar.clicked = false; }, 1500);
}
if (easterClose) easterClose.addEventListener('click', closeEasterEgg);
if (easterOverlay) {
  easterOverlay.addEventListener('click', function (e) {
    if (e.target === easterOverlay) closeEasterEgg();
  });
}

// =============================================================
// 20. SCROLL REVEAL — sections + hero items
// =============================================================
const revealObserver = new IntersectionObserver(
  function (entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
);

document.querySelectorAll('.reveal-section').forEach(el => revealObserver.observe(el));

// Hero items — reveal with staggered delay after gate opens
function revealHero() {
  document.querySelectorAll('.reveal-item').forEach(el => {
    const delay = parseInt(el.getAttribute('data-delay') || '0', 10);
    setTimeout(() => el.classList.add('in-view'), delay);
  });
}

// Wait for the gate to unlock, then play the hero entrance
const heroRevealInterval = setInterval(() => {
  if (!document.body.classList.contains('gate-locked')) {
    clearInterval(heroRevealInterval);
    revealHero();
  }
}, 150);

// =============================================================
// 21. START
// =============================================================
loadAnecdotes();
loadStoryEvents();