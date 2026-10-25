'use strict';

const STORAGE_KEY = 'placar:v1';
const LONG_PRESS_MS = 500;
const MOVE_TOLERANCE_PX = 12;
const SWIPE_PX = 40;
const REPEAT_START_MS = 250;
const REPEAT_MIN_MS = 80;
const REPEAT_ACCEL = 0.85;

const PALETTE = [
  '#e53935', '#fb8c00', '#fdd835', '#43a047', '#00897b',
  '#1e88e5', '#5e35b1', '#d81b60', '#f5f5f5', '#212121',
];

const DEFAULT_STATE = {
  teams: [
    { name: 'Time A', color: '#1e88e5', score: 0 },
    { name: 'Time B', color: '#e53935', score: 0 },
  ],
  swapped: false,
};

const board = document.getElementById('board');
const sections = [...document.querySelectorAll('.team')];
const dialog = document.getElementById('settings');

let state = load();

// --- Estado ---

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && Array.isArray(saved.teams) && saved.teams.length === 2) {
      return {
        swapped: !!saved.swapped,
        teams: saved.teams.map((t, i) => ({ ...DEFAULT_STATE.teams[i], ...t })),
      };
    }
  } catch {
    // sem armazenamento disponível: segue com o padrão
  }
  return structuredClone(DEFAULT_STATE);
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignora (modo privado, cota cheia etc.)
  }
}

// --- Renderização ---

function textColorFor(hex) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.4 ? '#111' : '#fff';
}

function render() {
  board.classList.toggle('swapped', state.swapped);
  sections.forEach((section, i) => {
    const team = state.teams[i];
    const score = section.querySelector('.score');
    section.style.setProperty('--bg', team.color);
    section.style.setProperty('--fg', textColorFor(team.color));
    section.querySelector('.name').textContent = team.name;
    score.textContent = team.score;
    score.classList.toggle('long', team.score >= 100);
  });
}

function changeScore(i, delta) {
  const team = state.teams[i];
  const next = Math.max(0, team.score + delta);
  if (next === team.score) return;
  team.score = next;
  save();
  render();

  const score = sections[i].querySelector('.score');
  const cls = delta > 0 ? 'bump' : 'drop';
  score.classList.remove('bump', 'drop');
  void score.offsetWidth; // reinicia a animação
  score.classList.add(cls);
}

// --- Gestos ---
// toque ou arrastar para cima = +1, arrastar para baixo = -1,
// segurar = vai tirando pontos até soltar ou chegar a 0

sections.forEach((section, i) => {
  let press = null;

  function end() {
    if (!press) return;
    clearTimeout(press.timer);
    press = null;
    section.classList.remove('pressing');
  }

  function repeatDecrement(delay) {
    press.repeating = true;
    changeScore(i, -1);
    if (state.teams[i].score === 0) {
      navigator.vibrate?.(120);
      clearTimeout(press.timer);
      return;
    }
    navigator.vibrate?.(15);
    const next = Math.max(REPEAT_MIN_MS, delay * REPEAT_ACCEL);
    press.timer = setTimeout(() => repeatDecrement(next), delay);
  }

  section.addEventListener('pointerdown', (e) => {
    if (press) return;
    try {
      section.setPointerCapture(e.pointerId);
    } catch {
      // ponteiro já inativo: segue sem captura
    }
    press = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      repeating: false,
      timer: setTimeout(() => {
        if (state.teams[i].score > 0) repeatDecrement(REPEAT_START_MS);
      }, LONG_PRESS_MS),
    };
    section.classList.add('pressing');
    keepAwake();
  });

  section.addEventListener('pointermove', (e) => {
    if (!press || e.pointerId !== press.id || press.repeating) return;
    if (Math.hypot(e.clientX - press.x, e.clientY - press.y) > MOVE_TOLERANCE_PX) {
      clearTimeout(press.timer);
    }
  });

  section.addEventListener('pointerup', (e) => {
    if (!press || e.pointerId !== press.id) return;
    const { repeating, x, y } = press;
    end();
    if (repeating) return;

    const dx = e.clientX - x;
    const dy = e.clientY - y;
    if (Math.abs(dy) >= SWIPE_PX && Math.abs(dy) > Math.abs(dx)) {
      changeScore(i, dy < 0 ? +1 : -1);
    } else if (Math.hypot(dx, dy) <= MOVE_TOLERANCE_PX) {
      changeScore(i, +1);
    }
  });

  section.addEventListener('pointercancel', end);
  section.addEventListener('contextmenu', (e) => e.preventDefault());
});

// --- Controles ---

document.getElementById('btn-reset').addEventListener('click', () => {
  if (!confirm('Zerar o placar?')) return;
  state.teams.forEach((t) => (t.score = 0));
  save();
  render();
});

document.getElementById('btn-swap').addEventListener('click', () => {
  state.swapped = !state.swapped;
  save();
  render();
});

document.getElementById('btn-settings').addEventListener('click', openSettings);

// --- Configuração dos times ---

const configs = [...dialog.querySelectorAll('.team-config')];

configs.forEach((fieldset, i) => {
  const input = fieldset.querySelector('input');
  const palette = fieldset.querySelector('.palette');

  PALETTE.forEach((color) => {
    const swatch = document.createElement('button');
    swatch.type = 'button';
    swatch.className = 'swatch';
    swatch.role = 'radio';
    swatch.dataset.color = color;
    swatch.style.background = color;
    swatch.setAttribute('aria-label', color);
    swatch.addEventListener('click', () => {
      state.teams[i].color = color;
      save();
      render();
      syncSwatches(palette, color);
    });
    palette.appendChild(swatch);
  });

  input.addEventListener('input', () => {
    state.teams[i].name = input.value.trim() || DEFAULT_STATE.teams[i].name;
    save();
    render();
  });
});

function syncSwatches(palette, selected) {
  palette.querySelectorAll('.swatch').forEach((s) => {
    s.setAttribute('aria-checked', String(s.dataset.color === selected));
  });
}

function openSettings() {
  configs.forEach((fieldset, i) => {
    fieldset.querySelector('input').value = state.teams[i].name;
    syncSwatches(fieldset.querySelector('.palette'), state.teams[i].color);
  });
  dialog.showModal();
}

// --- Manter a tela acesa ---

let wakeLock = null;

async function keepAwake() {
  if (wakeLock || !('wakeLock' in navigator) || document.visibilityState !== 'visible') return;
  try {
    wakeLock = await navigator.wakeLock.request('screen');
    wakeLock.addEventListener('release', () => (wakeLock = null));
  } catch {
    wakeLock = null;
  }
}

document.addEventListener('visibilitychange', keepAwake);

// --- Início ---

render();
keepAwake();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
