/**
 * ============================================================
 * Gurbani Learning Flash Cards — app.js
 * 
 * Features:
 *  - Loads word data from words.json
 *  - Renders flip cards (front/back)
 *  - Card flip on tap/click
 *  - Shuffle cards mode
 *  - Show/hide meanings toggle
 *  - Print layout
 *  - Download as PDF (via browser print dialog)
 *  - Toast notifications
 *  - Staggered card animations
 *  - Graceful image fallback
 * ============================================================
 */

// ── State ──────────────────────────────────────────────────
let allWords      = [];   // full original list
let displayWords  = [];   // current display list (may be shuffled)
let isMeaningsHidden = false;
let isShuffled       = false;
let isColorMode      = false;
let isImageHidden    = false;
let currentDataFile  = 'words.json';
let currentDesign    = 0;     // 0=Default, 1=Design 2 (Text), 2=Design 3 (Visual)
let searchQuery      = '';

// ── Pastel Palette ─────────────────────────────────────────
const PASTEL_COLORS = [
  '#FFE5D9', // Soft Peach
  '#FFF4E0', // Creamy Yellow
  '#E0F4E8', // Mint Green
  '#D9E8FC', // Baby Blue
  '#F0E6EF', // Lavender
  '#FDE2E4', // Pale Pink
  '#E2F0CB', // Light Lime
];

// ── DOM references ─────────────────────────────────────────
const cardsGrid     = document.getElementById('cards-grid');
const loadingState  = document.getElementById('loading-state');
const errorState    = document.getElementById('error-state');
const statsCount    = document.getElementById('stats-count');
const toast         = document.getElementById('toast');
let toastTimer      = null;

// ── Bootstrap ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadWords();
  attachButtonListeners();
});

// ── Load JSON data ─────────────────────────────────────────
async function loadWords() {
  try {
    showLoading(true);

    const response = await fetch(currentDataFile);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: Could not load ${currentDataFile}`);
    }

    allWords     = await response.json();
    // displayWords is now set via applyFiltersAndSort()

    if (!Array.isArray(allWords) || allWords.length === 0) {
      throw new Error('words.json is empty or not a valid array.');
    }

    showLoading(false);
    applyFiltersAndSort();

  } catch (err) {
    console.error('Failed to load words:', err);
    showLoading(false);
    showError(err.message);
  }
}

// ── Apply Filters & Shuffle ────────────────────────────────
function applyFiltersAndSort() {
  // 1. Start with all words
  let result = [...allWords];

  // 2. Filter by search query
  if (searchQuery) {
    const q = searchQuery.toLowerCase().trim();
    result = result.filter(word => 
      (word.word_gurmukhi && word.word_gurmukhi.toLowerCase().includes(q)) ||
      (word.transliteration && word.transliteration.toLowerCase().includes(q)) ||
      (word.meaning && word.meaning.toLowerCase().includes(q))
    );
  }

  // 3. Shuffle if enabled
  if (isShuffled) {
    shuffleArray(result);
  }

  displayWords = result;
  renderCards();
  updateStats();
}

// ── Render all cards ───────────────────────────────────────
function renderCards() {
  // Clear existing cards (not loading/error states)
  cardsGrid.innerHTML = '';

  displayWords.forEach((word, index) => {
    const card = createCardElement(word, index);
    cardsGrid.appendChild(card);
  });
}

// ── Create a single card DOM element ──────────────────────
function createCardElement(word, index) {
  const wrapper = document.createElement('div');
  wrapper.className = 'card-wrapper';

  // Staggered entrance animation delay
  // Cap the delay at 1200ms so large lists (like 365 words) don't stay hidden too long
  wrapper.style.animationDelay = `${Math.min(index * 60, 1200)}ms`;

  // Assign a unique pastel color based on index
  const color = PASTEL_COLORS[index % PASTEL_COLORS.length];
  wrapper.style.setProperty('--card-pastel', color);

  // Check if we are using the alternate template
  if (currentDesign === 1) {
    return createAltCardElement(wrapper, word);
  }
  // Check if we are using the classic template (Old Default)
  if (currentDesign === 2) {
    return createClassicCardElement(wrapper, word);
  }

  // ── DEFAULT DESIGN (Visual / New) ────────────────────
  // Front: Large Text (Same as Design 2)
  // ── Front Face ───────────────────────────────────────
  const front = document.createElement('div');
  front.className = 'card-face card-front-alt';

  front.innerHTML = `
    <div class="card-alt-header">Gurbani Learning Cards</div>
    
    <div class="card-alt-center">
      <div class="card-gurmukhi-large" lang="pa">${escapeHtml(word.word_gurmukhi)}</div>
      <div class="card-transliteration-large">${escapeHtml(word.transliteration || '')}</div>
    </div>

    <div class="card-alt-footer">www.365GurbaniWords.com</div>
    <div class="card-flip-hint">tap to flip ↻</div>
  `;

  // Back: Meaning (Fixed height) + Image (Margin) + No Footer
  const back = document.createElement('div');
  back.className = 'card-face card-back';

  back.innerHTML = `
    <div class="card-back-accent"></div>
    
    <!-- Header with fixed min-height for 2 lines of text consistency -->
    <div class="card-back-header card-back-header-visual">
      <div class="card-back-meaning card-back-meaning-visual">${escapeHtml(word.meaning)}</div>
    </div>

    <div class="card-back-body card-back-simple-body">
      ${buildImageHtml(word)}
    </div>
    
    <!-- No footer/icon requested -->
  `;

  const inner = document.createElement('div');
  inner.className = 'card-inner';
  inner.appendChild(front);
  inner.appendChild(back);

  wrapper.appendChild(inner);
  attachFlipEvents(wrapper);

  return wrapper;
}

// ── Create Classic Card (Old Default) ──────────────────────
function createClassicCardElement(wrapper, word) {
  // ── Front Face ───────────────────────────────────────
  const front = document.createElement('div');
  front.className = 'card-face card-front';

  front.innerHTML = `
    <!-- Top: Gurmukhi word + transliteration -->
    <div class="card-front-top">
      <div class="card-gurmukhi" lang="pa">${escapeHtml(word.word_gurmukhi)}</div>
      ${word.transliteration ? `<div class="card-transliteration">${escapeHtml(word.transliteration)}</div>` : ''}
    </div>

    <!-- Middle: Illustration image -->
    <div class="card-front-image">
      ${buildImageHtml(word)}
    </div>

    <!-- Bottom: English meaning -->
    <div class="card-front-bottom">
      <span class="card-meaning-label">meaning</span>
      <div class="card-meaning">${escapeHtml(word.meaning)}</div>
    </div>

    <!-- Tap hint -->
    <div class="card-flip-hint">tap to flip ↻</div>
  `;

  // ── Back Face ────────────────────────────────────────
  const back = document.createElement('div');
  back.className = 'card-face card-back';

  back.innerHTML = `
    <!-- Decorative glow -->
    <div class="card-back-accent"></div>

    <!-- Header -->
    <div class="card-back-header">
      <div class="card-back-gurmukhi" lang="pa">${escapeHtml(word.word_gurmukhi)}</div>
      ${word.transliteration ? `<div class="card-back-transliteration">${escapeHtml(word.transliteration)}</div>` : ''}
      <div class="card-back-meaning">${escapeHtml(word.meaning)}</div>
    </div>

    <!-- Body: description -->
    <div class="card-back-body">
      <div class="card-back-icon">🌸</div>
      <p class="card-description">${escapeHtml(word.description)}</p>
    </div>

    <!-- Footer hint -->
    <div class="card-back-footer">
      <div class="card-back-tap">↩ tap to flip back</div>
    </div>
  `;

  // ── Card inner (holds both faces) ────────────────────
  const inner = document.createElement('div');
  inner.className = 'card-inner';
  inner.appendChild(front);
  inner.appendChild(back);

  wrapper.appendChild(inner);

  // ── Flip interaction ──────────────────────────────────
  wrapper.addEventListener('click', () => {
    wrapper.classList.toggle('flipped');
  });

  // Keyboard accessibility
  wrapper.setAttribute('tabindex', '0');
  wrapper.setAttribute('role', 'button');
  wrapper.setAttribute('aria-label', `Flash card: ${word.word_gurmukhi} — ${word.meaning}`);

  wrapper.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      wrapper.classList.toggle('flipped');
    }
  });

  return wrapper;
}

// ── Create Alternate Card (New Template) ──────────────────
function createAltCardElement(wrapper, word) {
  // ── Alt Front ────────────────────────────────────────
  const front = document.createElement('div');
  front.className = 'card-face card-front-alt';

  front.innerHTML = `
    <div class="card-alt-header">Gurbani Learning Cards</div>
    
    <div class="card-alt-center">
      <div class="card-gurmukhi-large" lang="pa">${escapeHtml(word.word_gurmukhi)}</div>
      <div class="card-transliteration-large">${escapeHtml(word.transliteration || '')}</div>
    </div>

    <div class="card-alt-footer">www.365GurbaniWords.com</div>
    <div class="card-flip-hint">tap to flip ↻</div>
  `;

  // ── Alt Back ─────────────────────────────────────────
  const back = document.createElement('div');
  back.className = 'card-face card-back'; // Reuse base back styles for background

  back.innerHTML = `
    <div class="card-back-accent"></div>
    
    <div class="card-back-header">
      <div class="card-back-meaning card-back-meaning-alt">${escapeHtml(word.meaning)}</div>
    </div>

    <div class="card-back-body card-back-body-alt">
      <!-- Image on back -->
      <div class="card-back-alt-image">
        ${buildImageHtml(word)}
      </div>
      <!-- Description -->
      <p class="card-description">${escapeHtml(word.description)}</p>
    </div>

    <div class="card-back-footer">
      <div class="card-back-tap">↩ tap to flip back</div>
    </div>
  `;

  const inner = document.createElement('div');
  inner.className = 'card-inner';
  inner.appendChild(front);
  inner.appendChild(back);

  wrapper.appendChild(inner);
  attachFlipEvents(wrapper); // Helper to attach events

  return wrapper;
}

// ── Build image HTML with fallback ────────────────────────
function buildImageHtml(word) {
  if (!word.image) {
    return `
      <div class="card-img-placeholder">
        <div class="placeholder-icon">🖼️</div>
        <div class="placeholder-text">No image</div>
      </div>
    `;
  }

  const src = `images/${escapeHtml(word.image)}`;

  // We use onerror to show a placeholder if image fails to load
  return `
    <img
      src="${src}"
      alt="${escapeHtml(word.meaning)}"
      loading="lazy"
      onerror="this.parentElement.innerHTML = \`
        <div class='card-img-placeholder'>
          <div class='placeholder-icon'>🌼</div>
          <div class='placeholder-text'>${escapeHtml(word.meaning)}</div>
        </div>\`"
    />
  `;
}

// ── Update stats count ─────────────────────────────────────
function updateStats() {
  if (statsCount) {
    statsCount.textContent = `${displayWords.length} card${displayWords.length !== 1 ? 's' : ''}`;
  }
}

// ── Attach button event listeners ─────────────────────────
function attachButtonListeners() {

  // Print button
  // Search input
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      applyFiltersAndSort();
    });
  }

  const btnPrint = document.getElementById('btn-print');
  if (btnPrint) {
    btnPrint.addEventListener('click', triggerPrint);
  }

  // Shuffle button
  const btnShuffle = document.getElementById('btn-shuffle');
  if (btnShuffle) {
    btnShuffle.addEventListener('click', toggleShuffle);
  }

  // Toggle meanings button
  const btnMeanings = document.getElementById('btn-meanings');
  if (btnMeanings) {
    btnMeanings.addEventListener('click', toggleMeanings);
  }

  // Download PDF button
  const btnPdf = document.getElementById('btn-pdf');
  if (btnPdf) {
    btnPdf.addEventListener('click', downloadPdf);
  }

  // Dataset Toggle button
  const btnDataset = document.getElementById('btn-dataset');
  if (btnDataset) {
    btnDataset.addEventListener('click', toggleDataset);
  }

  // Template Toggle button
  const btnTemplate = document.getElementById('btn-template');
  if (btnTemplate) {
    btnTemplate.addEventListener('click', toggleTemplate);
  }

  // Colors Toggle button
  const btnColors = document.getElementById('btn-colors');
  if (btnColors) {
    btnColors.addEventListener('click', toggleColorMode);
  }

  // Image Visibility Toggle button
  const btnImages = document.getElementById('btn-images');
  if (btnImages) {
    btnImages.addEventListener('click', toggleImages);
  }

  // Flip all cards back before printing
  window.addEventListener('beforeprint', () => {
    document.querySelectorAll('.card-wrapper.flipped')
      .forEach(c => c.classList.remove('flipped'));
  });
}

// ── Helper: Attach flip events ─────────────────────────────
function attachFlipEvents(wrapper) {
  wrapper.addEventListener('click', () => {
    wrapper.classList.toggle('flipped');
  });

  wrapper.setAttribute('tabindex', '0');
  wrapper.setAttribute('role', 'button');
  
  wrapper.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      wrapper.classList.toggle('flipped');
    }
  });
}

// ── Print flash cards ──────────────────────────────────────
function triggerPrint() {
  // Flip all cards to front before printing
  document.querySelectorAll('.card-wrapper.flipped')
    .forEach(c => c.classList.remove('flipped'));

  showToast('📄 Opening print dialog…');

  // Short delay to let the DOM settle
  setTimeout(() => window.print(), 250);
}

// ── Download as PDF (uses browser print to PDF) ───────────
function downloadPdf() {
  showToast('💾 Use "Save as PDF" in the print dialog');
  setTimeout(() => {
    document.querySelectorAll('.card-wrapper.flipped')
      .forEach(c => c.classList.remove('flipped'));
    window.print();
  }, 600);
}

// ── Shuffle toggle ─────────────────────────────────────────
function toggleShuffle() {
  isShuffled = !isShuffled;
  const btn = document.getElementById('btn-shuffle');

  if (isShuffled) {
    btn.classList.add('active');
    btn.innerHTML = '🔀 Shuffled';
    showToast('🔀 Cards shuffled!');
  } else {
    btn.classList.remove('active');
    btn.innerHTML = '🔀 Shuffle';
    showToast('↩ Cards reset to original order');
  }

  applyFiltersAndSort();
}

// ── Dataset toggle ─────────────────────────────────────────
function toggleDataset() {
  const btn = document.getElementById('btn-dataset');
  
  if (currentDataFile === 'words.json') {
    currentDataFile = 'words-365.json';
    if (btn) btn.innerHTML = '📚 List: 365';
    if (btn) btn.classList.add('active');
    showToast('📚 Loading 365 Words list...');
  } else {
    currentDataFile = 'words.json';
    if (btn) btn.innerHTML = '📚 List: Basic';
    if (btn) btn.classList.remove('active');
    showToast('📚 Loading Basic Words list...');
  }

  loadWords();
}

// ── Template toggle ────────────────────────────────────────
function toggleTemplate() {
  currentDesign = (currentDesign + 1) % 3;
  const btn = document.getElementById('btn-template');
  const names = ['Visual Design (Default)', 'Text Design', 'Classic Design'];

  btn.classList.toggle('active', currentDesign !== 0);
  showToast(`🎨 Switched to ${names[currentDesign]}`);

  renderCards();
}

// ── Color mode toggle ──────────────────────────────────────
function toggleColorMode() {
  isColorMode = !isColorMode;
  const btn = document.getElementById('btn-colors');

  if (isColorMode) {
    cardsGrid.classList.add('rainbow-mode');
    btn.classList.add('active');
  } else {
    cardsGrid.classList.remove('rainbow-mode');
    btn.classList.remove('active');
  }
}

// ── Toggle image visibility ────────────────────────────────
function toggleImages() {
  isImageHidden = !isImageHidden;
  const btn = document.getElementById('btn-images');
  const body = document.body;

  if (isImageHidden) {
    body.classList.add('hide-images');
    btn.classList.add('active');
    btn.innerHTML = '🖼️ Show Images';
    showToast('🖼️ Images hidden');
  } else {
    body.classList.remove('hide-images');
    btn.classList.remove('active');
    btn.innerHTML = '🖼️ Hide Images';
    showToast('🖼️ Images visible');
  }
}

// ── Toggle meanings visibility ─────────────────────────────
function toggleMeanings() {
  isMeaningsHidden = !isMeaningsHidden;
  const btn = document.getElementById('btn-meanings');

  if (isMeaningsHidden) {
    document.body.classList.add('hide-meanings');
    btn.classList.add('active');
    btn.innerHTML = '👁️ Show Meanings';
    showToast('🙈 Meanings hidden — test yourself!');
  } else {
    document.body.classList.remove('hide-meanings');
    btn.classList.remove('active');
    btn.innerHTML = '👁️ Hide Meanings';
    showToast('👁️ Meanings visible');
  }
}

// ── Fisher-Yates shuffle ───────────────────────────────────
function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ── Show/hide loading state ────────────────────────────────
function showLoading(visible) {
  if (loadingState) {
    loadingState.style.display = visible ? 'block' : 'none';
  }
}

// ── Show error state ───────────────────────────────────────
function showError(message) {
  if (errorState) {
    errorState.style.display = 'block';
    const msgEl = errorState.querySelector('.error-message');
    if (msgEl) msgEl.textContent = message;
  }
}

// ── Toast notification ─────────────────────────────────────
function showToast(message) {
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add('show');

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('show');
  }, 2800);
}

// ── Escape HTML to prevent XSS ────────────────────────────
function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#39;');
}