/**
 * myArena Royalty - Frontend Client Application
 * Handles routing, canvas 2.5D/3D board rendering, Web Audio synthesis, and network synchronization.
 */

(function () {
  'use strict';

  // =========================================================================
  // 1. PROCEDURAL SOUND SYNTHESIZER (WEB AUDIO API)
  // =========================================================================
  
  // Safe Storage wrapper for data: URLs and strict sandboxes
  const memoryStore = {};
  const safeStorage = {
    getItem: function (key) {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          return window.localStorage.getItem(key);
        }
      } catch (e) {}
      return memoryStore[key] || null;
    },
    setItem: function (key, val) {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(key, String(val));
        }
      } catch (e) {}
      memoryStore[key] = String(val);
    },
    removeItem: function (key) {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(key);
        }
      } catch (e) {}
      delete memoryStore[key];
    }
  };

  class SoundSynth {
    constructor() {
      this.ctx = null;
      this.muted = safeStorage.getItem('myarena_muted') === 'true';
    }

    init() {
      if (!this.ctx && typeof AudioContext !== 'undefined') {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioCtx();
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }

    playDiceRoll() {
      if (this.muted) return;
      this.init();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      for (let i = 0; i < 4; i++) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(180 + Math.random() * 120, now + i * 0.08);
        gain.gain.setValueAtTime(0.15, now + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.08 + 0.07);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.08);
      }
    }

    playMove() {
      if (this.muted) return;
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(660, this.ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.13);
    }

    playCapture() {
      if (this.muted) return;
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.25);
      gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.26);
    }

    playLadder() {
      if (this.muted) return;
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      [330, 440, 550, 660, 880].forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);
        gain.gain.setValueAtTime(0.12, now + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.06 + 0.1);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 0.11);
      });
    }

    playSnake() {
      if (this.muted) return;
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      [600, 500, 400, 300, 200].forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now + idx * 0.07);
        gain.gain.setValueAtTime(0.14, now + idx * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.07 + 0.09);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + idx * 0.07);
        osc.stop(now + idx * 0.07 + 0.1);
      });
    }

    playBallDraw() {
      if (this.muted) return;
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, this.ctx.currentTime); // C5
      osc.frequency.setValueAtTime(659.25, this.ctx.currentTime + 0.08); // E5
      gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.26);
    }

    playVictory() {
      if (this.muted) return;
      this.init();
      if (!this.ctx) return;
      const notes = [523.25, 659.25, 783.99, 1046.5];
      const now = this.ctx.currentTime;
      notes.forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.12);
        gain.gain.setValueAtTime(0.2, now + i * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.12 + 0.35);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + i * 0.12);
        osc.stop(now + i * 0.12 + 0.36);
      });
    }
  }

  const sound = new SoundSynth();

  // =========================================================================
  // 2. STATE & CONFIGURATION
  // =========================================================================
  const state = {
    view: 'landing', // 'landing' | 'lobby' | 'game'
    user: {
      name: safeStorage.getItem('myarena_name') || 'Noble Player',
      heroId: safeStorage.getItem('myarena_hero') || 'iron_man'
    },
    room: null,
    isHost: false,
    playerId: null,
    reconnectToken: null,
    isSolo: false,
    gameType: 'ludo',
    effects3D: safeStorage.getItem('myarena_3d') !== 'false',
    sseSource: null,
    tambolaAutoTimer: null,
    currentGameId: null,
    lastActivityKey: null,
    resultsGameId: null,
    sseDisconnected: false,
    aiTimer: null,
    checkpoint: null,
    recovering: null,
    keepaliveTimer: null,
    tambolaSetup: null
  };

  // Announce to Screen Reader
  function announceSR(text) {
    const el = document.getElementById('srAnnouncer');
    if (el) el.textContent = text;
  }

  // Toast Notification
  function showToast(msg) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast-msg';
    toast.textContent = msg;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  function escapeHTML(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // View Navigation
  function switchView(viewName) {
    state.view = viewName;
    document.querySelectorAll('.view-panel').forEach(p => p.classList.remove('active'));
    if (viewName === 'landing') document.getElementById('viewLanding').classList.add('active');
    if (viewName === 'lobby') document.getElementById('viewLobby').classList.add('active');
    if (viewName === 'game') document.getElementById('viewGame').classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // =========================================================================
  // 3. MODAL CONTROLS
  // =========================================================================
  function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('active');
  }

  function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('active');
  }

  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => {
      closeModal(btn.getAttribute('data-close'));
    });
  });

  // =========================================================================
  // 4. USER IDENTITY & HERO SELECTION
  // =========================================================================
  function updateNavProfile() {
    document.getElementById('navUserName').textContent = state.user.name;
    const icons = { iron_man: '⚛', captain_america: '★', hulk: '✊', thor: '⚡' };
    document.getElementById('userAvatarIcon').textContent = icons[state.user.heroId] || '👑';
  }

  function setupHeroPickers() {
    ['createHeroSelector', 'joinHeroSelector'].forEach(gridId => {
      const grid = document.getElementById(gridId);
      if (!grid) return;
      grid.querySelectorAll('.hero-card').forEach(card => {
        card.addEventListener('click', () => {
          grid.querySelectorAll('.hero-card').forEach(c => c.classList.remove('selected'));
          card.classList.add('selected');
          state.user.heroId = card.getAttribute('data-hero');
          safeStorage.setItem('myarena_hero', state.user.heroId);
          updateNavProfile();
        });
      });
    });
  }

  // =========================================================================
  // 5. RULE PRESETS CONFIGURATOR (MODAL)
  // =========================================================================
  function renderRuleConfig(gameType) {
    const container = document.getElementById('ruleVariantsContent');
    if (!container) return;

    if (gameType === 'ludo') {
      container.innerHTML = `
        <div class="rule-row">
          <span>Entry Roll Requirement</span>
          <select id="ruleLudoEntry" class="input-select" style="min-height:36px; padding:4px 8px;">
            <option value="six_only" selected>Six Only (Standard)</option>
            <option value="six_or_one">Six or One (Casual Fast)</option>
          </select>
        </div>
        <div class="rule-row">
          <span>Bonus Roll on Six</span>
          <input type="checkbox" id="ruleLudoBonusSix" checked style="width:20px; height:20px;">
        </div>
        <div class="rule-row">
          <span>Three Consecutive Sixes Penalty</span>
          <input type="checkbox" id="ruleLudoThreeSixes" checked style="width:20px; height:20px;">
        </div>
        <div class="rule-row">
          <span>Capture Bonus Turn</span>
          <input type="checkbox" id="ruleLudoCaptureBonus" checked style="width:20px; height:20px;">
        </div>
        <div class="rule-row">
          <span>Star Safe Squares</span>
          <input type="checkbox" id="ruleLudoSafeSquares" checked style="width:20px; height:20px;">
        </div>
        <div class="rule-row">
          <span>Exact Home Finish</span>
          <input type="checkbox" id="ruleLudoExactFinish" checked style="width:20px; height:20px;">
        </div>
      `;
    } else if (gameType === 'snakes') {
      container.innerHTML = `
        <div class="rule-row">
          <span>Finish Behavior</span>
          <select id="ruleSnakesFinish" class="input-select" style="min-height:36px; padding:4px 8px;">
            <option value="exact_stay" selected>Exact Roll (Stay if overshot)</option>
            <option value="exact_bounce">Exact Roll with Bounce Back</option>
            <option value="overshoot_wins">Overshoot Wins Immediately</option>
          </select>
        </div>
        <div class="rule-row">
          <span>Board Visual Theme</span>
          <select id="ruleSnakesTheme" class="input-select" style="min-height:36px; padding:4px 8px;">
            <option value="royal_gold" selected>Royal Arena Gold</option>
            <option value="mystic_palace">Mystic Palace Emerald</option>
            <option value="cyber_arena">Cyber Sapphire</option>
          </select>
        </div>
        <div class="rule-row">
          <span>Bonus Turn on Rolling 6</span>
          <input type="checkbox" id="ruleSnakesBonusSix" checked style="width:20px; height:20px;">
        </div>
      `;
    } else if (gameType === 'tambola') {
      container.innerHTML = `
        <div class="rule-row">
          <span>Caller &amp; Winning Patterns</span>
          <button type="button" class="btn btn-royal" id="btnCreateTambolaSetup" style="min-height:36px; padding:6px 14px;">🎯 Game Setup</button>
        </div>
        <div id="createTambolaSummary" style="padding-top:6px;">${tambolaSetupSummaryHTML(getTambolaSetup())}</div>
      `;
      document.getElementById('btnCreateTambolaSetup').addEventListener('click', () => {
        openTambolaSetup(getTambolaSetup(), setup => {
          state.tambolaSetup = setup;
          document.getElementById('createTambolaSummary').innerHTML = tambolaSetupSummaryHTML(setup);
        });
      });
    }

  }

  function updatePlayerCapacityOptions(gameType) {
    const select = document.getElementById('selectMaxPlayers');
    const maxPlayers = gameType === 'tambola' ? 50 : 4;
    Array.from(select.options).forEach(option => {
      option.disabled = Number(option.value) > maxPlayers;
    });
    if (Number(select.value) > maxPlayers) {
      select.value = String(maxPlayers);
    }
  }

  // =========================================================================
  // TAMBOLA GAME SETUP (host / caller)
  // One modal serves both "before creating a room" and "in the lobby"; the caller of
  // openTambolaSetup decides what saving means.
  // =========================================================================
  const TAMBOLA_CATEGORY_ORDER = ['All', 'Quick', 'Lines', 'Corners', 'Shapes', 'Letters', 'Columns', 'Values', 'Digits', 'Full House'];
  const tambolaSetupDraft = { selected: new Set(), category: 'All', query: '', onSave: null };

  function tambolaCatalog() {
    return window.TambolaEngine.PATTERN_CATALOG;
  }

  function defaultTambolaSetup() {
    return {
      patternIds: window.TambolaEngine.DEFAULT_PATTERN_IDS.slice(),
      callerRole: 'HOST',
      autoIntervalSeconds: 7
    };
  }

  function getTambolaSetup() {
    if (!state.tambolaSetup) state.tambolaSetup = defaultTambolaSetup();
    return state.tambolaSetup;
  }

  const TAMBOLA_PRESETS = {
    classic: () => window.TambolaEngine.DEFAULT_PATTERN_IDS,
    popular: () => tambolaCatalog().filter(p => p.popularity >= 4).map(p => p.id),
    party: () => tambolaCatalog().filter(p => p.popularity >= 3).map(p => p.id),
    all: () => tambolaCatalog().map(p => p.id),
    none: () => []
  };

  function patternStarsHTML(popularity) {
    const filled = '★'.repeat(popularity);
    const empty = '★'.repeat(5 - popularity);
    return `<span class="pattern-stars" title="Popularity ${popularity} of 5" aria-label="Popularity ${popularity} of 5">${filled}<span class="dim">${empty}</span></span>`;
  }

  // A tiny ticket diagram for shape patterns, or a short badge for value-based ones.
  function patternPreviewHTML(patternId) {
    const definition = tambolaCatalog().find(p => p.id === patternId);
    if (!definition) return '';
    const rule = definition.rule;
    const grid = (cols, isOn) => {
      let cells = '';
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < cols; c++) cells += `<span class="${isOn(r, c) ? 'on' : ''}"></span>`;
      }
      return `<div class="pattern-preview ${cols === 9 ? 'cols-9' : ''}" style="grid-template-columns: repeat(${cols}, auto);" aria-hidden="true">${cells}</div>`;
    };
    switch (rule.type) {
      case 'lines': return grid(5, (r, c) => rule.lines[r].includes(c));
      case 'full_house': return grid(5, () => true);
      case 'any_lines': return grid(5, r => r < rule.count);
      case 'columns': return grid(9, (r, c) => rule.columns.includes(c));
      case 'count': return `<span class="pattern-badge">Any ${rule.count}</span>`;
      case 'extremes':
        if (rule.low && rule.high) return `<span class="pattern-badge">${rule.low} low + ${rule.high} high</span>`;
        return `<span class="pattern-badge">${rule.low ? `${rule.low} lowest` : `${rule.high} highest`}</span>`;
      case 'values':
        if (rule.test === 'odd') return '<span class="pattern-badge">Odd #s</span>';
        if (rule.test === 'even') return '<span class="pattern-badge">Even #s</span>';
        if (rule.test === 'digit') return `<span class="pattern-badge">Has ${rule.digit}</span>`;
        return `<span class="pattern-badge">${rule.min}–${rule.max}</span>`;
      default: return '';
    }
  }

  function tambolaSetupSummaryHTML(setup, maxChips = 8) {
    const byId = new Map(tambolaCatalog().map(p => [p.id, p]));
    const names = setup.patternIds.map(id => byId.get(id)).filter(Boolean).map(p => p.name);
    const caller = setup.callerRole === 'AUTO' ? `Auto caller · every ${setup.autoIntervalSeconds}s` : 'Manual caller';
    const chips = names.slice(0, maxChips).map(name => `<span class="meta-tag">${escapeHTML(name)}</span>`).join('');
    const more = names.length > maxChips ? `<span class="meta-tag">+${names.length - maxChips} more</span>` : '';
    return `
      <div style="font-size:0.85rem; color:var(--text-main);">
        <strong>${names.length}</strong> winning pattern${names.length === 1 ? '' : 's'} · ${escapeHTML(caller)}
      </div>
      <div class="setup-summary-chips">${chips}${more}</div>
    `;
  }

  function openTambolaSetup(setup, onSave) {
    tambolaSetupDraft.selected = new Set(setup.patternIds);
    tambolaSetupDraft.category = 'All';
    tambolaSetupDraft.query = '';
    tambolaSetupDraft.onSave = onSave;
    document.getElementById('setupCallerRole').value = setup.callerRole === 'AUTO' ? 'AUTO' : 'HOST';
    document.getElementById('setupAutoInterval').value = String(setup.autoIntervalSeconds || 7);
    document.getElementById('setupPatternSearch').value = '';
    renderTambolaSetup();
    openModal('modalTambolaSetup');
  }

  function renderTambolaSetup() {
    const draft = tambolaSetupDraft;
    document.getElementById('setupAutoInterval').disabled = document.getElementById('setupCallerRole').value !== 'AUTO';
    document.getElementById('setupPatternCount').textContent = `${draft.selected.size} of ${tambolaCatalog().length} selected`;

    const filters = document.getElementById('setupCategoryFilters');
    filters.innerHTML = TAMBOLA_CATEGORY_ORDER.map(category => `
      <button type="button" role="tab" class="setup-category ${draft.category === category ? 'active' : ''}"
        aria-selected="${draft.category === category}" data-category="${category}">${category}</button>
    `).join('');

    const query = draft.query.trim().toLowerCase();
    const visible = tambolaCatalog().filter(p =>
      (draft.category === 'All' || p.category === draft.category) &&
      (!query || `${p.name} ${p.aka} ${p.description} ${p.category}`.toLowerCase().includes(query))
    );
    const grid = document.getElementById('setupPatternGrid');
    grid.innerHTML = visible.length ? visible.map(p => `
      <label class="setup-pattern ${draft.selected.has(p.id) ? 'selected' : ''}" data-pattern="${p.id}">
        <input type="checkbox" value="${p.id}" ${draft.selected.has(p.id) ? 'checked' : ''} aria-label="${escapeHTML(p.name)}">
        <span>
          <span class="setup-pattern-name">${escapeHTML(p.name)}</span>
          <span class="setup-pattern-aka"> · ${escapeHTML(p.aka)}</span><br>
          ${patternStarsHTML(p.popularity)}
          <span class="setup-pattern-desc" style="display:block;">${escapeHTML(p.description)}</span>
        </span>
        ${patternPreviewHTML(p.id)}
      </label>
    `).join('') : '<div style="color:var(--text-muted); padding:12px;">No patterns match your search.</div>';
  }

  function wireTambolaSetup() {
    document.getElementById('setupPatternGrid').addEventListener('change', event => {
      const box = event.target;
      if (box.type !== 'checkbox') return;
      if (box.checked) tambolaSetupDraft.selected.add(box.value); else tambolaSetupDraft.selected.delete(box.value);
      renderTambolaSetup();
    });
    document.getElementById('setupCategoryFilters').addEventListener('click', event => {
      const button = event.target.closest('[data-category]');
      if (!button) return;
      tambolaSetupDraft.category = button.getAttribute('data-category');
      renderTambolaSetup();
    });
    document.getElementById('setupPatternSearch').addEventListener('input', event => {
      tambolaSetupDraft.query = event.target.value;
      renderTambolaSetup();
    });
    document.querySelectorAll('.setup-preset').forEach(button => {
      button.addEventListener('click', () => {
        tambolaSetupDraft.selected = new Set(TAMBOLA_PRESETS[button.getAttribute('data-preset')]());
        renderTambolaSetup();
      });
    });
    document.getElementById('setupCallerRole').addEventListener('change', renderTambolaSetup);
    document.getElementById('btnSaveTambolaSetup').addEventListener('click', async () => {
      if (tambolaSetupDraft.selected.size === 0) {
        showToast('Pick at least one winning pattern');
        return;
      }
      const setup = {
        patternIds: window.TambolaEngine.sanitizePatternIds(Array.from(tambolaSetupDraft.selected)),
        callerRole: document.getElementById('setupCallerRole').value,
        autoIntervalSeconds: Number(document.getElementById('setupAutoInterval').value)
      };
      try {
        if (tambolaSetupDraft.onSave) await tambolaSetupDraft.onSave(setup);
        closeModal('modalTambolaSetup');
      } catch (err) {
        showToast(err.message);
      }
    });
  }

  function getSelectedRules(gameType) {
    if (gameType === 'ludo') {
      return {
        entryRoll: document.getElementById('ruleLudoEntry')?.value === 'six_or_one' ? [1, 6] : [6],
        bonusOnSix: document.getElementById('ruleLudoBonusSix')?.checked ?? true,
        maxConsecutiveSixes: document.getElementById('ruleLudoThreeSixes')?.checked ? 3 : 0,
        bonusOnCapture: document.getElementById('ruleLudoCaptureBonus')?.checked ?? true,
        safeSquaresEnabled: document.getElementById('ruleLudoSafeSquares')?.checked ?? true,
        exactFinish: document.getElementById('ruleLudoExactFinish')?.checked ?? true
      };
    } else if (gameType === 'snakes') {
      return {
        finishMode: document.getElementById('ruleSnakesFinish')?.value || 'exact_stay',
        themeId: document.getElementById('ruleSnakesTheme')?.value || 'royal_gold',
        bonusOnSix: document.getElementById('ruleSnakesBonusSix')?.checked ?? true
      };
    } else if (gameType === 'tambola') {
      return Object.assign({}, getTambolaSetup());
    }
    return {};
  }

  // =========================================================================
  // 6. ROOM LIFECYCLE & MULTIPLAYER API
  // =========================================================================
  async function apiPost(endpoint, data, options = {}) {
    const headers = { 'Content-Type': 'application/json' };
    const token = options.token || state.reconnectToken;
    if (token) {
      headers['X-Reconnect-Token'] = token;
    }
    let res;
    try {
      res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(data)
      });
    } catch (networkErr) {
      throw new Error('Network unavailable. Retrying...');
    }
    let json;
    try {
      json = await res.json();
    } catch (parseErr) {
      // e.g. a host's "waking up" HTML page while the server instance restarts.
      const err = new Error('Server is starting up. Retrying...');
      err.status = res.status;
      err.transient = true;
      throw err;
    }
    if (json && json.checkpoint) {
      rememberCheckpoint(json.checkpoint, (data && data.roomCode) || json.roomCode);
    }
    if (!res.ok) {
      const err = new Error(json.error || 'Request failed');
      err.status = res.status;
      const forCurrentRoom = state.room && !state.isSolo && data && data.roomCode === state.room.code;
      if (!options.noRecover && forCurrentRoom && isRoomMissingError(err)) {
        if (await ensureRoomConnection()) {
          return apiPost(endpoint, data, Object.assign({}, options, { noRecover: true }));
        }
      }
      throw err;
    }
    return json;
  }

  // =========================================================================
  // CONNECTION RESILIENCE
  // Rooms live in server memory, which hosts like Render wipe on restarts, deploys and
  // idle spin-downs. Clients keep the server's latest encrypted checkpoint and use it to
  // rebuild the room, reconnect automatically, and ping so the instance stays awake.
  // =========================================================================
  const KEEPALIVE_MS = 4 * 60 * 1000;
  const MAX_RECONNECT_DELAY_MS = 15000;

  function isRoomMissingError(err) {
    return !!err && (err.status === 404 || /room not found|does not exist/i.test(err.message || ''));
  }

  function isPermanentError(err) {
    return !!err && !err.transient && typeof err.status === 'number' && err.status >= 400 && err.status < 500;
  }

  function checkpointStorageKey(roomCode) {
    return `myarena_cp_${roomCode}`;
  }

  function loadCheckpoint(roomCode) {
    if (state.checkpoint && state.checkpoint.code === roomCode) return state.checkpoint;
    try {
      const saved = JSON.parse(safeStorage.getItem(checkpointStorageKey(roomCode)) || 'null');
      return saved && saved.code === roomCode && saved.data ? saved : null;
    } catch (err) {
      return null;
    }
  }

  function rememberCheckpoint(checkpoint, roomCode) {
    const code = roomCode || (state.room && state.room.code);
    if (!checkpoint || !checkpoint.data || !code) return;
    const current = loadCheckpoint(code);
    if (current && current.version > checkpoint.version) return;
    state.checkpoint = { code, version: checkpoint.version, data: checkpoint.data };
    safeStorage.setItem(checkpointStorageKey(code), JSON.stringify(state.checkpoint));
  }

  function applyRoomSnapshot(room) {
    state.room = room;
    state.isHost = room.hostId === state.playerId;
    if ((room.status === 'IN_GAME' || room.status === 'FINISHED') && room.gameState) {
      if (state.view === 'game') {
        updateGameDisplay();
      } else {
        setupGameView();
        switchView('game');
      }
    } else {
      renderLobby();
      switchView('lobby');
    }
  }

  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Single-flight: concurrent callers share one recovery attempt.
  function ensureRoomConnection() {
    if (!state.room || state.isSolo || !state.reconnectToken) return Promise.resolve(false);
    if (state.recovering) return state.recovering;
    const roomCode = state.room.code;
    const stillHere = () => state.room && state.room.code === roomCode && !state.isSolo;

    state.recovering = (async () => {
      let wait = 1000;
      while (stillHere()) {
        try {
          await apiPost('/api/rooms/ping', { roomCode }, { noRecover: true });
          if (!state.sseSource || state.sseSource.readyState === EventSource.CLOSED) setupSSE(roomCode);
          return true;
        } catch (err) {
          if (isRoomMissingError(err)) {
            const checkpoint = loadCheckpoint(roomCode);
            if (!checkpoint) {
              abandonRoom('This room is no longer available on the server.');
              return false;
            }
            try {
              const result = await apiPost('/api/rooms/restore', { roomCode, checkpoint: checkpoint.data }, { noRecover: true });
              if (!stillHere()) return false;
              applyRoomSnapshot(result.room);
              setupSSE(roomCode);
              showToast(result.restored ? 'Server restarted - your game was restored' : 'Reconnected to your game');
              return true;
            } catch (restoreErr) {
              if (isPermanentError(restoreErr)) {
                abandonRoom(`Could not restore the room: ${restoreErr.message}`);
                return false;
              }
            }
          } else if (isPermanentError(err)) {
            abandonRoom(`Disconnected from the room: ${err.message}`);
            return false;
          }
        }
        await delay(wait);
        wait = Math.min(wait * 2, MAX_RECONNECT_DELAY_MS);
      }
      return false;
    })().finally(() => {
      state.recovering = null;
    });
    return state.recovering;
  }

  function startKeepalive() {
    stopKeepalive();
    state.keepaliveTimer = setInterval(() => {
      if (!state.room || state.isSolo) return stopKeepalive();
      apiPost('/api/rooms/ping', { roomCode: state.room.code }, { noRecover: true })
        .catch(() => ensureRoomConnection());
    }, KEEPALIVE_MS);
  }

  function stopKeepalive() {
    clearInterval(state.keepaliveTimer);
    state.keepaliveTimer = null;
  }

  function clearLocalRoom(roomCode) {
    if (state.sseSource) {
      state.sseSource.close();
      state.sseSource = null;
    }
    stopKeepalive();
    if (state.tambolaAutoTimer) {
      clearInterval(state.tambolaAutoTimer);
      state.tambolaAutoTimer = null;
    }
    if (roomCode) {
      safeStorage.removeItem(`myarena_rec_${roomCode}`);
      safeStorage.removeItem(`myarena_pid_${roomCode}`);
      safeStorage.removeItem(checkpointStorageKey(roomCode));
    }
    state.room = null;
    state.playerId = null;
    state.reconnectToken = null;
    state.checkpoint = null;
    state.isHost = false;
    state.isSolo = false;
    state.currentGameId = null;
    state.lastActivityKey = null;
    state.sseDisconnected = false;
    clearAITimer();
  }

  function abandonRoom(message) {
    clearLocalRoom(state.room && state.room.code);
    showToast(message);
    switchView('landing');
  }

  async function createRoomAction() {
    const gameType = document.getElementById('selectGameType').value;
    const mode = document.getElementById('selectGameMode').value;
    const maxPlayers = document.getElementById('selectMaxPlayers').value;
    const rules = getSelectedRules(gameType);

    if (mode === 'solo') {
      startSoloGame(gameType, rules);
      closeModal('modalCreateRoom');
      return;
    }

    try {
      const result = await apiPost('/api/rooms/create', {
        hostName: state.user.name,
        gameType: gameType,
        maxPlayers: maxPlayers,
        rules: rules,
        heroId: state.user.heroId
      });

      state.room = result.room;
      state.isHost = true;
      state.playerId = result.player.id;
      state.reconnectToken = result.reconnectToken;
      state.isSolo = false;

      // Save reconnect session in localStorage
      safeStorage.setItem(`myarena_rec_${result.roomCode}`, result.reconnectToken);
      safeStorage.setItem(`myarena_pid_${result.roomCode}`, result.player.id);

      closeModal('modalCreateRoom');
      setupSSE(result.roomCode);
      renderLobby();
      switchView('lobby');
      showToast(`👑 Room ${result.roomCode} created!`);
    } catch (err) {
      showToast(`Error: ${err.message}`);
    }
  }

  async function joinRoomAction(code = null) {
    const rawCode = (code || document.getElementById('inputJoinCode').value).trim();
    // Support parsing invite URL with ?room=
    let roomCode = rawCode;
    if (rawCode.includes('?room=')) {
      const match = rawCode.match(/room=([A-Z0-9-]+)/i);
      if (match) roomCode = match[1];
    }
    roomCode = roomCode.toUpperCase();
    if (!/^ROYAL-[A-Z0-9]{4}$/.test(roomCode)) {
      showToast('Enter a valid room code such as ROYAL-7K4P');
      return;
    }

    const joinName = (document.getElementById('inputJoinName').value || state.user.name).trim();
    if (!joinName) {
      showToast('Please enter a display name');
      return;
    }
    state.user.name = joinName;
    safeStorage.setItem('myarena_name', joinName);
    updateNavProfile();

    const savedToken = safeStorage.getItem(`myarena_rec_${roomCode}`);
    const joinRequest = {
      roomCode: roomCode,
      playerName: joinName,
      heroId: state.user.heroId,
      reconnectToken: savedToken || null
    };

    try {
      let result;
      try {
        result = await apiPost('/api/rooms/join', joinRequest);
      } catch (err) {
        // Rejoining after the server lost the room (restart/redeploy): rebuild it first.
        const checkpoint = savedToken && loadCheckpoint(roomCode);
        if (!isRoomMissingError(err) || !checkpoint) throw err;
        await apiPost('/api/rooms/restore', { roomCode, checkpoint: checkpoint.data }, { token: savedToken, noRecover: true });
        result = await apiPost('/api/rooms/join', joinRequest);
      }

      state.room = result.room;
      state.isHost = result.room.hostId === result.player.id;
      state.playerId = result.player.id;
      state.reconnectToken = result.reconnectToken;
      state.isSolo = false;

      safeStorage.setItem(`myarena_rec_${roomCode}`, result.reconnectToken);
      safeStorage.setItem(`myarena_pid_${roomCode}`, result.player.id);

      closeModal('modalJoinRoom');
      setupSSE(roomCode);

      if (state.room.status === 'IN_GAME' && state.room.gameState) {
        setupGameView();
        switchView('game');
      } else {
        renderLobby();
        switchView('lobby');
      }
      showToast(`Joined Arena ${roomCode}`);
    } catch (err) {
      showToast(`Join Failed: ${err.message}`);
    }
  }

  function setupSSE(roomCode) {
    if (state.sseSource) {
      state.sseSource.close();
    }

    try {
      const token = encodeURIComponent(state.reconnectToken);
      const source = new EventSource(`/api/rooms/${roomCode}/stream?token=${token}`);
      state.sseSource = source;
      source.onopen = () => {
        if (state.sseDisconnected) showToast('Connection restored');
        state.sseDisconnected = false;
      };
      source.onmessage = (event) => {
        let data;
        try {
          data = JSON.parse(event.data);
        } catch (e) {
          return; // heartbeat comment frames
        }
        if (data.checkpoint) rememberCheckpoint(data.checkpoint, roomCode);
        handleNetworkEvent(data);
      };
      source.onerror = () => {
        if (state.sseSource !== source) return;
        if (!state.sseDisconnected) {
          state.sseDisconnected = true;
          showToast('Connection interrupted. Reconnecting...');
        }
        // CONNECTING means the browser retries by itself; CLOSED means the server refused
        // the stream (e.g. it restarted and lost the room), so recover explicitly.
        if (source.readyState === EventSource.CLOSED) ensureRoomConnection();
      };
      startKeepalive();
    } catch (err) {
      console.warn('SSE not supported or local file mode');
    }
  }

  function handleNetworkEvent(event) {
    if (event.type === 'ROOM_SYNC' || event.type === 'ROOM_RESTORED') {
      state.room = event.room;
      state.isHost = event.room.hostId === state.playerId;
      if (state.room.status === 'IN_GAME' && state.view !== 'game') {
        setupGameView();
        switchView('game');
      } else if (state.view === 'lobby') {
        renderLobby();
      } else if (state.view === 'game') {
        updateGameDisplay();
      }
    } else if (event.type === 'GAME_STARTED') {
      state.room.status = 'IN_GAME';
      state.room.gameState = event.gameState;
      setupGameView();
      switchView('game');
      announceSR('The game has started!');
    } else if (event.type === 'GAME_STATE_UPDATED') {
      state.room.gameState = event.gameState;
      updateGameDisplay(event.actionResult);
    } else if (event.type === 'GAME_RESET_TO_LOBBY') {
      if (state.tambolaAutoTimer) {
        clearInterval(state.tambolaAutoTimer);
        state.tambolaAutoTimer = null;
      }
      state.room = event.room;
      renderLobby();
      switchView('lobby');
    } else if (event.type === 'CHAT_MESSAGE') {
      if (state.room) {
        state.room.chat = Array.isArray(event.chat) ? event.chat : state.room.chat || [];
      }
      if (state.view === 'game') renderChatMessages(state.room ? state.room.chat : []);
    } else if (event.type === 'PLAYER_READY_CHANGED') {
      const player = state.room.players.find(p => p.id === event.playerId);
      if (player) player.isReady = event.isReady;
      if (state.view === 'lobby') renderLobby();
    } else if (event.type === 'HERO_CHANGED') {
      const player = state.room.players.find(p => p.id === event.playerId);
      if (player) player.heroId = event.heroId;
      if (state.view === 'lobby') renderLobby();
    } else if (event.type === 'SETTINGS_UPDATED') {
      state.room = event.room;
      if (state.view === 'lobby') renderLobby();
    } else if (event.type === 'PLAYER_RECONNECTED') {
      const player = state.room.players.find(p => p.id === event.player.id);
      if (player) Object.assign(player, event.player);
      if (state.view === 'lobby') renderLobby();
      if (state.view === 'game') renderChatRoster();
    } else if (event.type === 'PLAYER_CONNECTION_CHANGED') {
      const player = state.room.players.find(p => p.id === event.playerId);
      if (player) player.connected = event.connected;
      if (state.view === 'lobby') renderLobby();
      if (state.view === 'game') renderChatRoster();
    } else if (event.type === 'PLAYER_JOINED') {
      showToast(`${event.player.name} entered the lobby`);
      if (state.view === 'lobby') {
        if (!state.room.players.some(p => p.id === event.player.id)) {
          state.room.players.push(event.player);
        }
        renderLobby();
      }
    } else if (event.type === 'PLAYER_LEFT') {
      showToast(`${event.playerName} left the room`);
      if (event.hostMigrated) {
        state.isHost = event.newHostId === state.playerId;
        showToast('Host rights transferred');
      }
      if (event.room) {
        state.room = event.room;
      } else {
        state.room.players = state.room.players.filter(p => p.id !== event.playerId);
      }
      if (state.room.status === 'FINISHED' && state.room.gameState) {
        setupGameView();
        switchView('game');
      } else if (state.view === 'lobby') {
        renderLobby();
      } else if (state.view === 'game') {
        updateGameDisplay();
      }
    }
  }

  // =========================================================================
  // 7. LOBBY RENDERING & CONTROLS
  // =========================================================================
  function renderLobby() {
    if (!state.room) return;
    const r = state.room;

    document.getElementById('lobbyRoomCode').textContent = r.code;
    const gameTitles = { ludo: 'Ludo Royalty', snakes: 'Snakes & Ladders', tambola: 'Housie / Tambola 90' };
    document.getElementById('lobbyGameTitle').textContent = gameTitles[r.gameType] || r.gameType;
    document.getElementById('lobbyPlayerCount').textContent = r.players.length;
    document.getElementById('lobbyMaxPlayers').textContent = r.maxPlayers;

    const list = document.getElementById('lobbyPlayersList');
    list.innerHTML = '';

    const heroIcons = { iron_man: '⚛', captain_america: '★', hulk: '✊', thor: '⚡', iron_hero: '⚛' };

    r.players.forEach(p => {
      const isMe = p.id === state.playerId;
      const card = document.createElement('div');
      card.className = `player-card ${isMe ? 'is-self' : ''}`;
      card.innerHTML = `
        <div class="player-pawn-preview" style="background:${p.role === 'HOST' ? '#d97706' : '#4c327e'}">
          ${heroIcons[p.heroId] || '👑'}
        </div>
        <div class="player-info">
          <div class="player-name-row">
            <span>${escapeHTML(p.name)}</span>
            ${p.role === 'HOST' ? '<span class="player-role-tag tag-host">Host</span>' : ''}
          </div>
          <div class="ready-indicator ${p.connected && p.isReady ? 'status-ready' : 'status-waiting'}">
            ${!p.connected ? '○ Reconnecting' : (p.isReady ? '✓ Ready' : '⏳ Waiting')}
          </div>
        </div>
      `;
      list.appendChild(card);
    });

    // Rules Summary
    const rulesBox = document.getElementById('lobbyRulesSummary');
    rulesBox.innerHTML = '';
    const badgeContainer = document.createElement('div');
    badgeContainer.style.display = 'flex';
    badgeContainer.style.flexWrap = 'wrap';
    badgeContainer.style.gap = '8px';

    if (r.gameType === 'ludo') {
      const entryText = r.rules.entryRoll && r.rules.entryRoll.includes(1) ? 'Entry: 1 or 6' : 'Entry: 6 Only';
      badgeContainer.innerHTML = `
        <span class="meta-tag">${entryText}</span>
        <span class="meta-tag">Bonus on Six: ${r.rules.bonusOnSix ? 'Yes' : 'No'}</span>
        <span class="meta-tag">3 Sixes Penalty: ${r.rules.maxConsecutiveSixes ? 'Yes' : 'No'}</span>
        <span class="meta-tag">Safe Stars: ${r.rules.safeSquaresEnabled ? 'Yes' : 'No'}</span>
        <span class="meta-tag">Exact Finish: ${r.rules.exactFinish ? 'Yes' : 'No'}</span>
      `;
    } else if (r.gameType === 'snakes') {
      badgeContainer.innerHTML = `
        <span class="meta-tag">Finish: ${escapeHTML(r.rules.finishMode || 'exact_stay')}</span>
        <span class="meta-tag">Theme: ${escapeHTML(r.rules.themeId || 'royal_gold')}</span>
        <span class="meta-tag">Bonus on 6: ${r.rules.bonusOnSix ? 'Yes' : 'No'}</span>
      `;
    } else if (r.gameType === 'tambola') {
      const setup = {
        patternIds: r.rules.patternIds || window.TambolaEngine.DEFAULT_PATTERN_IDS,
        callerRole: r.rules.callerRole || 'HOST',
        autoIntervalSeconds: r.rules.autoIntervalSeconds || 7
      };
      badgeContainer.style.display = 'block';
      badgeContainer.innerHTML = tambolaSetupSummaryHTML(setup, 60);
      if (state.isHost && r.status === 'LOBBY') {
        const setupButton = document.createElement('button');
        setupButton.type = 'button';
        setupButton.className = 'btn btn-royal';
        setupButton.id = 'btnLobbyTambolaSetup';
        setupButton.style.marginTop = '12px';
        setupButton.textContent = '🎯 Game Setup: Patterns & Caller';
        setupButton.addEventListener('click', () => {
          openTambolaSetup(setup, async next => {
            const res = await apiPost('/api/rooms/settings', { roomCode: r.code, rules: next });
            state.room = res.room;
            renderLobby();
            showToast(`Game setup saved: ${next.patternIds.length} winning patterns`);
          });
        });
        badgeContainer.appendChild(setupButton);
      }
    }
    rulesBox.appendChild(badgeContainer);

    // Host start button visibility
    const startBtn = document.getElementById('btnStartGame');
    if (state.isHost) {
      startBtn.style.display = 'inline-flex';
      const minReq = r.gameType === 'ludo' ? 2 : 1;
      const allReady = r.players.every(p => p.connected && p.isReady);
      startBtn.disabled = r.players.length < minReq || !allReady;
    } else {
      startBtn.style.display = 'none';
    }

    // Toggle Ready button text
    const myPlayer = r.players.find(p => p.id === state.playerId);
    const readyBtn = document.getElementById('btnToggleReady');
    if (myPlayer) {
      readyBtn.textContent = myPlayer.isReady ? 'Unready ✕' : 'Mark Ready ✓';
    }
  }

  // =========================================================================
  // 8. SOLO MODE & LOCAL AI EXECUTION
  // =========================================================================
  function startSoloGame(gameType, rules = {}) {
    state.isSolo = true;
    state.isHost = true;
    state.playerId = 'player_human';

    const humanHero = HEROES_LIST.find(h => h.id === state.user.heroId) || HEROES_LIST[0];

    if (gameType === 'ludo') {
      const players = [
        { id: 'player_human', name: state.user.name, teamIndex: 0, isAI: false, heroId: humanHero.id },
        { id: 'bot_gamma', name: 'Gamma Bot', teamIndex: 1, isAI: true, heroId: 'hulk' },
        { id: 'bot_thunder', name: 'Thor Bot', teamIndex: 2, isAI: true, heroId: 'thor' },
        { id: 'bot_shield', name: 'Cap Bot', teamIndex: 3, isAI: true, heroId: 'captain_america' }
      ];
      const gameState = window.LudoEngine.createGame(players, rules);
      state.room = {
        code: 'SOLO-LUDO',
        gameType: 'ludo',
        status: 'IN_GAME',
        hostId: 'player_human',
        players: players,
        gameState: gameState
      };
    } else if (gameType === 'snakes') {
      const players = [
        { id: 'player_human', name: state.user.name, isAI: false, heroId: humanHero.id },
        { id: 'bot_hulk', name: 'Titan Bot', isAI: true, heroId: 'gamma_giant' }
      ];
      const gameState = window.SnakesEngine.createGame(players, rules);
      state.room = {
        code: 'SOLO-SNAKES',
        gameType: 'snakes',
        status: 'IN_GAME',
        hostId: 'player_human',
        players: players,
        gameState: gameState
      };
    } else if (gameType === 'tambola') {
      const players = [
        { id: 'player_human', name: state.user.name, role: 'HOST' }
      ];
      const gameState = window.TambolaEngine.createGame(
        {
          hostId: 'player_human',
          callerRole: rules.callerRole || 'HOST',
          autoIntervalSeconds: rules.autoIntervalSeconds || 7
        },
        players,
        rules.patternIds
      );
      state.room = {
        code: 'SOLO-TAMBOLA',
        gameType: 'tambola',
        status: 'IN_GAME',
        hostId: 'player_human',
        players: players,
        gameState: gameState
      };
    }
    // Kept so "Play Again" can restart a solo match with the same rules.
    state.room.rules = rules;

    setupGameView();
    switchView('game');
    showToast('Solo match started against AI bots!');
  }

  // Exactly one AI step may be pending at a time. Each step re-validates that the AI still
  // owns the turn, so a stale timer can never roll or move on behalf of a human player.
  function clearAITimer() {
    clearTimeout(state.aiTimer);
    state.aiTimer = null;
  }

  function isAIStillOnTurn(gs, aiId, phase) {
    if (!state.room || state.room.gameState !== gs || gs.phase !== phase) return false;
    const current = gs.players[gs.currentTurnIndex];
    return !!current && current.isAI && current.id === aiId;
  }

  function scheduleAIStep(delay, step) {
    clearAITimer();
    state.aiTimer = setTimeout(() => {
      state.aiTimer = null;
      step();
    }, delay);
  }

  function runAITurnIfApplicable() {
    if (!state.isSolo || state.aiTimer || !state.room || !state.room.gameState) return;
    const gs = state.room.gameState;
    if (gs.phase !== 'ROLL') return;

    const currentPlayer = gs.players[gs.currentTurnIndex];
    if (!currentPlayer || !currentPlayer.isAI) return;
    const aiId = currentPlayer.id;

    // Let the previous throw finish landing so every roll is visible on the die.
    const delay = Math.max(800, diceAnimationRemainingMs() + 300);
    scheduleAIStep(delay, () => {
      if (!isAIStillOnTurn(gs, aiId, 'ROLL')) return runAITurnIfApplicable();
      sound.playDiceRoll();

      if (state.room.gameType === 'ludo') {
        const rollRes = window.LudoEngine.rollDice(gs);
        updateGameDisplay();
        if (rollRes.turnAdvanced || gs.phase !== 'MOVE') return runAITurnIfApplicable();

        scheduleAIStep(Math.max(600, diceAnimationRemainingMs() + 150), () => {
          if (!isAIStillOnTurn(gs, aiId, 'MOVE')) return runAITurnIfApplicable();
          const bestToken = window.GameAI.pickLudoMove(gs);
          if (bestToken === null) return;
          sound.playMove();
          const moveRes = window.LudoEngine.moveToken(gs, bestToken);
          if (moveRes.captured) sound.playCapture();
          updateGameDisplay();
        });
      } else if (state.room.gameType === 'snakes') {
        const res = window.SnakesEngine.playTurn(gs);
        if (res.shortcutType === 'LADDER') sound.playLadder();
        else if (res.shortcutType === 'SNAKE') sound.playSnake();
        else sound.playMove();
        updateGameDisplay(res);
      }
    });
  }

  // =========================================================================
  // 9. GAME STAGE CONTROLS & EVENT HANDLERS
  // =========================================================================
  function setupGameView() {
    const r = state.room;
    if (state.currentGameId !== r.gameState.id) {
      state.currentGameId = r.gameState.id;
      state.lastActivityKey = null;
      state.resultsGameId = null;
      const activityList = document.getElementById('activityFeedList');
      if (activityList) activityList.innerHTML = '';
      clearAITimer();
      resetDiceState(r.gameState);
    }
    document.getElementById('gameRoomCodeBadge').textContent = r.code;

    const canvasWrapper = document.getElementById('boardCanvasWrapper');
    const tambolaWrapper = document.getElementById('tambolaWrapper');
    const sidePanel = document.getElementById('gameSidePanel');
    const diceActionBox = document.getElementById('diceActionBox');
    const chatPanel = document.querySelector('.chat-panel');
    diceActionBox.classList.toggle('is-ludo', r.gameType === 'ludo');
    diceActionBox.style.display = r.gameType === 'tambola' ? 'none' : 'flex';
    chatPanel.style.display = 'flex';
    renderChatMessages(r.chat || []);

    if (r.gameType === 'tambola') {
      canvasWrapper.style.display = 'none';
      tambolaWrapper.style.display = 'flex';
      sidePanel.style.display = 'flex';
      setupTambolaView();
    } else {
      canvasWrapper.style.display = 'block';
      tambolaWrapper.style.display = 'none';
      sidePanel.style.display = 'flex';
      initBoardCanvas();
    }

    updateGameDisplay();
  }

  function updateGameDisplay(actionResult = null) {
    if (!state.room || !state.room.gameState) return;
    const gs = state.room.gameState;
    const r = state.room;

    // Check game finished
    if (gs.phase === 'FINISHED') {
      if (state.tambolaAutoTimer) {
        clearInterval(state.tambolaAutoTimer);
        state.tambolaAutoTimer = null;
      }
      if (r.gameType === 'ludo') renderLudoBoard();
      if (r.gameType === 'snakes') renderSnakesBoard();
      if (r.gameType === 'tambola') updateTambolaDisplay();
      if (state.resultsGameId !== gs.id) {
        state.resultsGameId = gs.id;
        showResultsModal();
      }
      return;
    }

    // Turn indicator
    const currentP = gs.players[gs.currentTurnIndex];
    if (currentP) {
      const heroIcons = { iron_man: '⚛', captain_america: '★', hulk: '✊', thor: '⚡' };
      document.getElementById('turnAvatar').textContent = heroIcons[currentP.hero?.id || currentP.heroId] || '👑';
      const isMyTurn = currentP.id === state.playerId;
      document.getElementById('turnText').textContent = isMyTurn ? `Your Turn (${currentP.name})!` : `${currentP.name}'s Turn`;
      document.getElementById('turnText').style.color = isMyTurn ? 'var(--gold-bright)' : 'var(--text-main)';
      announceSR(`${currentP.name}'s turn.`);
    }

    // Dice button status
    const diceBtn = document.getElementById('btnRollDice');
    const diceCube = document.getElementById('diceCube');
    const helper = document.getElementById('diceHelperText');
    let canRoll = false;

    if (r.gameType === 'ludo') {
      const isMyTurn = currentP && currentP.id === state.playerId;
      if (gs.phase === 'ROLL') {
        canRoll = isMyTurn && !currentP.isAI;
        diceBtn.disabled = !canRoll;
        helper.textContent = isMyTurn ? 'Tap Roll Dice!' : `Waiting for ${currentP.name} to roll...`;
        syncDice(diceCube, gs);
      } else if (gs.phase === 'MOVE') {
        diceBtn.disabled = true;
        syncDice(diceCube, gs);
        helper.textContent = isMyTurn ? 'Tap a glowing legal token to move!' : `${currentP.name} is selecting a token...`;
      }
      renderLudoBoard();
    } else if (r.gameType === 'snakes') {
      const isMyTurn = currentP && currentP.id === state.playerId;
      canRoll = isMyTurn && !currentP.isAI;
      diceBtn.disabled = !canRoll;
      syncDice(diceCube, gs);
      helper.textContent = isMyTurn ? 'Tap Roll Dice to advance!' : `Waiting for ${currentP.name}...`;
      renderSnakesBoard();
    } else if (r.gameType === 'tambola') {
      updateTambolaDisplay();
    }
    diceCube.classList.toggle('disabled', !canRoll);
    diceCube.setAttribute('aria-disabled', String(!canRoll));

    // Append to Activity Feed
    if (gs.lastAction && gs.lastAction.message) {
      const activityKey = `${gs.history ? gs.history.length : 0}:${gs.lastAction.type}:${gs.lastAction.message}`;
      if (activityKey !== state.lastActivityKey) {
        state.lastActivityKey = activityKey;
        appendActivityFeed(gs.lastAction.message);
      }
    }

    renderChatMessages(r.chat || []);

    // Trigger AI if needed
    if (state.isSolo) {
      runAITurnIfApplicable();
    }
  }

  const DICE_PIP_LAYOUT = {
    1: [4],
    2: [0, 8],
    3: [0, 4, 8],
    4: [0, 2, 6, 8],
    5: [0, 2, 4, 6, 8],
    6: [0, 2, 3, 5, 6, 8]
  };

  // Opposite sides of a real die sum to 7; the front side carries the live value.
  const DICE_SIDE_VALUES = { front: 1, back: 6, right: 3, left: 4, top: 2, bottom: 5 };

  const DICE_ROLL_MS = 1180;
  const DICE_REVEAL_MS = 470;

  // The die is driven by gameState.lastRoll.seq: every new roll animates exactly once and
  // lands on that roll's value, regardless of later state changes (moves, other players).
  const diceRoll = {
    active: false,
    startedAt: 0,
    shownSeq: 0,
    value: null,
    target: null,
    awaitingOwnRoll: false,
    queue: [],
    revealTimer: null,
    endTimer: null,
    animations: []
  };

  function resetDiceState(gameState) {
    clearTimeout(diceRoll.revealTimer);
    clearTimeout(diceRoll.endTimer);
    diceRoll.animations.forEach(animation => {
      if (animation && typeof animation.cancel === 'function') animation.cancel();
    });
    const lastRoll = gameState && gameState.lastRoll;
    diceRoll.active = false;
    diceRoll.startedAt = 0;
    diceRoll.shownSeq = lastRoll ? lastRoll.seq : 0;
    diceRoll.value = lastRoll ? lastRoll.value : null;
    diceRoll.target = null;
    diceRoll.awaitingOwnRoll = false;
    diceRoll.queue = [];
    diceRoll.animations = [];

    const cube = document.getElementById('diceCube');
    if (cube) {
      cube.classList.remove('rolling');
      showDiceValue(cube, diceRoll.value);
    }
  }

  // =========================================================================
  // WEBGL DIE: one solid rounded cube, ray-marched from a signed distance field
  // so corners and edges are genuinely rounded with no seams. The hidden CSS cube
  // (.dice-solid) still carries the throw animation and pips for accessibility and
  // tests; each frame its live transform is copied into the shader.
  // =========================================================================
  const DICE_GL_CANVAS_SCALE = 3.2;
  const DICE_PERSPECTIVE_PX = 900;

  const DICE_GL_VERTEX = `
    attribute vec2 a_pos;
    void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
  `;

  const DICE_GL_FRAGMENT = `
    #ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
    #else
    precision mediump float;
    #endif
    uniform vec2 u_res;      // canvas size in device pixels
    uniform float u_scale;   // device pixels per die unit (die spans -1..1)
    uniform float u_eye;     // camera distance in die units (CSS perspective)
    uniform mat3 u_rot;      // die local -> world rotation (CSS axes: x right, y down, z toward viewer)
    uniform mat3 u_inv;      // world -> die local rotation
    uniform vec3 u_trans;    // die translation in die units
    uniform vec3 u_valsA;    // pip counts: front, back, right
    uniform vec3 u_valsB;    // pip counts: left, top, bottom

    const float RADIUS = 0.3;
    const float PIP_RADIUS = 0.19;
    const float PIP_SPACING = 0.5;

    float sdRoundBox(vec3 p) {
      vec3 q = abs(p) - vec3(1.0 - RADIUS);
      return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0) - RADIUS;
    }

    vec3 surfaceNormal(vec3 p) {
      const vec2 e = vec2(1.0, -1.0) * 0.0015;
      return normalize(e.xyy * sdRoundBox(p + e.xyy) + e.yyx * sdRoundBox(p + e.yyx) +
                       e.yxy * sdRoundBox(p + e.yxy) + e.xxx * sdRoundBox(p + e.xxx));
    }

    float pipDistance(vec2 uv, float value) {
      float g = PIP_SPACING;
      float d = 10.0;
      if (mod(value, 2.0) > 0.5) d = min(d, length(uv));
      if (value > 1.5) { d = min(d, length(uv - vec2(-g, -g))); d = min(d, length(uv - vec2(g, g))); }
      if (value > 3.5) { d = min(d, length(uv - vec2(g, -g))); d = min(d, length(uv - vec2(-g, g))); }
      if (value > 5.5) { d = min(d, length(uv - vec2(-g, 0.0))); d = min(d, length(uv - vec2(g, 0.0))); }
      return d;
    }

    void main() {
      vec2 screen = vec2(gl_FragCoord.x - 0.5 * u_res.x, 0.5 * u_res.y - gl_FragCoord.y) / u_scale;
      vec3 eye = vec3(0.0, 0.0, u_eye);
      vec3 dir = normalize(vec3(screen, 0.0) - eye);
      vec3 ro = u_inv * (eye - u_trans);
      vec3 rd = u_inv * dir;

      // Skip everything outside the die's bounding sphere.
      float b = dot(ro, rd);
      float h = b * b - (dot(ro, ro) - 3.02);
      if (h < 0.0) { gl_FragColor = vec4(0.0); return; }
      h = sqrt(h);
      float t = max(-b - h, 0.0);
      float tEnd = -b + h;

      float closest = 1e3;
      float tClosest = t;
      bool hit = false;
      for (int i = 0; i < 72; i++) {
        float d = sdRoundBox(ro + rd * t);
        if (d < closest) { closest = d; tClosest = t; }
        if (d < 0.0006) { hit = true; break; }
        t += d;
        if (t > tEnd) break;
      }

      float pixel = 1.0 / u_scale;
      float alpha = hit ? 1.0 : 1.0 - smoothstep(0.0, 1.4 * pixel, closest);
      if (alpha <= 0.0) { gl_FragColor = vec4(0.0); return; }

      vec3 p = ro + rd * (hit ? t : tClosest);
      vec3 nLocal = surfaceNormal(p);
      vec3 n = normalize(u_rot * nLocal);
      vec3 v = -dir;

      // Which face, and where on it, decides the pips (same layout as the CSS faces).
      vec3 a = abs(p);
      vec2 uv;
      float value;
      if (a.z >= a.x && a.z >= a.y) {
        if (p.z > 0.0) { uv = p.xy; value = u_valsA.x; } else { uv = vec2(-p.x, p.y); value = u_valsA.y; }
      } else if (a.x >= a.y) {
        if (p.x > 0.0) { uv = vec2(-p.z, p.y); value = u_valsA.z; } else { uv = vec2(p.z, p.y); value = u_valsB.x; }
      } else {
        if (p.y < 0.0) { uv = vec2(p.x, p.z); value = u_valsB.y; } else { uv = vec2(p.x, -p.z); value = u_valsB.z; }
      }
      float pd = pipDistance(uv, value);
      float pipMask = 1.0 - smoothstep(PIP_RADIUS - 1.2 * pixel, PIP_RADIUS + 1.2 * pixel, pd);

      vec3 light = normalize(vec3(-0.35, -0.6, 1.0));
      vec3 halfway = normalize(light + v);
      float diffuse = max(dot(n, light), 0.0);
      float sky = 0.5 - 0.5 * n.y;
      float rim = pow(1.0 - max(dot(n, v), 0.0), 3.0);

      vec3 ivory = vec3(0.985, 0.98, 0.965);
      vec3 body = ivory * (0.36 + 0.52 * diffuse + 0.2 * sky);
      body += vec3(1.0) * pow(max(dot(n, halfway), 0.0), 56.0) * 0.42;
      body += vec3(0.85, 0.88, 1.0) * rim * 0.12;

      // Pips read as dimples: a dark well whose inner wall lightens toward the rim.
      float depth = clamp(pd / PIP_RADIUS, 0.0, 1.0);
      vec3 pip = mix(vec3(0.015, 0.02, 0.045), vec3(0.11, 0.12, 0.17), smoothstep(0.5, 1.0, depth));
      pip *= 0.75 + 0.35 * diffuse;

      vec3 color = mix(body, pip, pipMask);
      gl_FragColor = vec4(clamp(color, 0.0, 1.0) * alpha, alpha);
    }
  `;

  const diceGL = {
    ready: false,
    failed: false,
    cube: null,
    canvas: null,
    gl: null,
    uniforms: null,
    values: [1, 6, 3, 4, 2, 5],
    drawQueued: false,
    loop: null
  };

  function compileDiceShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(shader) || 'Dice shader failed to compile');
    }
    return shader;
  }

  function disableDiceGL() {
    diceGL.ready = false;
    diceGL.failed = true;
    if (diceGL.loop) cancelAnimationFrame(diceGL.loop);
    diceGL.loop = null;
    if (diceGL.cube) diceGL.cube.classList.remove('has-webgl');
    if (diceGL.canvas) diceGL.canvas.remove();
  }

  function initDiceGL(diceCube) {
    if (diceGL.ready || diceGL.failed) return;
    try {
      const canvas = document.createElement('canvas');
      canvas.className = 'dice-gl';
      canvas.setAttribute('aria-hidden', 'true');
      const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false });
      if (!gl) throw new Error('WebGL unavailable');

      const program = gl.createProgram();
      gl.attachShader(program, compileDiceShader(gl, gl.VERTEX_SHADER, DICE_GL_VERTEX));
      gl.attachShader(program, compileDiceShader(gl, gl.FRAGMENT_SHADER, DICE_GL_FRAGMENT));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(program) || 'Dice shader failed to link');
      }
      gl.useProgram(program);

      // One triangle that covers the whole canvas.
      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      const position = gl.getAttribLocation(program, 'a_pos');
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

      diceGL.uniforms = {};
      ['u_res', 'u_scale', 'u_eye', 'u_rot', 'u_inv', 'u_trans', 'u_valsA', 'u_valsB'].forEach(name => {
        diceGL.uniforms[name] = gl.getUniformLocation(program, name);
      });

      canvas.addEventListener('webglcontextlost', event => {
        event.preventDefault();
        disableDiceGL();
      });

      diceGL.cube = diceCube;
      diceGL.canvas = canvas;
      diceGL.gl = gl;
      diceGL.ready = true;
      diceCube.appendChild(canvas);
      diceCube.classList.add('has-webgl');

      if (typeof ResizeObserver === 'function') {
        new ResizeObserver(requestDiceDraw).observe(diceCube);
      }
      // Redraw whenever the resting transform is changed directly (not via animation).
      const solid = diceCube.querySelector('.dice-solid');
      if (solid && typeof MutationObserver === 'function') {
        new MutationObserver(requestDiceDraw).observe(solid, { attributes: true, attributeFilter: ['style'] });
      }
      requestDiceDraw();
    } catch (err) {
      console.warn('3D die falls back to CSS:', err.message);
      disableDiceGL();
    }
  }

  function drawDiceGL() {
    diceGL.drawQueued = false;
    if (!diceGL.ready) return;
    const { cube, canvas, gl, uniforms } = diceGL;
    const size = cube.offsetWidth;
    if (!size) return;

    const half = size / 2;
    const cssSize = Math.round(size * DICE_GL_CANVAS_SCALE);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const pixels = Math.round(cssSize * dpr);
    if (canvas.width !== pixels) {
      canvas.width = pixels;
      canvas.height = pixels;
      canvas.style.width = `${cssSize}px`;
      canvas.style.height = `${cssSize}px`;
      canvas.style.left = `${(size - cssSize) / 2}px`;
      canvas.style.top = `${(size - cssSize) / 2}px`;
    }

    const solid = cube.querySelector('.dice-solid');
    const transform = solid ? getComputedStyle(solid).transform : 'none';
    const m = transform && transform !== 'none' ? new DOMMatrix(transform) : new DOMMatrix();
    const columns = [[m.m11, m.m12, m.m13], [m.m21, m.m22, m.m23], [m.m31, m.m32, m.m33]]
      .map(column => {
        const length = Math.hypot(column[0], column[1], column[2]) || 1;
        return column.map(component => component / length);
      });
    const rotation = columns.flat();
    const inverse = [0, 1, 2].flatMap(row => columns.map(column => column[row]));

    gl.viewport(0, 0, pixels, pixels);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(uniforms.u_res, pixels, pixels);
    gl.uniform1f(uniforms.u_scale, half * dpr);
    gl.uniform1f(uniforms.u_eye, DICE_PERSPECTIVE_PX / half);
    gl.uniformMatrix3fv(uniforms.u_rot, false, rotation);
    gl.uniformMatrix3fv(uniforms.u_inv, false, inverse);
    gl.uniform3f(uniforms.u_trans, m.m41 / half, m.m42 / half, m.m43 / half);
    gl.uniform3f(uniforms.u_valsA, diceGL.values[0], diceGL.values[1], diceGL.values[2]);
    gl.uniform3f(uniforms.u_valsB, diceGL.values[3], diceGL.values[4], diceGL.values[5]);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  function requestDiceDraw() {
    if (!diceGL.ready || diceGL.drawQueued) return;
    diceGL.drawQueued = true;
    requestAnimationFrame(drawDiceGL);
  }

  // Redraw every frame only while a throw is in flight; otherwise draw on demand.
  function runDiceRenderLoop() {
    if (!diceGL.ready || diceGL.loop) return;
    const tick = () => {
      drawDiceGL();
      diceGL.loop = diceRoll.active ? requestAnimationFrame(tick) : null;
      if (!diceGL.loop) requestDiceDraw();
    };
    diceGL.loop = requestAnimationFrame(tick);
  }

  function buildDiceCube(diceCube) {
    let solid = diceCube.querySelector('.dice-solid');
    if (solid) return solid;
    solid = document.createElement('div');
    solid.className = 'dice-solid';
    solid.setAttribute('aria-hidden', 'true');
    const sides = Object.keys(DICE_SIDE_VALUES);
    const core = sides.map(side =>
      `<div class="dice-core-side" data-face="${side}"></div>`
    ).join('');
    const faces = sides.map(side => {
      const pips = Array.from({ length: 9 }, (_, index) =>
        `<span class="dice-pip${DICE_PIP_LAYOUT[DICE_SIDE_VALUES[side]].includes(index) ? ' active' : ''}"></span>`
      ).join('');
      return `<div class="dice-side" data-face="${side}">${pips}</div>`;
    }).join('');
    solid.innerHTML = core + faces;
    diceCube.appendChild(solid);
    initDiceGL(diceCube);
    return solid;
  }

  function paintDiceSide(side, value) {
    const pips = side.querySelectorAll('.dice-pip');
    const layout = DICE_PIP_LAYOUT[value] || [];
    pips.forEach((pip, index) => pip.classList.toggle('active', layout.includes(index)));
  }

  function paintDice(diceCube, frontValue) {
    const oppositeValue = 7 - frontValue;
    const remaining = [1, 2, 3, 4, 5, 6].filter(value =>
      value !== frontValue && value !== oppositeValue
    );
    const topValue = remaining[0];
    const bottomValue = 7 - topValue;
    const rightValue = remaining.find(value => value !== topValue && value !== bottomValue);
    const values = {
      front: frontValue,
      back: oppositeValue,
      top: topValue,
      bottom: bottomValue,
      right: rightValue,
      left: 7 - rightValue
    };
    Object.entries(values).forEach(([sideName, value]) => {
      paintDiceSide(diceCube.querySelector(`.dice-side[data-face="${sideName}"]`), value);
    });
    diceGL.values = [values.front, values.back, values.right, values.left, values.top, values.bottom];
    requestDiceDraw();
  }

  function isDieValue(value) {
    return Number.isInteger(value) && value >= 1 && value <= 6;
  }

  function showDiceValue(diceCube, value) {
    buildDiceCube(diceCube);
    paintDice(diceCube, isDieValue(value) ? value : 1);
    diceCube.setAttribute('aria-label', isDieValue(value) ? `Dice showing ${value}` : 'Roll dice');
  }

  function syncDice(diceCube, gameState) {
    buildDiceCube(diceCube);
    const lastRoll = gameState && gameState.lastRoll;
    if (!lastRoll || !isDieValue(lastRoll.value) || lastRoll.seq <= diceRoll.shownSeq) {
      if (!diceRoll.active) showDiceValue(diceCube, diceRoll.value);
      return;
    }
    if (diceRoll.queue.some(entry => entry.seq === lastRoll.seq)) return;

    if (diceRoll.active && diceRoll.awaitingOwnRoll && diceRoll.target === null) {
      // Result for the throw the local player already started.
      diceRoll.awaitingOwnRoll = false;
      diceRoll.shownSeq = lastRoll.seq;
      diceRoll.target = lastRoll.value;
      if (Date.now() - diceRoll.startedAt >= DICE_REVEAL_MS) landDice(diceCube);
      return;
    }
    if (diceRoll.active) {
      diceRoll.queue.push({ seq: lastRoll.seq, value: lastRoll.value });
      return;
    }
    diceRoll.shownSeq = lastRoll.seq;
    animateDiceRoll(diceCube, lastRoll.value);
  }

  function landDice(diceCube) {
    if (!isDieValue(diceRoll.target)) return;
    diceRoll.value = diceRoll.target;
    showDiceValue(diceCube, diceRoll.value);
  }

  // A rigid-body-style throw: one high arc followed by three rapidly decaying impacts.
  const DICE_REST_X = -22;
  const DICE_REST_Y = 26;

  function diceThrowKeyframes(size, dir) {
    const up = 'cubic-bezier(0.17, 0.84, 0.44, 1)';
    const down = 'cubic-bezier(0.55, 0.06, 0.68, 0.19)';
    const spinX = (Math.random() < 0.5 ? -1 : 1) * (Math.random() < 0.3 ? 1080 : 720);
    const spinY = (Math.random() < 0.5 ? -1 : 1) * (Math.random() < 0.3 ? 1080 : 720);
    const twist = (Math.random() < 0.5 ? -1 : 1) * (8 + Math.random() * 8);
    const hop = (offset, x, y, progress, rz, easing) => ({
      offset,
      transform: `translate3d(${(x * size * dir).toFixed(2)}px, ${(y * size).toFixed(2)}px, 0) rotateX(${spinX * progress + DICE_REST_X}deg) rotateY(${spinY * progress + DICE_REST_Y}deg) rotateZ(${rz}deg)`,
      easing
    });
    return [
      hop(0, -0.34, 0.03, 0, 0, up),
      hop(0.18, -0.13, -0.58, 0.26, twist, down),
      hop(0.36, 0.08, 0.02, 0.55, -twist * 0.65, up),
      hop(0.49, 0.19, -0.25, 0.72, twist * 0.38, down),
      hop(0.62, 0.24, 0.015, 0.86, -twist * 0.2, up),
      hop(0.72, 0.21, -0.10, 0.92, twist * 0.1, down),
      hop(0.82, 0.14, 0.008, 0.97, -twist * 0.05, up),
      hop(0.9, 0.07, -0.035, 0.992, twist * 0.02, down),
      hop(0.96, 0.025, 0.004, 1.004, 0, 'ease-out'),
      hop(1, 0, 0, 1, 0)
    ];
  }

  function diceShadowKeyframes() {
    const up = 'cubic-bezier(0.17, 0.84, 0.44, 1)';
    const down = 'cubic-bezier(0.55, 0.06, 0.68, 0.19)';
    const step = (offset, scale, opacity, easing) => ({
      offset,
      transform: `translateX(-50%) scale(${scale})`,
      opacity,
      easing
    });
    return [
      step(0, 0.9, 0.5, up),
      step(0.18, 0.5, 0.16, down),
      step(0.36, 1.08, 0.62, up),
      step(0.49, 0.73, 0.3, down),
      step(0.62, 1.04, 0.58, up),
      step(0.72, 0.87, 0.42, down),
      step(0.82, 1.02, 0.56, up),
      step(0.9, 0.95, 0.5, down),
      step(1, 1, 0.55)
    ];
  }

  function diceAnimationRemainingMs() {
    if (!diceRoll.active) return 0;
    return Math.max(0, DICE_ROLL_MS - (Date.now() - diceRoll.startedAt));
  }

  // target === null means the local player threw and the result has not arrived yet.
  function animateDiceRoll(diceCube, target = null) {
    if (diceRoll.active) return;
    const solid = buildDiceCube(diceCube);
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const canAnimate = typeof solid.animate === 'function' && !reduceMotion;

    diceRoll.active = true;
    diceRoll.target = isDieValue(target) ? target : null;
    diceRoll.awaitingOwnRoll = diceRoll.target === null;
    diceRoll.animations = [];
    diceRoll.startedAt = Date.now();
    diceCube.classList.add('rolling');
    clearTimeout(diceRoll.revealTimer);
    clearTimeout(diceRoll.endTimer);

    const duration = canAnimate ? DICE_ROLL_MS : 180;
    if (canAnimate) {
      const size = diceCube.offsetHeight || 110;
      const dir = Math.random() < 0.5 ? -1 : 1;
      const timing = { duration, easing: 'linear', fill: 'both' };
      diceRoll.animations.push(solid.animate(diceThrowKeyframes(size, dir), timing));
      const shadow = document.getElementById('diceShadow');
      if (shadow && typeof shadow.animate === 'function') {
        diceRoll.animations.push(shadow.animate(diceShadowKeyframes(), timing));
      }
      runDiceRenderLoop();
    }

    diceRoll.revealTimer = setTimeout(() => landDice(diceCube), canAnimate ? DICE_REVEAL_MS : 0);
    diceRoll.endTimer = setTimeout(() => {
      diceRoll.animations.forEach(animation => animation.cancel());
      diceRoll.animations = [];
      diceRoll.active = false;
      diceRoll.awaitingOwnRoll = false;
      diceCube.classList.remove('rolling');
      landDice(diceCube);
      diceRoll.target = null;
      showDiceValue(diceCube, diceRoll.value);

      const next = diceRoll.queue.shift();
      if (next && next.seq > diceRoll.shownSeq) {
        diceRoll.shownSeq = next.seq;
        animateDiceRoll(diceCube, next.value);
      }
    }, duration);
  }

  const ACTIVITY_VISIBLE_ITEMS = 2;

  function appendActivityFeed(msg) {
    const list = document.getElementById('activityFeedList');
    if (!list) return;
    const item = document.createElement('li');
    item.className = 'feed-item';
    item.textContent = msg;
    list.prepend(item);
    if (list.children.length > 50) list.lastChild.remove();
    list.scrollTop = 0;
    fitActivityFeed();
  }

  // Size the feed to exactly the newest two entries (they can wrap); older ones scroll.
  function fitActivityFeed() {
    const list = document.getElementById('activityFeedList');
    if (!list || !list.offsetParent) return;
    const items = Array.from(list.children).slice(0, ACTIVITY_VISIBLE_ITEMS);
    if (!items.length) return;
    const gap = parseFloat(getComputedStyle(list).rowGap) || 0;
    const height = items.reduce((total, item) => total + item.getBoundingClientRect().height, 0) +
      gap * (items.length - 1);
    list.style.maxHeight = `${Math.ceil(height)}px`;
  }

  function getChatParticipants() {
    const r = state.room;
    if (!r) return [];
    const roster = (r.players && r.players.length) ? r.players : (r.gameState ? r.gameState.players : []);
    return roster.map(player => ({
      id: player.id,
      name: player.name,
      isAI: !!player.isAI,
      connected: state.isSolo || player.isAI || player.connected !== false
    }));
  }

  function renderChatRoster() {
    const identity = document.getElementById('chatIdentity');
    const roster = document.getElementById('chatRoster');
    const participants = getChatParticipants();
    const me = participants.find(player => player.id === state.playerId);
    if (identity) identity.textContent = me ? `Chatting as ${me.name}` : '';
    if (!roster) return;
    roster.innerHTML = '';
    participants.forEach(player => {
      const chip = document.createElement('span');
      chip.className = 'chat-chip' + (player.id === state.playerId ? ' is-me' : '') +
        (player.connected ? '' : ' is-offline');
      chip.title = player.connected ? 'Online' : 'Offline';
      const dot = document.createElement('span');
      dot.className = 'chat-chip-dot';
      dot.setAttribute('aria-hidden', 'true');
      chip.appendChild(dot);
      chip.appendChild(document.createTextNode(player.isAI ? `${player.name} 🤖` : player.name));
      roster.appendChild(chip);
    });
  }

  function renderChatMessages(messages = []) {
    renderChatRoster();
    const list = document.getElementById('chatList');
    if (!list) return;
    // Re-rendering on every game update would yank the user back while scrolling history.
    const last = messages[messages.length - 1];
    const renderKey = `${state.room ? state.room.code : ''}:${messages.length}:${last ? last.id : ''}`;
    if (list.dataset.renderKey === renderKey) return;
    list.dataset.renderKey = renderKey;

    list.innerHTML = '';
    if (!messages.length) {
      const empty = document.createElement('li');
      empty.className = 'chat-empty';
      empty.textContent = 'No messages yet. Say hello to the table!';
      list.appendChild(empty);
      return;
    }

    messages.slice(-50).forEach(entry => {
      const item = document.createElement('li');
      item.className = 'chat-item' + (entry.playerId === state.playerId ? ' is-me' : '');
      const name = document.createElement('strong');
      name.className = 'chat-author';
      name.textContent = entry.name;
      const text = document.createElement('span');
      text.className = 'chat-text';
      text.textContent = entry.message;
      item.appendChild(name);
      item.appendChild(text);
      list.appendChild(item);
    });
    list.scrollTop = list.scrollHeight;
  }

  async function sendChatMessage() {
    const input = document.getElementById('chatInput');
    const value = (input ? input.value : '').trim();
    if (!value || !state.room || !state.playerId) return;
    if (value.length > 200) return showToast('Message is too long');

    if (state.isSolo) {
      // Solo tables have no server; keep the conversation locally under the signed-in name.
      const me = getChatParticipants().find(player => player.id === state.playerId);
      state.room.chat = (state.room.chat || []).concat({
        id: `chat_local_${Date.now()}`,
        playerId: state.playerId,
        name: me ? me.name : state.user.name,
        message: value,
        createdAt: Date.now()
      }).slice(-50);
      renderChatMessages(state.room.chat);
      if (input) input.value = '';
      return;
    }

    try {
      const res = await apiPost('/api/rooms/chat', {
        roomCode: state.room.code,
        message: value
      });
      if (state.room) {
        state.room.chat = res.chat || [];
      }
      renderChatMessages(state.room ? state.room.chat : []);
      if (input) input.value = '';
    } catch (err) {
      showToast(err.message);
    }
  }

  // Roll Dice Action Trigger
  async function triggerRollDice() {
    const diceBtn = document.getElementById('btnRollDice');
    const diceCube = document.getElementById('diceCube');
    if (diceBtn.disabled || diceCube.classList.contains('rolling')) return;
    sound.playDiceRoll();
    animateDiceRoll(diceCube);

    if (state.isSolo) {
      if (state.room.gameType === 'ludo') {
        window.LudoEngine.rollDice(state.room.gameState);
        updateGameDisplay();
      } else if (state.room.gameType === 'snakes') {
        const res = window.SnakesEngine.playTurn(state.room.gameState);
        if (res.shortcutType === 'LADDER') sound.playLadder();
        else if (res.shortcutType === 'SNAKE') sound.playSnake();
        else sound.playMove();
        updateGameDisplay(res);
      }
    } else {
      try {
        await apiPost('/api/rooms/action', {
          roomCode: state.room.code,
          action: { type: 'ROLL_DICE' }
        });
      } catch (err) {
        showToast(err.message);
      }
    }
  }

  // Move Token Action Trigger (Ludo)
  async function triggerMoveToken(tokenIdx) {
    sound.playMove();
    if (state.isSolo) {
      const res = window.LudoEngine.moveToken(state.room.gameState, tokenIdx);
      if (res.captured) sound.playCapture();
      updateGameDisplay();
    } else {
      try {
        await apiPost('/api/rooms/action', {
          roomCode: state.room.code,
          action: { type: 'MOVE_TOKEN', tokenIndex: tokenIdx }
        });
      } catch (err) {
        showToast(err.message);
      }
    }
  }

  // =========================================================================
  // 10. TACTILE 2.5D/3D CANVAS BOARD RENDERING
  // =========================================================================
  let canvas = null;
  let ctx = null;
  let boardResizeObserver = null;
  let boardResizeFrame = null;

  function initBoardCanvas() {
    canvas = document.getElementById('boardCanvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');

    const wrapper = document.getElementById('boardCanvasWrapper');
    if (!boardResizeObserver && wrapper && typeof ResizeObserver === 'function') {
      boardResizeObserver = new ResizeObserver(() => {
        cancelAnimationFrame(boardResizeFrame);
        boardResizeFrame = requestAnimationFrame(resizeBoardCanvas);
      });
      boardResizeObserver.observe(wrapper);
    }
    resizeBoardCanvas();

    // Canvas click detection for token selection
    canvas.removeEventListener('click', handleCanvasClick);
    canvas.addEventListener('click', handleCanvasClick);
  }

  function resizeBoardCanvas() {
    if (!canvas || !state.room || state.room.gameType === 'tambola') return;
    const wrapper = document.getElementById('boardCanvasWrapper');
    if (!wrapper) return;
    // clientWidth excludes the decorative border, so canvas pixels map 1:1 to the screen.
    const size = Math.round(wrapper.clientWidth);
    if (size <= 0) return;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const backingSize = Math.max(1, Math.round(size * pixelRatio));
    if (canvas.width === backingSize && canvas.height === backingSize) return;
    canvas.width = backingSize;
    canvas.height = backingSize;
    if (state.room.gameType === 'ludo') renderLudoBoard();
    if (state.room.gameType === 'snakes') renderSnakesBoard();
  }

  function handleCanvasClick(e) {
    if (!state.room || !state.room.gameState) return;
    const gs = state.room.gameState;
    if (state.room.gameType !== 'ludo' || gs.phase !== 'MOVE') return;

    const currentP = gs.players[gs.currentTurnIndex];
    if (currentP.id !== state.playerId) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    // Check which legal token was clicked
    for (const move of gs.legalMoves) {
      const tIdx = move.tokenIndex;
      const step = currentP.tokens[tIdx];
      const pos = getLudoTokenCanvasPos(currentP.teamIndex, step, tIdx);
      const dist = Math.hypot(clickX - pos.x, clickY - pos.y);
      if (dist <= 26) {
        triggerMoveToken(tIdx);
        break;
      }
    }
  }

  // Ludo Board Renderer
  function renderLudoBoard() {
    if (!canvas || !ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    const cellW = w / 15;
    const cellH = h / 15;

    ctx.clearRect(0, 0, w, h);

    // Board background (rich royal mahogany)
    ctx.fillStyle = '#1c1335';
    ctx.fillRect(0, 0, w, h);

    // Draw 4 Yards
    const teamColors = ['#dc2626', '#16a34a', '#ca8a04', '#2563eb'];
    const teamDark = ['#7f1d1d', '#14532d', '#713f12', '#1e3a8a'];

    // Yard Rects (6x6 cells each)
    const yards = [
      { x: 0, y: 0, c: teamColors[0], dark: teamDark[0], name: 'RED (IRON)' },
      { x: 9 * cellW, y: 0, c: teamColors[1], dark: teamDark[1], name: 'GREEN (HULK)' },
      { x: 9 * cellW, y: 9 * cellH, c: teamColors[2], dark: teamDark[2], name: 'YELLOW (THOR)' },
      { x: 0, y: 9 * cellH, c: teamColors[3], dark: teamDark[3], name: 'BLUE (CAP)' }
    ];

    yards.forEach(y => {
      ctx.fillStyle = y.dark;
      ctx.fillRect(y.x, y.y, 6 * cellW, 6 * cellH);
      ctx.fillStyle = y.c;
      ctx.fillRect(y.x + cellW, y.y + cellH, 4 * cellW, 4 * cellH);

      // Yard base circles
      ctx.fillStyle = '#ffffff';
      const cx = y.x + 3 * cellW;
      const cy = y.y + 3 * cellH;
      [
        [-cellW, -cellH], [cellW, -cellH],
        [-cellW, cellH], [cellW, cellH]
      ].forEach(([dx, dy]) => {
        ctx.beginPath();
        ctx.arc(cx + dx, cy + dy, cellW * 0.42, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = y.dark;
        ctx.lineWidth = 2;
        ctx.stroke();
      });
    });

    // Draw Track Tiles (White cells + colored home columns)
    for (let r = 0; r < 15; r++) {
      for (let c = 0; c < 15; c++) {
        // Skip yards and center triangle
        const inYard = (r < 6 && c < 6) || (r < 6 && c >= 9) || (r >= 9 && c < 6) || (r >= 9 && c >= 9);
        const inCenter = (r >= 6 && r <= 8 && c >= 6 && c <= 8);
        if (inYard || inCenter) continue;

        const cellX = c * cellW;
        const cellY = r * cellH;

        ctx.fillStyle = '#261b42';
        ctx.fillRect(cellX, cellY, cellW, cellH);
        ctx.strokeStyle = '#3d2b6b';
        ctx.lineWidth = 1;
        ctx.strokeRect(cellX, cellY, cellW, cellH);

        // Home path fills
        if (r === 7 && c > 0 && c < 6) { ctx.fillStyle = teamColors[0]; ctx.fillRect(cellX, cellY, cellW, cellH); }
        if (c === 7 && r > 0 && r < 6) { ctx.fillStyle = teamColors[1]; ctx.fillRect(cellX, cellY, cellW, cellH); }
        if (c === 7 && r > 8 && r < 14) { ctx.fillStyle = teamColors[2]; ctx.fillRect(cellX, cellY, cellW, cellH); }
        if (r === 7 && c > 8 && c < 14) { ctx.fillStyle = teamColors[3]; ctx.fillRect(cellX, cellY, cellW, cellH); }

        // Start squares
        if (r === 6 && c === 1) { ctx.fillStyle = teamColors[0]; ctx.fillRect(cellX, cellY, cellW, cellH); }
        if (r === 1 && c === 8) { ctx.fillStyle = teamColors[1]; ctx.fillRect(cellX, cellY, cellW, cellH); }
        if (r === 8 && c === 13) { ctx.fillStyle = teamColors[2]; ctx.fillRect(cellX, cellY, cellW, cellH); }
        if (r === 13 && c === 6) { ctx.fillStyle = teamColors[3]; ctx.fillRect(cellX, cellY, cellW, cellH); }
      }
    }

    // Draw Center Home Triangles
    const centerCx = 7.5 * cellW;
    const centerCy = 7.5 * cellH;

    // Red triangle (left)
    ctx.fillStyle = teamColors[0];
    ctx.beginPath();
    ctx.moveTo(6 * cellW, 6 * cellH);
    ctx.lineTo(centerCx, centerCy);
    ctx.lineTo(6 * cellW, 9 * cellH);
    ctx.fill();

    // Green triangle (top)
    ctx.fillStyle = teamColors[1];
    ctx.beginPath();
    ctx.moveTo(6 * cellW, 6 * cellH);
    ctx.lineTo(centerCx, centerCy);
    ctx.lineTo(9 * cellW, 6 * cellH);
    ctx.fill();

    // Yellow triangle (bottom)
    ctx.fillStyle = teamColors[2];
    ctx.beginPath();
    ctx.moveTo(6 * cellW, 9 * cellH);
    ctx.lineTo(centerCx, centerCy);
    ctx.lineTo(9 * cellW, 9 * cellH);
    ctx.fill();

    // Blue triangle (right)
    ctx.fillStyle = teamColors[3];
    ctx.beginPath();
    ctx.moveTo(9 * cellW, 6 * cellH);
    ctx.lineTo(centerCx, centerCy);
    ctx.lineTo(9 * cellW, 9 * cellH);
    ctx.fill();

    // Draw Star Safe Marks
    const stars = [
      { r: 6, c: 1 }, { r: 8, c: 2 }, { r: 1, c: 8 }, { r: 2, c: 6 },
      { r: 8, c: 13 }, { r: 6, c: 12 }, { r: 13, c: 6 }, { r: 12, c: 8 }
    ];
    ctx.fillStyle = '#fef08a';
    ctx.font = `${cellW * 0.65}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    stars.forEach(s => {
      ctx.fillText('★', (s.c + 0.5) * cellW, (s.r + 0.5) * cellH);
    });

    // Draw Tokens for all players
    const gs = state.room.gameState;
    const legalTokenIndices = new Set(
      gs.phase === 'MOVE' && gs.players[gs.currentTurnIndex].id === state.playerId
        ? gs.legalMoves.map(m => m.tokenIndex)
        : []
    );

    gs.players.forEach(p => {
      const pColor = teamColors[p.teamIndex];
      const heroEmblem = p.hero?.symbol || (p.teamIndex === 0 ? '⚛' : (p.teamIndex === 1 ? '✊' : (p.teamIndex === 2 ? '⚡' : '★')));

      p.tokens.forEach((step, tIdx) => {
        const pos = getLudoTokenCanvasPos(p.teamIndex, step, tIdx);
        const isLegal = p.id === state.playerId && legalTokenIndices.has(tIdx);

        // Tactile 3D Pawn
        ctx.save();

        // Pulsing Gold Halo for Legal Moves
        if (isLegal) {
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, cellW * 0.55, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(251, 191, 36, 0.45)';
          ctx.fill();
          ctx.strokeStyle = '#fbbf24';
          ctx.lineWidth = 3;
          ctx.stroke();
        }

        // Drop shadow
        ctx.beginPath();
        ctx.arc(pos.x + 2, pos.y + 4, cellW * 0.38, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fill();

        // Pawn base
        const grad = ctx.createRadialGradient(pos.x - 3, pos.y - 3, 2, pos.x, pos.y, cellW * 0.4);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.3, pColor);
        grad.addColorStop(1, '#0f172a');

        ctx.beginPath();
        ctx.arc(pos.x, pos.y, cellW * 0.38, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Hero Emblem Symbol
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${cellW * 0.42}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(heroEmblem, pos.x, pos.y);

        ctx.restore();
      });
    });
  }

  // Precomputed Ludo Track Coordinates (52 squares)
  const LUDO_TRACK_CELLS = [
    {r:6,c:1},{r:6,c:2},{r:6,c:3},{r:6,c:4},{r:6,c:5},{r:5,c:6},{r:4,c:6},{r:3,c:6},{r:2,c:6},{r:1,c:6},{r:0,c:6},
    {r:0,c:7},{r:0,c:8},
    {r:1,c:8},{r:2,c:8},{r:3,c:8},{r:4,c:8},{r:5,c:8},{r:6,c:9},{r:6,c:10},{r:6,c:11},{r:6,c:12},{r:6,c:13},{r:6,c:14},
    {r:7,c:14},{r:8,c:14},
    {r:8,c:13},{r:8,c:12},{r:8,c:11},{r:8,c:10},{r:8,c:9},{r:9,c:8},{r:10,c:8},{r:11,c:8},{r:12,c:8},{r:13,c:8},{r:14,c:8},
    {r:14,c:7},{r:14,c:6},
    {r:13,c:6},{r:12,c:6},{r:11,c:6},{r:10,c:6},{r:9,c:6},{r:8,c:5},{r:8,c:4},{r:8,c:3},{r:8,c:2},{r:8,c:1},{r:8,c:0},
    {r:7,c:0},{r:6,c:0}
  ];

  function getLudoTokenCanvasPos(teamIndex, stepCount, tokenIndex) {
    const w = canvas.width;
    const cellW = w / 15;
    const cellH = w / 15;

    // In Yard Base (-1)
    if (stepCount === -1) {
      const yardBases = [
        [{r:2,c:2},{r:2,c:4},{r:4,c:2},{r:4,c:4}], // Red
        [{r:2,c:11},{r:2,c:13},{r:4,c:11},{r:4,c:13}], // Green
        [{r:11,c:11},{r:11,c:13},{r:13,c:11},{r:13,c:13}], // Yellow
        [{r:11,c:2},{r:11,c:4},{r:13,c:2},{r:13,c:4}] // Blue
      ];
      const b = yardBases[teamIndex][tokenIndex];
      return { x: b.c * cellW, y: b.r * cellH };
    }

    // Reached Home (56)
    if (stepCount === 56) {
      const homeCenters = [
        { x: 6.8 * cellW, y: 7.5 * cellH },
        { x: 7.5 * cellW, y: 6.8 * cellH },
        { x: 7.5 * cellW, y: 8.2 * cellH },
        { x: 8.2 * cellW, y: 7.5 * cellH }
      ];
      return homeCenters[teamIndex];
    }

    // In Private Home Column (51..55)
    if (stepCount >= 51 && stepCount <= 55) {
      const dist = stepCount - 50; // 1..5
      if (teamIndex === 0) return { x: (dist + 0.5) * cellW, y: 7.5 * cellH };
      if (teamIndex === 1) return { x: 7.5 * cellW, y: (dist + 0.5) * cellH };
      if (teamIndex === 2) return { x: 7.5 * cellW, y: (14 - dist + 0.5) * cellH };
      if (teamIndex === 3) return { x: (14 - dist + 0.5) * cellW, y: 7.5 * cellH };
    }

    // On Main Track (0..50)
    const trackIdx = window.LudoEngine.getAbsoluteTrackIndex(teamIndex, stepCount);
    const cell = LUDO_TRACK_CELLS[trackIdx] || { r: 7, c: 7 };
    return { x: (cell.c + 0.5) * cellW, y: (cell.r + 0.5) * cellH };
  }

  // =========================================================================
  // SNAKES & LADDERS RENDERING
  // Tiles, ladders and snakes are painted once into a cached layer (keyed by size and
  // theme); each update only redraws the tokens on top. All sizes derive from the cell
  // size so the board stays crisp at any resolution.
  // =========================================================================
  const SNAKE_SKINS = [
    { name: 'python', base: '#3d7a24', dark: '#163a0b', light: '#9ccc5a', pattern: 'diamond', patternColor: '#173a0c', patternLight: '#c8dd7a' },
    { name: 'coral', base: '#c0392b', dark: '#4e0f08', light: '#ff8a6a', pattern: 'bands', patternColor: '#151515', patternLight: '#f6c945' },
    { name: 'cobra', base: '#c8962e', dark: '#5a3c0c', light: '#ffe08a', pattern: 'chevron', patternColor: '#4a2f08', patternLight: '#fff1b8' },
    { name: 'viper', base: '#2d6390', dark: '#0f2a44', light: '#86c3ec', pattern: 'blotch', patternColor: '#0b1f33', patternLight: '#bfe2f7' },
    { name: 'amethyst', base: '#7046a8', dark: '#2a1150', light: '#c8a4f0', pattern: 'diamond', patternColor: '#22093f', patternLight: '#e6d2fb' },
    { name: 'rattler', base: '#9a6a34', dark: '#3a230d', light: '#e8c08a', pattern: 'blotch', patternColor: '#2c1806', patternLight: '#f1d9b0' },
    { name: 'mamba', base: '#23806f', dark: '#08362f', light: '#7fe0c8', pattern: 'chevron', patternColor: '#062a24', patternLight: '#c3f2e4' },
    { name: 'krait', base: '#2e2e33', dark: '#0b0b0d', light: '#8a8a95', pattern: 'bands', patternColor: '#f0c929', patternLight: '#fff2a8' }
  ];

  const TOKEN_COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b'];
  const BOARD_LIGHT = { x: -0.55, y: -0.83 }; // light from the upper-left, normalized

  const snakesBoardCache = { key: null, layer: null };

  function snakesCellCenter(cellNumber, cell) {
    const coord = window.SnakesEngine.getCellCoordinates(cellNumber);
    return { x: (coord.col + 0.5) * cell, y: (9 - coord.row + 0.5) * cell };
  }

  function shadeHex(hex, amount) {
    const value = parseInt(hex.slice(1), 16);
    const channel = shift => {
      const c = (value >> shift) & 255;
      return Math.round(amount >= 0 ? c + (255 - c) * amount : c * (1 + amount));
    };
    return `rgb(${channel(16)}, ${channel(8)}, ${channel(0)})`;
  }

  function roundedRectPath(context, x, y, width, height, radius) {
    context.beginPath();
    context.moveTo(x + radius, y);
    context.arcTo(x + width, y, x + width, y + height, radius);
    context.arcTo(x + width, y + height, x, y + height, radius);
    context.arcTo(x, y + height, x, y, radius);
    context.arcTo(x, y, x + width, y, radius);
    context.closePath();
  }

  function drawBoardTiles(context, size, theme, fontFamily) {
    const cell = size / 10;
    const base = context.createLinearGradient(0, 0, size, size);
    base.addColorStop(0, shadeHex(theme.primaryBg, 0.08));
    base.addColorStop(1, shadeHex(theme.primaryBg, -0.35));
    context.fillStyle = base;
    context.fillRect(0, 0, size, size);

    const gap = cell * 0.045;
    for (let n = 1; n <= 100; n++) {
      const coord = window.SnakesEngine.getCellCoordinates(n);
      const x = coord.col * cell + gap;
      const y = (9 - coord.row) * cell + gap;
      const side = cell - gap * 2;
      const alternate = (coord.row + coord.col) % 2 === 0;
      let top = alternate ? shadeHex(theme.gridBg, 0.1) : shadeHex(theme.primaryBg, 0.12);
      let bottom = alternate ? shadeHex(theme.gridBg, -0.18) : shadeHex(theme.primaryBg, -0.12);
      if (n === 1) { top = '#2f9e5f'; bottom = '#16603a'; }
      if (n === 100) { top = '#f4c543'; bottom = '#a8730f'; }

      const fill = context.createLinearGradient(0, y, 0, y + side);
      fill.addColorStop(0, top);
      fill.addColorStop(1, bottom);
      roundedRectPath(context, x, y, side, side, cell * 0.12);
      context.fillStyle = fill;
      context.fill();
      // Bevel: bright top edge, darker bottom edge.
      context.lineWidth = Math.max(1, cell * 0.018);
      context.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      context.stroke();
      context.fillStyle = 'rgba(0, 0, 0, 0.18)';
      context.fillRect(x + cell * 0.08, y + side - cell * 0.03, side - cell * 0.16, cell * 0.02);

      const special = n === 1 || n === 100;
      context.font = `700 ${cell * (special ? 0.17 : 0.2)}px ${fontFamily}`;
      context.textAlign = 'left';
      context.textBaseline = 'top';
      context.fillStyle = special ? 'rgba(255, 255, 255, 0.95)' : (n % 10 === 0 ? theme.accentColor : 'rgba(226, 232, 240, 0.62)');
      context.fillText(String(n), x + cell * 0.07, y + cell * 0.05);
    }

    const start = snakesCellCenter(1, cell);
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.font = `800 ${cell * 0.16}px ${fontFamily}`;
    context.fillStyle = 'rgba(255, 255, 255, 0.92)';
    context.fillText('START', start.x, start.y + cell * 0.18);

    const finish = snakesCellCenter(100, cell);
    context.font = `${cell * 0.42}px ${fontFamily}`;
    context.fillText('👑', finish.x, finish.y + cell * 0.06);
  }

  function drawLadder(context, from, to, cell) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.hypot(dx, dy);
    const ux = dx / length;
    const uy = dy / length;
    const nx = -uy;
    const ny = ux;
    const overhang = cell * 0.2;
    const start = { x: from.x - ux * overhang, y: from.y - uy * overhang };
    const end = { x: to.x + ux * overhang, y: to.y + uy * overhang };
    const halfWidth = cell * 0.18;
    const railWidth = cell * 0.085;
    const rungWidth = cell * 0.06;
    const rungCount = Math.max(2, Math.floor((length + overhang) / (cell * 0.34)));
    const lightSide = nx * BOARD_LIGHT.x + ny * BOARD_LIGHT.y > 0 ? 1 : -1;

    const rail = side => [
      { x: start.x + nx * halfWidth * side, y: start.y + ny * halfWidth * side },
      { x: end.x + nx * halfWidth * side, y: end.y + ny * halfWidth * side }
    ];
    const rungs = [];
    for (let i = 1; i <= rungCount; i++) {
      const t = i / (rungCount + 1);
      const cx = start.x + (end.x - start.x) * t;
      const cy = start.y + (end.y - start.y) * t;
      rungs.push([
        { x: cx - nx * halfWidth, y: cy - ny * halfWidth },
        { x: cx + nx * halfWidth, y: cy + ny * halfWidth }
      ]);
    }
    const strokeSegment = ([a, b], width, color, shiftX = 0, shiftY = 0) => {
      context.beginPath();
      context.moveTo(a.x + shiftX, a.y + shiftY);
      context.lineTo(b.x + shiftX, b.y + shiftY);
      context.lineWidth = width;
      context.strokeStyle = color;
      context.stroke();
    };

    context.save();
    context.lineCap = 'round';

    // Cast shadow of the whole ladder.
    context.save();
    context.shadowColor = 'rgba(0, 0, 0, 0.55)';
    context.shadowBlur = cell * 0.12;
    context.shadowOffsetX = cell * 0.06;
    context.shadowOffsetY = cell * 0.09;
    rungs.forEach(rung => strokeSegment(rung, rungWidth, '#4a2c12'));
    [-1, 1].forEach(side => strokeSegment(rail(side), railWidth, '#4a2c12'));
    context.restore();

    // Rungs sit between the rails: dark wood with a lit upper face.
    rungs.forEach(rung => {
      strokeSegment(rung, rungWidth, '#6b4220');
      strokeSegment(rung, rungWidth * 0.5, '#c98f4c', BOARD_LIGHT.x * rungWidth * 0.18, BOARD_LIGHT.y * rungWidth * 0.18);
    });

    // Rails: dark core, warm body, and a highlight along the side facing the light.
    [-1, 1].forEach(side => {
      const segment = rail(side);
      strokeSegment(segment, railWidth, '#5a3616');
      strokeSegment(segment, railWidth * 0.68, '#a8692e');
      strokeSegment(segment, railWidth * 0.22, 'rgba(255, 214, 150, 0.85)',
        nx * lightSide * railWidth * 0.2, ny * lightSide * railWidth * 0.2);
    });

    // Brass bolts where each rung meets the rails.
    rungs.forEach(rung => rung.forEach(point => {
      const bolt = context.createRadialGradient(point.x - cell * 0.008, point.y - cell * 0.008, 0, point.x, point.y, cell * 0.03);
      bolt.addColorStop(0, '#fff4c2');
      bolt.addColorStop(1, '#a0761c');
      context.beginPath();
      context.arc(point.x, point.y, cell * 0.026, 0, Math.PI * 2);
      context.fillStyle = bolt;
      context.fill();
    }));
    context.restore();
  }

  // Sample a sinuous body from head to tail; the wave fades out at both ends so the
  // head and tail stay pinned to their squares. Advancing `time` sends the wave from
  // head to tail, the way a real snake slithers.
  const SNAKE_WAVE_SPEED = 1.8; // radians per second

  function buildSnakeBody(head, tail, cell, size, seed, time = 0) {
    const dx = tail.x - head.x;
    const dy = tail.y - head.y;
    const length = Math.hypot(dx, dy);
    const nx = -dy / length;
    const ny = dx / length;
    const waves = Math.max(1, Math.round(length / (cell * 2.3)));
    const amplitude = Math.min(cell * 0.45, length * 0.16) * (0.88 + 0.12 * Math.sin(time * 0.9 + seed * 1.3));
    const phase = (seed % 2 ? 0 : Math.PI) - time * SNAKE_WAVE_SPEED;
    const samples = Math.max(48, Math.ceil(length / (cell * 0.06)));
    const margin = cell * 0.2;
    const points = [];
    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      const sway = amplitude * Math.sin(Math.PI * 2 * waves * t + phase) * Math.sin(Math.PI * t);
      points.push({
        x: Math.min(size - margin, Math.max(margin, head.x + dx * t + nx * sway)),
        y: Math.min(size - margin, Math.max(margin, head.y + dy * t + ny * sway)),
        t
      });
    }
    points.restLength = length;
    const maxWidth = cell * 0.34;
    points.forEach((point, i) => {
      const prev = points[Math.max(0, i - 1)];
      const next = points[Math.min(points.length - 1, i + 1)];
      const tx = next.x - prev.x;
      const ty = next.y - prev.y;
      const tl = Math.hypot(tx, ty) || 1;
      point.tx = tx / tl;
      point.ty = ty / tl;
      point.nx = -point.ty;
      point.ny = point.tx;
      // Slim neck behind the head, full body, then a long taper to a pointed tail.
      const t = point.t;
      const neck = t < 0.1 ? 0.78 + 0.22 * (t / 0.1) : 1;
      const taper = t > 0.5 ? Math.pow(1 - (t - 0.5) / 0.5, 0.85) : 1;
      point.half = (maxWidth / 2) * neck * Math.max(0.06, taper);
      point.s = i === 0 ? 0 : points[i - 1].s + Math.hypot(point.x - points[i - 1].x, point.y - points[i - 1].y);
    });
    return points;
  }

  // Interpolated point at a fraction of the body's current arc length. Markings placed
  // by fraction ride along with the skin as the body flexes instead of snapping.
  function snakePointAt(points, fraction, cursor) {
    const target = fraction * points[points.length - 1].s;
    let i = Math.max(1, cursor.index || 1);
    while (i < points.length - 1 && points[i].s < target) i++;
    cursor.index = i;
    const a = points[i - 1];
    const b = points[i];
    const span = b.s - a.s || 1;
    const k = Math.min(1, Math.max(0, (target - a.s) / span));
    const tx = a.tx + (b.tx - a.tx) * k;
    const ty = a.ty + (b.ty - a.ty) * k;
    const tl = Math.hypot(tx, ty) || 1;
    return {
      x: a.x + (b.x - a.x) * k,
      y: a.y + (b.y - a.y) * k,
      tx: tx / tl,
      ty: ty / tl,
      nx: -ty / tl,
      ny: tx / tl,
      half: a.half + (b.half - a.half) * k
    };
  }

  // A strip running along the body between two signed fractions of its half-width.
  function traceBodyStrip(context, points, inner, outer) {
    context.beginPath();
    points.forEach((p, i) => {
      const o = typeof outer === 'function' ? outer(p) : outer;
      const x = p.x + p.nx * p.half * o;
      const y = p.y + p.ny * p.half * o;
      if (i === 0) context.moveTo(x, y); else context.lineTo(x, y);
    });
    for (let i = points.length - 1; i >= 0; i--) {
      const p = points[i];
      const o = typeof inner === 'function' ? inner(p) : inner;
      context.lineTo(p.x + p.nx * p.half * o, p.y + p.ny * p.half * o);
    }
    context.closePath();
  }

  function drawSnakePattern(context, points, skin, cell) {
    const spacing = { diamond: cell * 0.3, bands: cell * 0.2, chevron: cell * 0.24, blotch: cell * 0.28 }[skin.pattern];
    // Mark count comes from the fixed head-to-tail distance, so it never changes mid-animation.
    const count = Math.max(1, Math.floor((points.restLength * 1.08 * 0.9) / spacing));
    const cursor = {};
    for (let index = 1; index <= count; index++) {
      const p = snakePointAt(points, 0.07 + ((index - 0.5) / count) * 0.9, cursor);
      const angle = Math.atan2(p.ty, p.tx);
      context.save();
      context.translate(p.x, p.y);
      context.rotate(angle);
      const w = p.half;
      if (skin.pattern === 'diamond') {
        const l = spacing * 0.48;
        context.beginPath();
        context.moveTo(-l, 0); context.lineTo(0, -w * 0.8); context.lineTo(l, 0); context.lineTo(0, w * 0.8);
        context.closePath();
        context.fillStyle = skin.patternColor;
        context.fill();
        context.beginPath();
        context.moveTo(-l * 0.45, 0); context.lineTo(0, -w * 0.35); context.lineTo(l * 0.45, 0); context.lineTo(0, w * 0.35);
        context.closePath();
        context.fillStyle = skin.patternLight;
        context.globalAlpha = 0.55;
        context.fill();
      } else if (skin.pattern === 'bands') {
        context.fillStyle = index % 2 ? skin.patternColor : skin.patternLight;
        context.fillRect(-spacing * 0.22, -w * 1.2, spacing * 0.44, w * 2.4);
      } else if (skin.pattern === 'chevron') {
        context.beginPath();
        context.moveTo(-spacing * 0.35, -w);
        context.lineTo(spacing * 0.15, 0);
        context.lineTo(-spacing * 0.35, w);
        context.lineWidth = spacing * 0.22;
        context.strokeStyle = skin.patternColor;
        context.stroke();
      } else {
        context.beginPath();
        context.ellipse(0, (index % 2 ? 1 : -1) * w * 0.32, spacing * 0.32, w * 0.42, 0, 0, Math.PI * 2);
        context.fillStyle = skin.patternColor;
        context.fill();
        context.globalAlpha = 0.5;
        context.lineWidth = cell * 0.012;
        context.strokeStyle = skin.patternLight;
        context.stroke();
      }
      context.restore();
    }
  }

  function drawSnakeScales(context, points, cell) {
    const rows = Math.max(1, Math.floor((points.restLength * 1.08) / (cell * 0.065)));
    const cursor = {};
    context.save();
    context.lineWidth = Math.max(0.6, cell * 0.008);
    context.strokeStyle = 'rgba(0, 0, 0, 0.22)';
    // Every scale goes into one path: a single stroke keeps per-frame cost low.
    context.beginPath();
    for (let row = 1; row <= rows; row++) {
      const p = snakePointAt(points, (row - 0.5) / rows, cursor);
      const radius = Math.max(cell * 0.016, p.half * 0.24);
      const back = Math.atan2(-p.ty, -p.tx);
      for (let k = -2; k <= 2; k++) {
        const across = (k + (row % 2 ? 0.5 : 0)) * 0.36;
        if (Math.abs(across) > 0.85) continue;
        const sx = p.x + p.nx * p.half * across;
        const sy = p.y + p.ny * p.half * across;
        context.moveTo(sx + Math.cos(back - 1.1) * radius, sy + Math.sin(back - 1.1) * radius);
        context.arc(sx, sy, radius, back - 1.1, back + 1.1);
      }
    }
    context.stroke();
    context.restore();
  }

  function drawSnakeHead(context, points, skin, cell, seed, time, animated) {
    const head = points[0];
    const neckIndex = Math.min(points.length - 1, Math.ceil(points.length * 0.04));
    const neck = points[neckIndex];
    // The head follows the neck, plus a slow, slight sway of its own while alive.
    const sway = animated ? 0.08 * Math.sin(time * 1.6 + seed * 2.1) : 0;
    const angle = Math.atan2(head.y - neck.y, head.x - neck.x) + sway;
    const length = cell * 0.52;
    const width = points[neckIndex].half * 2 * 1.5;

    context.save();
    context.translate(head.x, head.y);
    context.rotate(angle);
    context.translate(-length * 0.12, 0);

    const outline = () => {
      context.beginPath();
      context.moveTo(-length * 0.28, -width * 0.32);
      context.bezierCurveTo(length * 0.02, -width * 0.66, length * 0.46, -width * 0.58, length * 0.64, -width * 0.2);
      context.quadraticCurveTo(length * 0.75, 0, length * 0.64, width * 0.2);
      context.bezierCurveTo(length * 0.46, width * 0.58, length * 0.02, width * 0.66, -length * 0.28, width * 0.32);
      context.closePath();
    };

    context.save();
    context.shadowColor = 'rgba(0, 0, 0, 0.5)';
    context.shadowBlur = cell * 0.12;
    context.shadowOffsetX = cell * 0.05;
    context.shadowOffsetY = cell * 0.08;
    outline();
    context.fillStyle = skin.base;
    context.fill();
    context.restore();

    // Rounded skull shading, lit from the upper-left in board space.
    const lx = Math.cos(-angle) * BOARD_LIGHT.x - Math.sin(-angle) * BOARD_LIGHT.y;
    const ly = Math.sin(-angle) * BOARD_LIGHT.x + Math.cos(-angle) * BOARD_LIGHT.y;
    const skull = context.createRadialGradient(length * 0.25 + lx * width * 0.25, ly * width * 0.25, width * 0.05,
      length * 0.2, 0, length * 0.75);
    skull.addColorStop(0, skin.light);
    skull.addColorStop(0.45, skin.base);
    skull.addColorStop(1, skin.dark);
    outline();
    context.fillStyle = skull;
    context.fill();
    context.lineWidth = Math.max(1, cell * 0.014);
    context.strokeStyle = 'rgba(0, 0, 0, 0.45)';
    context.stroke();

    // Crown marking on top of the head.
    context.beginPath();
    context.moveTo(length * 0.5, 0);
    context.quadraticCurveTo(length * 0.2, -width * 0.32, -length * 0.15, -width * 0.12);
    context.quadraticCurveTo(length * 0.05, 0, -length * 0.15, width * 0.12);
    context.quadraticCurveTo(length * 0.2, width * 0.32, length * 0.5, 0);
    context.fillStyle = skin.patternColor;
    context.globalAlpha = 0.45;
    context.fill();
    context.globalAlpha = 1;

    // Eyes with vertical slit pupils and a glint.
    [-1, 1].forEach(sideSign => {
      const ex = length * 0.3;
      const ey = sideSign * width * 0.33;
      const eyeR = width * 0.13;
      const iris = context.createRadialGradient(ex - eyeR * 0.3, ey - eyeR * 0.3, eyeR * 0.1, ex, ey, eyeR);
      iris.addColorStop(0, '#fff6a8');
      iris.addColorStop(0.6, '#f2b705');
      iris.addColorStop(1, '#8a5a00');
      context.beginPath();
      context.ellipse(ex, ey, eyeR * 1.15, eyeR, 0, 0, Math.PI * 2);
      context.fillStyle = iris;
      context.fill();
      context.lineWidth = Math.max(1, cell * 0.01);
      context.strokeStyle = '#1a1205';
      context.stroke();
      context.beginPath();
      context.ellipse(ex, ey, eyeR * 0.85, eyeR * 0.22, 0, 0, Math.PI * 2);
      context.fillStyle = '#070502';
      context.fill();
      context.beginPath();
      context.arc(ex - eyeR * 0.35, ey - eyeR * 0.35, eyeR * 0.22, 0, Math.PI * 2);
      context.fillStyle = 'rgba(255, 255, 255, 0.9)';
      context.fill();
    });

    // Nostrils.
    [-1, 1].forEach(sideSign => {
      context.beginPath();
      context.ellipse(length * 0.6, sideSign * width * 0.09, width * 0.035, width * 0.022, 0, 0, Math.PI * 2);
      context.fillStyle = 'rgba(0, 0, 0, 0.65)';
      context.fill();
    });

    // Forked tongue. Animated snakes flick it twice in quick succession on their own
    // rhythm with quivering tips; static boards show it on alternating snakes.
    let reach = 0;
    if (animated) {
      const cycle = 2.4 + (seed % 3) * 0.8;
      const local = (time + seed * 0.77) % cycle;
      const flickWindow = 0.6;
      if (local < flickWindow) reach = Math.pow(Math.sin(Math.PI * 2 * local / flickWindow), 2);
    } else if (seed % 2 === 0) {
      reach = 1;
    }
    if (reach > 0.03) {
      const tip = length * (0.7 + 0.28 * reach);
      const spread = width * 0.14 * reach * (animated ? 0.65 + 0.35 * Math.sin(time * 48 + seed) : 1);
      context.lineCap = 'round';
      context.lineJoin = 'round';
      context.lineWidth = Math.max(1.2, cell * 0.022);
      context.strokeStyle = '#e11d48';
      context.beginPath();
      context.moveTo(length * 0.68, 0);
      context.lineTo(tip, 0);
      context.moveTo(tip, 0);
      context.lineTo(tip + length * 0.14 * reach, -spread);
      context.moveTo(tip, 0);
      context.lineTo(tip + length * 0.14 * reach, spread);
      context.stroke();
    }
    context.restore();
  }

  function drawSnake(context, head, tail, cell, size, seed, time = 0, animated = false) {
    const skin = SNAKE_SKINS[seed % SNAKE_SKINS.length];
    const points = buildSnakeBody(head, tail, cell, size, seed, time);
    const lightAlong = p => Math.max(-1, Math.min(1, p.nx * BOARD_LIGHT.x + p.ny * BOARD_LIGHT.y));

    context.save();
    context.lineJoin = 'round';

    // Body silhouette with its ground shadow.
    context.save();
    context.shadowColor = 'rgba(0, 0, 0, 0.5)';
    context.shadowBlur = cell * 0.14;
    context.shadowOffsetX = cell * 0.06;
    context.shadowOffsetY = cell * 0.1;
    traceBodyStrip(context, points, -1, 1);
    context.fillStyle = skin.base;
    context.fill();
    context.restore();

    context.save();
    traceBodyStrip(context, points, -1, 1);
    context.clip();
    // Belly glimpse on the shadowed flank, then markings and scales.
    traceBodyStrip(context, points, p => -lightAlong(p) * 0.55 - 0.2, p => -lightAlong(p) * 1.1);
    context.fillStyle = shadeHex(skin.base, 0.25);
    context.globalAlpha = 0.25;
    context.fill();
    context.globalAlpha = 1;
    drawSnakePattern(context, points, skin, cell);
    drawSnakeScales(context, points, cell);
    // Cylindrical shading: darken both flanks, then a soft highlight toward the light.
    traceBodyStrip(context, points, 0.45, 1.05);
    context.fillStyle = 'rgba(0, 0, 0, 0.32)';
    context.fill();
    traceBodyStrip(context, points, -1.05, -0.45);
    context.fill();
    traceBodyStrip(context, points, p => lightAlong(p) * 0.25 - 0.12, p => lightAlong(p) * 0.25 + 0.12);
    context.fillStyle = 'rgba(255, 255, 255, 0.28)';
    context.fill();
    context.restore();

    traceBodyStrip(context, points, -1, 1);
    context.lineWidth = Math.max(1, cell * 0.014);
    context.strokeStyle = skin.dark;
    context.globalAlpha = 0.7;
    context.stroke();
    context.restore();

    drawSnakeHead(context, points, skin, cell, seed, time, animated);
  }

  // Tiles and ladders never move, so they are cached; snakes are drawn every frame.
  function getSnakesStaticLayer(size, theme) {
    const key = `${size}:${theme.id}`;
    if (snakesBoardCache.key === key && snakesBoardCache.layer) return snakesBoardCache.layer;

    const layer = document.createElement('canvas');
    layer.width = size;
    layer.height = size;
    const context = layer.getContext('2d');
    const cell = size / 10;
    const fontFamily = getComputedStyle(document.body).fontFamily || 'sans-serif';

    drawBoardTiles(context, size, theme, fontFamily);
    Object.entries(window.SnakesEngine.LADDERS).forEach(([from, to]) => {
      drawLadder(context, snakesCellCenter(Number(from), cell), snakesCellCenter(Number(to), cell), cell);
    });

    snakesBoardCache.key = key;
    snakesBoardCache.layer = layer;
    return layer;
  }

  function drawSnakesToken(context, x, y, radius, color, symbol, isActive, fontFamily) {
    context.save();
    // Contact shadow.
    context.beginPath();
    context.ellipse(x + radius * 0.12, y + radius * 0.82, radius * 0.95, radius * 0.38, 0, 0, Math.PI * 2);
    context.fillStyle = 'rgba(0, 0, 0, 0.4)';
    context.fill();

    if (isActive) {
      context.shadowColor = 'rgba(251, 191, 36, 0.95)';
      context.shadowBlur = radius * 0.9;
    }
    const body = context.createRadialGradient(x - radius * 0.35, y - radius * 0.4, radius * 0.1, x, y, radius);
    body.addColorStop(0, shadeHex(color, 0.55));
    body.addColorStop(0.55, color);
    body.addColorStop(1, shadeHex(color, -0.45));
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fillStyle = body;
    context.fill();
    context.shadowBlur = 0;
    context.lineWidth = radius * 0.13;
    context.strokeStyle = isActive ? '#fde68a' : 'rgba(255, 255, 255, 0.85)';
    context.stroke();

    context.beginPath();
    context.arc(x, y, radius * 0.66, 0, Math.PI * 2);
    context.lineWidth = radius * 0.06;
    context.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    context.stroke();

    context.font = `700 ${radius * 0.95}px ${fontFamily}`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = '#ffffff';
    context.shadowColor = 'rgba(0, 0, 0, 0.6)';
    context.shadowBlur = radius * 0.2;
    context.fillText(symbol, x, y + radius * 0.04);
    context.shadowBlur = 0;

    context.beginPath();
    context.ellipse(x - radius * 0.32, y - radius * 0.42, radius * 0.42, radius * 0.22, -0.5, 0, Math.PI * 2);
    context.fillStyle = 'rgba(255, 255, 255, 0.4)';
    context.fill();
    context.restore();
  }

  // Snakes slither in place while the board is on screen; the loop stops itself when the
  // player leaves, the tab is hidden (rAF pauses), effects are off or motion is reduced.
  const reducedMotionQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  const snakesAnimation = { raf: null, lastFrame: 0, interval: 33, costMs: 0 };

  function snakesAnimationEnabled() {
    return state.effects3D !== false && !(reducedMotionQuery && reducedMotionQuery.matches);
  }

  function ensureSnakesAnimation() {
    if (snakesAnimation.raf || !snakesAnimationEnabled()) return;
    const tick = now => {
      const onBoard = state.view === 'game' && state.room && state.room.gameType === 'snakes' && canvas && ctx;
      if (!onBoard || !snakesAnimationEnabled()) {
        snakesAnimation.raf = null;
        return;
      }
      if (now - snakesAnimation.lastFrame >= snakesAnimation.interval) {
        snakesAnimation.lastFrame = now;
        const started = performance.now();
        drawSnakesFrame(now / 1000);
        // Back off the frame rate on slower devices so the page stays responsive.
        snakesAnimation.costMs = snakesAnimation.costMs * 0.9 + (performance.now() - started) * 0.1;
        snakesAnimation.interval = Math.min(100, Math.max(33, snakesAnimation.costMs * 4));
      }
      snakesAnimation.raf = requestAnimationFrame(tick);
    };
    snakesAnimation.raf = requestAnimationFrame(tick);
  }

  function renderSnakesBoard() {
    if (!canvas || !ctx || !state.room || !state.room.gameState) return;
    drawSnakesFrame(snakesAnimationEnabled() ? performance.now() / 1000 : null);
    ensureSnakesAnimation();
  }

  // time === null draws the classic still pose (effects off or reduced motion).
  function drawSnakesFrame(time) {
    if (!canvas || !ctx || !state.room || !state.room.gameState) return;
    const size = canvas.width;
    const cell = size / 10;
    const gs = state.room.gameState;
    const theme = gs.theme ||
      window.SnakesEngine.THEMES.find(candidate => candidate.id === (gs.rules && gs.rules.themeId)) ||
      window.SnakesEngine.THEMES[0];

    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(getSnakesStaticLayer(size, theme), 0, 0);
    Object.entries(window.SnakesEngine.SNAKES).forEach(([head, tail], index) => {
      drawSnake(ctx, snakesCellCenter(Number(head), cell), snakesCellCenter(Number(tail), cell), cell, size,
        index, time === null ? 0 : time, time !== null);
    });

    // Spread tokens that share a square so each stays visible.
    const fontFamily = getComputedStyle(document.body).fontFamily || 'sans-serif';
    const byCell = new Map();
    gs.players.forEach((player, index) => {
      const cellNumber = player.position || 1;
      if (!byCell.has(cellNumber)) byCell.set(cellNumber, []);
      byCell.get(cellNumber).push({ player, index });
    });
    const layouts = {
      1: [[0, 0]],
      2: [[-0.2, 0], [0.2, 0]],
      3: [[-0.2, 0.14], [0.2, 0.14], [0, -0.18]],
      4: [[-0.2, -0.18], [0.2, -0.18], [-0.2, 0.18], [0.2, 0.18]]
    };
    const currentId = gs.players[gs.currentTurnIndex] && gs.players[gs.currentTurnIndex].id;
    byCell.forEach((occupants, cellNumber) => {
      const center = snakesCellCenter(cellNumber, cell);
      const layout = layouts[Math.min(occupants.length, 4)];
      const radius = cell * (occupants.length > 1 ? 0.2 : 0.28);
      occupants.forEach(({ player, index }, slot) => {
        const [ox, oy] = layout[slot % layout.length];
        drawSnakesToken(ctx, center.x + ox * cell, center.y + oy * cell, radius,
          TOKEN_COLORS[index % TOKEN_COLORS.length], (player.hero && player.hero.symbol) || '♟',
          gs.phase !== 'FINISHED' && player.id === currentId, fontFamily);
      });
    });
  }

  // =========================================================================
  // 11. HOUSIE / TAMBOLA VIEW LOGIC
  // =========================================================================
  function setupTambolaView() {
    const r = state.room;
    const gs = r.gameState;

    // Caller Buttons
    const drawBtn = document.getElementById('btnDrawBall');
    const autoBtn = document.getElementById('btnAutoCallerToggle');
    const isCaller = gs.callerId === state.playerId;

    drawBtn.style.display = isCaller && gs.callerRole !== 'AUTO' ? 'inline-flex' : 'none';
    autoBtn.style.display = isCaller && gs.callerRole === 'AUTO' ? 'inline-flex' : 'none';

    // Build 1-90 Number Grid
    const board = document.getElementById('tambola90Board');
    board.innerHTML = '';
    for (let n = 1; n <= 90; n++) {
      const cell = document.createElement('div');
      cell.className = 'board-cell';
      cell.id = `t_ball_${n}`;
      cell.textContent = n;
      board.appendChild(cell);
    }

    // Build Ticket Grid
    const myTicket = gs.tickets[state.playerId];
    const ticketGrid = document.getElementById('tambolaTicketGrid');
    ticketGrid.innerHTML = '';

    if (myTicket) {
      document.getElementById('ticketIdLabel').textContent = `TICKET #${myTicket.id.slice(-4).toUpperCase()}`;
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 9; c++) {
          const num = myTicket.grid[r][c];
          const cell = document.createElement('div');
          cell.className = `ticket-cell ${num === 0 ? 'blank' : ''}`;
          if (num > 0) {
            cell.textContent = num;
            cell.addEventListener('click', () => {
              cell.classList.toggle('marked');
              sound.playMove();
            });
          }
          ticketGrid.appendChild(cell);
        }
      }
    }

    // Patterns List
    const patternsList = document.getElementById('tambolaPatternsList');
    patternsList.innerHTML = '';
    gs.patterns.forEach(pat => {
      const card = document.createElement('div');
      card.className = `claim-card ${pat.winners.length >= pat.maxWinners ? 'won' : ''}`;
      card.id = `claim_${pat.id}`;
      card.innerHTML = `
        <div class="claim-card-head">
          <div>
            <div style="font-weight:700; font-size:0.95rem; color:var(--text-gold);">${escapeHTML(pat.name)}</div>
            ${pat.popularity ? patternStarsHTML(pat.popularity) : ''}
          </div>
          ${patternPreviewHTML(pat.id)}
        </div>
        <div style="font-size:0.75rem; color:var(--text-muted);">${escapeHTML(pat.description)}</div>
        <div class="claim-status" style="font-size:0.78rem; color:#10b981; margin-top:2px;">
          ${pat.winners.length > 0 ? `Won by: ${pat.winners.map(w => escapeHTML(w.playerName)).join(', ')}` : 'Available'}
        </div>
        <button class="btn btn-primary" style="margin-top:6px; padding:6px 12px; font-size:0.8rem;" ${pat.winners.length >= pat.maxWinners ? 'disabled' : ''}>
          Claim ${escapeHTML(pat.name)}
        </button>
      `;
      card.querySelector('button').addEventListener('click', () => window.claimPattern(pat.id));
      patternsList.appendChild(card);
    });

    const autoButton = document.getElementById('btnAutoCallerToggle');
    if (!state.tambolaAutoTimer) autoButton.textContent = `▶ Auto-Call (${gs.autoIntervalSeconds || 7}s)`;
  }

  function updateTambolaDisplay() {
    const gs = state.room.gameState;
    if (!gs) return;

    // Current ball
    document.getElementById('tambolaCurrentBall').textContent = gs.currentBall || '--';
    document.getElementById('tambolaBallsCount').textContent = gs.drawnBalls.length;

    // Update 1-90 board
    gs.drawnBalls.forEach(n => {
      const cell = document.getElementById(`t_ball_${n}`);
      if (cell) cell.classList.add('called');
    });

    if (gs.currentBall) {
      document.querySelectorAll('.board-cell.latest').forEach(c => c.classList.remove('latest'));
      const latestCell = document.getElementById(`t_ball_${gs.currentBall}`);
      if (latestCell) latestCell.classList.add('latest');
    }

    // Update patterns status
    gs.patterns.forEach(pat => {
      const card = document.getElementById(`claim_${pat.id}`);
      if (!card) return;
      const status = card.querySelector('.claim-status');
      if (status && pat.winners.length > 0) {
        status.textContent = `Won by: ${pat.winners.map(w => w.playerName).join(', ')}`;
      }
      if (pat.winners.length >= pat.maxWinners) {
        card.classList.add('won');
        const btn = card.querySelector('button');
        if (btn) btn.disabled = true;
      }
    });
  }

  window.claimPattern = async function (patternId) {
    if (state.isSolo) {
      const res = window.TambolaEngine.claimWin(state.room.gameState, state.playerId, patternId);
      if (res.success) {
        sound.playVictory();
        showToast(`🎉 Valid Claim! You won ${res.winRecord.patternName}!`);
      } else {
        showToast(`❌ ${res.reason}`);
      }
      updateTambolaDisplay();
    } else {
      try {
        const res = await apiPost('/api/rooms/action', {
          roomCode: state.room.code,
          action: { type: 'CLAIM_WIN', patternId: patternId }
        });
        if (res.actionResult && res.actionResult.success) {
          sound.playVictory();
          showToast(`🎉 Valid Claim Accepted!`);
        } else {
          showToast(res.actionResult ? res.actionResult.reason : 'Claim could not be verified');
        }
      } catch (err) {
        showToast(err.message);
      }
    }
  };

  async function triggerDrawBall() {
    sound.playBallDraw();
    if (state.isSolo) {
      const res = window.TambolaEngine.drawNextBall(state.room.gameState, state.playerId);
      updateTambolaDisplay();
      if (res.finished) showResultsModal();
    } else {
      try {
        await apiPost('/api/rooms/action', {
          roomCode: state.room.code,
          action: { type: 'DRAW_BALL' }
        });
      } catch (err) {
        showToast(err.message);
      }
    }
  }

  // =========================================================================
  // 12. MATCH RESULTS & REMATCH
  // =========================================================================
  function showResultsModal() {
    sound.playVictory();
    const gs = state.room.gameState;
    const podium = document.getElementById('resultsPodium');
    podium.innerHTML = '';

    let rankings = gs.winnerRankings || [];
    const isTambola = state.room.gameType === 'tambola';
    if (isTambola) {
      const winnerIds = [];
      const tierIds = ['full_house', 'second_full_house', 'third_full_house'];
      const fullHouseWins = tierIds
        .map(id => gs.patterns.find(pattern => pattern.id === id))
        .filter(Boolean)
        .flatMap(pattern => pattern.winners);
      const otherWins = gs.patterns
        .filter(pattern => !tierIds.includes(pattern.id))
        .flatMap(pattern => pattern.winners)
        .sort((a, b) => a.timestamp - b.timestamp);
      const orderedWins = [...fullHouseWins, ...otherWins];
      orderedWins.forEach(win => {
        if (!winnerIds.includes(win.playerId)) winnerIds.push(win.playerId);
      });
      rankings = winnerIds;
    }
    const fallbackPlayers = isTambola ? [] : gs.players;
    const p1 = gs.players.find(p => p.id === rankings[0]) || fallbackPlayers[0] || null;
    const p2 = gs.players.find(p => p.id === rankings[1]) || fallbackPlayers[1] || null;
    const p3 = gs.players.find(p => p.id === rankings[2]) || fallbackPlayers[2] || null;
    document.getElementById('resultsSubtitle').textContent =
      isTambola && rankings.length === 0
        ? 'All balls were called without a winning claim.'
        : 'Match concluded with royal honor.';

    const steps = [
      { player: p2, rank: 2, label: '2nd' },
      { player: p1, rank: 1, label: '1st 👑' },
      { player: p3, rank: 3, label: '3rd' }
    ];

    steps.forEach(s => {
      if (!s.player) return;
      const stepEl = document.createElement('div');
      stepEl.className = `podium-step rank-${s.rank}`;
      stepEl.innerHTML = `
        <div style="font-weight:700; font-size:0.85rem; margin-bottom:4px; color:#fff;">${escapeHTML(s.player.name)}</div>
        <div class="podium-pillar">${s.label}</div>
      `;
      podium.appendChild(stepEl);
    });

    openModal('modalResults');
  }

  // =========================================================================
  // 13. EVENT LISTENERS & INITIALIZATION
  // =========================================================================
  const HEROES_LIST = [
    { id: 'iron_man', name: 'Iron Armor', symbol: '⚛' },
    { id: 'captain_america', name: 'Vibranium Shield', symbol: '★' },
    { id: 'hulk', name: 'Gamma Titan', symbol: '✊' },
    { id: 'thor', name: 'Thunder God', symbol: '⚡' }
  ];

  async function leaveCurrentRoom() {
    const roomCode = state.room && state.room.code;
    if (!roomCode) {
      switchView('landing');
      return;
    }

    if (!state.isSolo) {
      try {
        await apiPost('/api/rooms/leave', { roomCode }, { noRecover: true });
      } catch (err) {
        // A room the server no longer knows about (or a seat it already released) is
        // already left; anything else is a real failure worth surfacing.
        if (!isRoomMissingError(err) && err.status !== 401) {
          showToast(`Unable to leave room: ${err.message}`);
          return;
        }
      }
    }

    clearLocalRoom(roomCode);
    switchView('landing');
  }

  function initApp() {
    updateNavProfile();
    setupHeroPickers();

    // Phones suspend background tabs; check the room as soon as the player is back.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') ensureRoomConnection();
    });
    window.addEventListener('online', () => ensureRoomConnection());

    const activityBox = document.querySelector('.activity-feed-box');
    if (activityBox && typeof ResizeObserver === 'function') {
      new ResizeObserver(() => fitActivityFeed()).observe(activityBox);
    }

    // Mute toggle
    const muteBtn = document.getElementById('btnToggleSound');
    muteBtn.addEventListener('click', () => {
      sound.muted = !sound.muted;
      safeStorage.setItem('myarena_muted', sound.muted);
      muteBtn.textContent = sound.muted ? '🔇' : '🔊';
      showToast(sound.muted ? 'Sound Muted' : 'Sound Enabled');
    });
    muteBtn.textContent = sound.muted ? '🔇' : '🔊';

    // 3D effects toggle
    const fxBtn = document.getElementById('btnToggleEffects');
    fxBtn.addEventListener('click', () => {
      state.effects3D = !state.effects3D;
      safeStorage.setItem('myarena_3d', state.effects3D);
      showToast(state.effects3D ? '3D Lighting Enabled' : 'Flat 2D High-Performance Mode');
      if (state.view === 'game' && state.room && state.room.gameType === 'snakes') renderSnakesBoard();
    });

    // Landing Page Buttons
    document.getElementById('btnNavHome').addEventListener('click', () => {
      if (state.room) {
        leaveCurrentRoom();
      } else {
        switchView('landing');
      }
    });
    document.getElementById('btnOpenCreateModal').addEventListener('click', () => {
      const gameType = document.getElementById('selectGameType').value;
      renderRuleConfig(gameType);
      updatePlayerCapacityOptions(gameType);
      openModal('modalCreateRoom');
    });
    document.getElementById('btnOpenJoinModal').addEventListener('click', () => openModal('modalJoinRoom'));
    document.getElementById('btnQuickSoloLudo').addEventListener('click', () => startSoloGame('ludo', {}));

    document.getElementById('selectGameType').addEventListener('change', (e) => {
      renderRuleConfig(e.target.value);
      updatePlayerCapacityOptions(e.target.value);
    });

    // Play Catalog Buttons
    document.querySelectorAll('.btn-play-game').forEach(btn => {
      btn.addEventListener('click', () => {
        const game = btn.getAttribute('data-game');
        document.getElementById('selectGameType').value = game;
        renderRuleConfig(game);
        updatePlayerCapacityOptions(game);
        openModal('modalCreateRoom');
      });
    });

    // Create Room Submit
    document.getElementById('btnSubmitCreateRoom').addEventListener('click', createRoomAction);

    // Join Room Submit
    document.getElementById('btnSubmitJoinRoom').addEventListener('click', () => joinRoomAction());

    // Profile Edit
    document.getElementById('btnEditProfile').addEventListener('click', () => {
      document.getElementById('inputProfileName').value = state.user.name;
      openModal('modalProfile');
    });

    document.getElementById('btnSaveProfile').addEventListener('click', () => {
      const newName = document.getElementById('inputProfileName').value.trim();
      if (newName) {
        state.user.name = newName;
        safeStorage.setItem('myarena_name', newName);
        updateNavProfile();
        closeModal('modalProfile');
        showToast('Identity updated');
      }
    });

    // Lobby Buttons
    document.getElementById('btnCopyRoomLink').addEventListener('click', () => {
      const link = `${window.location.origin}${window.location.pathname}?room=${state.room.code}`;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(link);
      }
      showToast(`📋 Copied Invite Link: ${link}`);
    });

    document.getElementById('btnToggleReady').addEventListener('click', async () => {
      const myP = state.room.players.find(p => p.id === state.playerId);
      const nextReady = !myP.isReady;
      if (state.isSolo) {
        myP.isReady = nextReady;
        renderLobby();
      } else {
        try {
          await apiPost('/api/rooms/ready', {
            roomCode: state.room.code,
            isReady: nextReady
          });
          myP.isReady = nextReady;
          renderLobby();
        } catch (err) {
          showToast(err.message);
        }
      }
    });

    document.getElementById('btnStartGame').addEventListener('click', async () => {
      if (state.isSolo) {
        setupGameView();
        switchView('game');
      } else {
        try {
          const res = await apiPost('/api/rooms/start', {
            roomCode: state.room.code
          });
          state.room = res.room;
          setupGameView();
          switchView('game');
        } catch (err) {
          showToast(err.message);
        }
      }
    });

    document.getElementById('btnLeaveLobby').addEventListener('click', leaveCurrentRoom);
    document.getElementById('btnReturnLobby').addEventListener('click', leaveCurrentRoom);

    // In-Game Buttons
    document.getElementById('btnRollDice').addEventListener('click', triggerRollDice);
    document.getElementById('diceCube').addEventListener('click', triggerRollDice);
    document.getElementById('diceCube').addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        triggerRollDice();
      }
    });
    document.getElementById('chatForm').addEventListener('submit', async event => {
      event.preventDefault();
      await sendChatMessage();
    });
    document.getElementById('btnDrawBall').addEventListener('click', triggerDrawBall);

    // Auto-caller toggle for Tambola
    document.getElementById('btnAutoCallerToggle').addEventListener('click', () => {
      const gs = state.room && state.room.gameState;
      const seconds = (gs && gs.autoIntervalSeconds) || 7;
      if (state.tambolaAutoTimer) {
        clearInterval(state.tambolaAutoTimer);
        state.tambolaAutoTimer = null;
        document.getElementById('btnAutoCallerToggle').textContent = `▶ Auto-Call (${seconds}s)`;
        showToast('Auto-Caller Paused');
      } else {
        state.tambolaAutoTimer = setInterval(triggerDrawBall, seconds * 1000);
        document.getElementById('btnAutoCallerToggle').textContent = '⏸ Pause Auto-Call';
        showToast(`Auto-Caller Started (${seconds}s interval)`);
      }
    });

    wireTambolaSetup();

    // Rematch Button
    document.getElementById('btnPlayAgain').addEventListener('click', async () => {
      closeModal('modalResults');
      if (state.isSolo) {
        startSoloGame(state.room.gameType, state.room.rules);
      } else {
        try {
          await apiPost('/api/rooms/rematch', {
            roomCode: state.room.code
          });
        } catch (err) {
          showToast(err.message);
        }
      }
    });

    document.getElementById('btnResultsBackLobby').addEventListener('click', () => {
      closeModal('modalResults');
      leaveCurrentRoom();
    });

    // Check URL parameters for direct room joining (?room=ROYAL-XXXX)
    const urlParams = new URLSearchParams(window.location.search);
    const roomParam = urlParams.get('room');
    if (roomParam) {
      document.getElementById('inputJoinCode').value = roomParam;
      openModal('modalJoinRoom');
    }
  }

  window.addEventListener('DOMContentLoaded', initApp);
})();
