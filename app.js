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

// ── Game State ─────────────────────────────────────────────
let gameState = {
  active: false,
  gridSize: 3,
  mode: 1,
  cards: [],
  flippedCards: [],
  matchedPairs: 0,
  totalPairs: 0,
  locked: false
};

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
  
  wrapper.setAttribute('aria-label', `Flash card: ${word.word_gurmukhi} — ${word.meaning}`);
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

  // Accessibility specific to content
  wrapper.setAttribute('aria-label', `Flash card: ${word.word_gurmukhi} — ${word.meaning}`);
  attachFlipEvents(wrapper);

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
  
  wrapper.setAttribute('aria-label', `Flash card: ${word.word_gurmukhi} — ${word.meaning}`);
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

  // Game Button (Opens Setup)
  const btnGame = document.getElementById('btn-game');
  if (btnGame) {
    btnGame.addEventListener('click', openGameSetup);
  }

  // Game Setup Actions
  document.getElementById('game-grid-size')?.addEventListener('change', checkGameSizeAvailability);
  document.getElementById('btn-start-game')?.addEventListener('click', startGame);
  document.getElementById('btn-cancel-game')?.addEventListener('click', closeGameSetup);
  document.getElementById('btn-exit-game')?.addEventListener('click', exitGame);
  
  // Match Modal Close
  document.getElementById('btn-close-match')?.addEventListener('click', () => {
    document.getElementById('game-match-modal').classList.add('hidden');
    // If game over?
    if (gameState.matchedPairs === gameState.totalPairs) {
      showToast('🎉 You won! Starting new game...');
      setTimeout(() => openGameSetup(), 1500);
    }
  });

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
    showToast('📚 Loading 365 Words list...');
  } else if (currentDataFile === 'words-365.json') {
    currentDataFile = 'words-treasure.json';
    if (btn) btn.innerHTML = '📚 List: Treasure';
    showToast('📚 Loading Treasure Words list...');
  } else {
    currentDataFile = 'words.json';
    if (btn) btn.innerHTML = '📚 List: Basic';
    showToast('📚 Loading Basic Words list...');
  }

  // Toggle active class if we are not on the default basic list
  if (btn) {
    btn.classList.toggle('active', currentDataFile !== 'words.json');
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

// ============================================================
// MEMORY GAME LOGIC
// ============================================================

// ── Open Setup Modal ───────────────────────────────────────
function openGameSetup() {
  const modal = document.getElementById('game-setup-modal');
  modal.classList.remove('hidden');
  
  // Reset dropdown to default 3
  const select = document.getElementById('game-grid-size');
  select.value = "3";
  
  checkGameSizeAvailability();
}

function closeGameSetup() {
  document.getElementById('game-setup-modal').classList.add('hidden');
}

// ── Validate Available Words ───────────────────────────────
function checkGameSizeAvailability() {
  const size = parseInt(document.getElementById('game-grid-size').value);
  const totalCells = size * size;
  // For odd grids (9, 25), we use 1 center logo, so pairs = (total-1)/2
  // For even grids (16, 36), pairs = total/2
  const pairsNeeded = Math.floor(totalCells / 2);
  
  const startBtn = document.getElementById('btn-start-game');
  const warning = document.getElementById('game-size-warning');
  
  // Check availability based on allWords (full loaded list)
  if (allWords.length < pairsNeeded) {
    startBtn.disabled = true;
    warning.textContent = `Not enough words! Need ${pairsNeeded}, have ${allWords.length}.`;
  } else {
    startBtn.disabled = false;
    warning.textContent = "";
  }
}

// ── Start Game ─────────────────────────────────────────────
function startGame() {
  closeGameSetup();
  
  const size = parseInt(document.getElementById('game-grid-size').value);
  const mode = parseInt(document.getElementById('game-mode').value);
  
  gameState = {
    active: true,
    gridSize: size,
    mode: mode,
    cards: [],
    flippedCards: [],
    matchedPairs: 0,
    totalPairs: Math.floor((size * size) / 2),
    locked: false
  };

  // Hide Main Grid, Show Game Board
  document.getElementById('cards-grid').classList.add('hidden');
  document.getElementById('stats-bar').classList.add('hidden');
  document.getElementById('game-board').classList.remove('hidden');
  document.getElementById('game-pairs-count').textContent = '0';

  generateGameGrid();
}

// ── Generate Grid & Cards ──────────────────────────────────
function generateGameGrid() {
  const gridEl = document.getElementById('game-grid');
  gridEl.innerHTML = '';
  gridEl.className = `game-grid grid-${gameState.gridSize}`;

  // 1. Select Random Words
  // Shuffle all words first, then slice
  const shuffledWords = [...allWords].sort(() => 0.5 - Math.random());
  const selectedWords = shuffledWords.slice(0, gameState.totalPairs);

  // 2. Create Pairs
  let deck = [];
  selectedWords.forEach(word => {
    // Card A
    deck.push({ 
      id: word.word_gurmukhi, // Unique identifier for match
      content: word.word_gurmukhi,
      type: 'gurmukhi',
      data: word 
    });
    
    // Card B
    if (gameState.mode === 1) {
      // Mode 1: Match Gurmukhi to Gurmukhi
      deck.push({ 
        id: word.word_gurmukhi, 
        content: word.word_gurmukhi, 
        type: 'gurmukhi',
        data: word 
      });
    } else {
      // Mode 2: Match Gurmukhi to English Meaning
      deck.push({ 
        id: word.word_gurmukhi, 
        content: word.meaning, 
        type: 'english',
        data: word 
      });
    }
  });

  // 3. Handle Odd Grid Center (e.g. 3x3=9, 5x5=25)
  // We have 8 cards for 3x3, need 9th.
  const totalCells = gameState.gridSize * gameState.gridSize;
  if (totalCells % 2 !== 0) {
    deck.push({ type: 'logo', id: 'logo' });
  }

  // 4. Shuffle Deck
  deck.sort(() => 0.5 - Math.random());

  // 5. If odd grid, ensure logo is in the exact center? 
  // Usually standard shuffle is fine, but center looks nicer.
  if (totalCells % 2 !== 0) {
    // Find logo and swap with center index
    const logoIndex = deck.findIndex(c => c.type === 'logo');
    const centerIndex = Math.floor(totalCells / 2);
    [deck[logoIndex], deck[centerIndex]] = [deck[centerIndex], deck[logoIndex]];
  }

  // 6. Render
  deck.forEach((card, index) => {
    const el = document.createElement('div');
    el.className = 'memory-card';
    el.dataset.index = index;

    if (card.type === 'logo') {
      el.classList.add('static-logo');
      el.innerHTML = `
        <div class="memory-card-inner">
          <div class="mem-face" style="background:var(--navy); color:var(--white); font-size:1.5rem;">☬</div>
        </div>`;
    } else {
      el.innerHTML = `
        <div class="memory-card-inner">
          <div class="mem-face mem-front">?</div>
          <div class="mem-face mem-back" lang="${card.type === 'gurmukhi' ? 'pa' : 'en'}">
            ${card.content}
          </div>
        </div>
      `;
      el.addEventListener('click', () => handleCardFlip(el, card));
    }
    gridEl.appendChild(el);
  });
}

// ── Handle Flip ────────────────────────────────────────────
function handleCardFlip(el, cardData) {
  if (gameState.locked) return;
  if (el.classList.contains('flipped')) return; // Already flipped
  if (el.classList.contains('matched')) return; // Already matched

  // Flip it
  el.classList.add('flipped');
  gameState.flippedCards.push({ element: el, data: cardData });

  // Check if 2 cards are flipped
  if (gameState.flippedCards.length === 2) {
    gameState.locked = true;
    checkForMatch();
  }
}

// ── Check Match ────────────────────────────────────────────
function checkForMatch() {
  const [c1, c2] = gameState.flippedCards;
  
  // Match condition: Same ID (word key)
  const isMatch = c1.data.id === c2.data.id;

  if (isMatch) {
    // MATCH FOUND
    gameState.matchedPairs++;
    document.getElementById('game-pairs-count').textContent = gameState.matchedPairs;
    
    // Visually mark matched
    setTimeout(() => {
      c1.element.classList.add('matched');
      c2.element.classList.add('matched');
      
      // Show Zoom Modal
      showMatchModal(c1.data.data); // pass the full word object
      
      // Reset
      gameState.flippedCards = [];
      gameState.locked = false;
    }, 600);

  } else {
    // NO MATCH
    setTimeout(() => {
      c1.element.classList.remove('flipped');
      c2.element.classList.remove('flipped');
      gameState.flippedCards = [];
      gameState.locked = false;
    }, 1200);
  }
}

// ── Show Match Modal ───────────────────────────────────────
function showMatchModal(word) {
  const container = document.getElementById('match-card-container');
  container.innerHTML = '';
  
  // Reuse the existing createCardElement but force it to be flipped/visible
  // We'll use the "Classic" design for the modal as it has the most info compactly
  // Or we can use the current design. Let's use Classic for clarity of info.
  
  // Temporarily force design 2 (Classic) for this render
  const savedDesign = currentDesign;
  currentDesign = 2; 
  const card = createCardElement(word, 0);
  currentDesign = savedDesign; // Restore

  // Force visual state to show "Back" (Meaning) immediately or handle flip?
  // Logic: User matched them, so they know the word. Let's show the full card.
  // We'll simulate a flip so they see the meaning side which has description + image
  card.classList.add('flipped');
  
  container.appendChild(card);
  
  document.getElementById('game-match-modal').classList.remove('hidden');
}

// ── Exit Game ──────────────────────────────────────────────
function exitGame() {
  gameState.active = false;
  // Hide Game, Show Main
  document.getElementById('game-board').classList.add('hidden');
  document.getElementById('cards-grid').classList.remove('hidden');
  document.getElementById('stats-bar').classList.remove('hidden');
  
  // Re-render main list to ensure state is clean
  renderCards();
}