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
    keepaliveTimer: null
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
          <span>Caller Role</span>
          <select id="ruleTambolaCaller" class="input-select" style="min-height:36px; padding:4px 8px;">
            <option value="HOST" selected>Host Controlled Manual Draw</option>
            <option value="AUTO">Automatic Caller (Timer)</option>
          </select>
        </div>
        <div class="rule-row">
          <span>Active Winning Combinations</span>
          <div style="font-size:0.8rem; color:var(--text-gold); text-align:right;">
            Early 5, Top Line, Middle Line, Bottom Line, Corners, Full House
          </div>
        </div>
      `;
    }

  }

  function updatePlayerCapacityOptions(gameType) {
    const select = document.getElementById('selectMaxPlayers');
    const maxPlayers = gameType === 'tambola' ? 8 : 4;
    Array.from(select.options).forEach(option => {
      option.disabled = Number(option.value) > maxPlayers;
    });
    if (Number(select.value) > maxPlayers) {
      select.value = String(maxPlayers);
    }
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
      return {
        callerRole: document.getElementById('ruleTambolaCaller')?.value || 'HOST',
        autoIntervalSeconds: 7
      };
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
      badgeContainer.innerHTML = `
        <span class="meta-tag">90-Ball Tambola</span>
        <span class="meta-tag">Caller: ${escapeHTML(r.rules.callerRole || 'HOST')}</span>
        <span class="meta-tag">Auto-Claim Verification: Enabled</span>
      `;
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
  function startSoloGame(gameType, rules) {
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
        { hostId: 'player_human', callerRole: rules.callerRole || 'HOST' },
        players
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
    const size = Math.round(wrapper.getBoundingClientRect().width);
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

  // Snakes & Ladders Board Renderer
  function renderSnakesBoard() {
    if (!canvas || !ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    const cellW = w / 10;
    const cellH = h / 10;

    ctx.clearRect(0, 0, w, h);

    // Grid Checkerboard
    for (let i = 1; i <= 100; i++) {
      const coord = window.SnakesEngine.getCellCoordinates(i);
      const isEven = (coord.row + coord.col) % 2 === 0;
      ctx.fillStyle = isEven ? '#1f1638' : '#2b1c4e';
      ctx.fillRect(coord.col * cellW, (9 - coord.row) * cellH, cellW, cellH);

      ctx.strokeStyle = '#432e73';
      ctx.lineWidth = 1;
      ctx.strokeRect(coord.col * cellW, (9 - coord.row) * cellH, cellW, cellH);

      // Cell Number
      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(i, coord.col * cellW + 3, (9 - coord.row) * cellH + 3);
    }

    // Draw Ladders (blue glowing rails with golden rungs)
    const ladders = window.SnakesEngine.LADDERS;
    for (const [start, end] of Object.entries(ladders)) {
      const p1 = window.SnakesEngine.getCellCoordinates(parseInt(start, 10));
      const p2 = window.SnakesEngine.getCellCoordinates(parseInt(end, 10));

      const x1 = (p1.col + 0.5) * cellW;
      const y1 = (9 - p1.row + 0.5) * cellH;
      const x2 = (p2.col + 0.5) * cellW;
      const y2 = (9 - p2.row + 0.5) * cellH;

      ctx.save();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(x1 - 8, y1);
      ctx.lineTo(x2 - 8, y2);
      ctx.moveTo(x1 + 8, y1);
      ctx.lineTo(x2 + 8, y2);
      ctx.stroke();

      // Rungs
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2.5;
      const steps = 7;
      for (let s = 1; s < steps; s++) {
        const t = s / steps;
        const rx = x1 + (x2 - x1) * t;
        const ry = y1 + (y2 - y1) * t;
        ctx.beginPath();
        ctx.moveTo(rx - 8, ry);
        ctx.lineTo(rx + 8, ry);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Draw Snakes (curved slithering red/emerald body)
    const snakes = window.SnakesEngine.SNAKES;
    for (const [head, tail] of Object.entries(snakes)) {
      const p1 = window.SnakesEngine.getCellCoordinates(parseInt(head, 10));
      const p2 = window.SnakesEngine.getCellCoordinates(parseInt(tail, 10));

      const hx = (p1.col + 0.5) * cellW;
      const hy = (9 - p1.row + 0.5) * cellH;
      const tx = (p2.col + 0.5) * cellW;
      const ty = (9 - p2.row + 0.5) * cellH;

      ctx.save();
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(hx, hy);
      const midX = (hx + tx) / 2 + (Math.sin(hx) * 30);
      const midY = (hy + ty) / 2;
      ctx.quadraticCurveTo(midX, midY, tx, ty);
      ctx.stroke();

      // Snake Head (circle with eyes)
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(hx, hy, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(hx - 3, hy - 3, 2.5, 0, Math.PI * 2);
      ctx.arc(hx + 3, hy - 3, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Draw Players
    const gs = state.room.gameState;
    const teamColors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b'];
    gs.players.forEach((p, idx) => {
      const posNum = p.position || 1;
      const coord = window.SnakesEngine.getCellCoordinates(posNum);
      const offset = (idx - (gs.players.length - 1) / 2) * 8;
      const px = (coord.col + 0.5) * cellW + offset;
      const py = (9 - coord.row + 0.5) * cellH;

      ctx.save();
      ctx.beginPath();
      ctx.arc(px, py, cellW * 0.36, 0, Math.PI * 2);
      ctx.fillStyle = teamColors[idx % teamColors.length];
      ctx.fill();
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.hero?.symbol || '♟', px, py);
      ctx.restore();
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
        <div style="font-weight:700; font-size:0.95rem; color:var(--text-gold);">${escapeHTML(pat.name)}</div>
        <div style="font-size:0.75rem; color:var(--text-muted);">${escapeHTML(pat.description)}</div>
        <div style="font-size:0.78rem; color:#10b981; margin-top:2px;">
          ${pat.winners.length > 0 ? `Won by: ${pat.winners.map(w => escapeHTML(w.playerName)).join(', ')}` : 'Available'}
        </div>
        <button class="btn btn-primary" style="margin-top:6px; padding:6px 12px; font-size:0.8rem;" ${pat.winners.length >= pat.maxWinners ? 'disabled' : ''}>
          Claim ${escapeHTML(pat.name)}
        </button>
      `;
      card.querySelector('button').addEventListener('click', () => window.claimPattern(pat.id));
      patternsList.appendChild(card);
    });
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
      if (card && pat.winners.length >= pat.maxWinners) {
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
      const fullHouse = gs.patterns.find(pattern => pattern.id === 'full_house');
      const fullHouseWins = (fullHouse ? fullHouse.winners : [])
        .slice()
        .sort((a, b) => a.timestamp - b.timestamp);
      const otherWins = gs.patterns
        .filter(pattern => pattern.id !== 'full_house')
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
      if (state.tambolaAutoTimer) {
        clearInterval(state.tambolaAutoTimer);
        state.tambolaAutoTimer = null;
        document.getElementById('btnAutoCallerToggle').textContent = '▶ Auto-Call (7s)';
        showToast('Auto-Caller Paused');
      } else {
        state.tambolaAutoTimer = setInterval(triggerDrawBall, 7000);
        document.getElementById('btnAutoCallerToggle').textContent = '⏸ Pause Auto-Call';
        showToast('Auto-Caller Started (7s interval)');
      }
    });

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
