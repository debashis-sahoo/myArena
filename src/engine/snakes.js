/**
 * myArena Royalty - Snakes and Ladders Game Engine
 * Authoritative state machine for 1-4 players + AI with 100-cell serpentine board.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.SnakesEngine = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const BOARD_SIZE = 100;

  // Non-overlapping verified snakes & ladders layout
  const LADDERS = {
    4: 14,
    9: 31,
    20: 38,
    28: 84,
    40: 59,
    51: 67,
    63: 81,
    71: 91
  };

  const SNAKES = {
    17: 7,
    54: 34,
    62: 19,
    64: 60,
    87: 24,
    93: 73,
    95: 75,
    99: 78
  };

  const THEMES = [
    {
      id: 'royal_gold',
      name: 'Royal Arena Gold',
      primaryBg: '#1e1135',
      gridBg: '#2a1a4a',
      accentColor: '#fbbf24',
      snakeColor: '#ef4444',
      ladderColor: '#38bdf8'
    },
    {
      id: 'mystic_palace',
      name: 'Mystic Palace Emerald',
      primaryBg: '#064e3b',
      gridBg: '#065f46',
      accentColor: '#34d399',
      snakeColor: '#f97316',
      ladderColor: '#facc15'
    },
    {
      id: 'cyber_arena',
      name: 'Cyber Sapphire',
      primaryBg: '#0f172a',
      gridBg: '#1e293b',
      accentColor: '#60a5fa',
      snakeColor: '#ec4899',
      ladderColor: '#a855f7'
    }
  ];

  const HEROES = [
    { id: 'iron_hero', name: 'Iron Armor', color: '#e62429', symbol: '⚛', teamColor: 'red' },
    { id: 'cap_shield', name: 'Vibranium Captain', color: '#2563eb', symbol: '★', teamColor: 'blue' },
    { id: 'gamma_giant', name: 'Gamma Titan', color: '#16a34a', symbol: '✊', teamColor: 'green' },
    { id: 'thunder_god', name: 'Thunder Champion', color: '#eab308', symbol: '⚡', teamColor: 'yellow' }
  ];

  const DEFAULT_RULES = {
    finishMode: 'exact_stay', // 'exact_stay' | 'exact_bounce' | 'overshoot_wins'
    bonusOnSix: true,
    themeId: 'royal_gold'
  };

  /**
   * Compute (x, y) percentages (0..100) for cell number 1..100 on standard serpentine board
   */
  function getCellCoordinates(cellNum) {
    if (cellNum < 1) cellNum = 1;
    if (cellNum > 100) cellNum = 100;
    const row = Math.floor((cellNum - 1) / 10); // 0 (bottom) to 9 (top)
    const colInRow = (cellNum - 1) % 10;
    const col = (row % 2 === 0) ? colInRow : (9 - colInRow);
    return {
      xPercent: (col + 0.5) * 10,
      yPercent: (9 - row + 0.5) * 10,
      row,
      col
    };
  }

  /**
   * Create new Snakes & Ladders game
   */
  function createGame(players, customRules = {}) {
    if (!players || players.length < 1 || players.length > 4) {
      throw new Error('Snakes and Ladders requires 1 to 4 players');
    }

    const rules = Object.assign({}, DEFAULT_RULES, customRules);
    const theme = THEMES.find(t => t.id === rules.themeId) || THEMES[0];

    const validatedPlayers = players.map((p, idx) => {
      const hero = HEROES[idx % HEROES.length];
      return {
        id: p.id || `sl_p_${idx}`,
        name: p.name || `Player ${idx + 1}`,
        hero: HEROES.find(h => h.id === p.heroId) || hero,
        isAI: Boolean(p.isAI),
        position: 0, // 0 = off board (waiting to enter), or 1 = starting square
        rank: null
      };
    });

    return {
      id: `snakes_${Date.now()}`,
      rules: rules,
      theme: theme,
      players: validatedPlayers,
      currentTurnIndex: 0,
      phase: 'ROLL', // 'ROLL' | 'FINISHED'
      currentDice: null,
      lastRoll: null,
      rollSeq: 0,
      winnerRankings: [],
      lastAction: { type: 'INIT', message: 'Snakes and Ladders match initialized.' },
      turnCount: 1,
      history: []
    };
  }

  /**
   * Roll dice and atomically execute move for Snakes and Ladders
   */
  function playTurn(game, forcedRoll = null) {
    if (game.phase !== 'ROLL') {
      throw new Error(`Cannot play turn in phase: ${game.phase}`);
    }

    const currentPlayer = game.players[game.currentTurnIndex];
    let roll = forcedRoll;
    if (typeof roll !== 'number' || roll < 1 || roll > 6) {
      const cryptoApi = typeof globalThis !== 'undefined' ? globalThis.crypto : null;
      if (cryptoApi && typeof cryptoApi.getRandomValues === 'function') {
        const sample = new Uint32Array(1);
        const unbiasedLimit = Math.floor(0x100000000 / 6) * 6;
        do {
          cryptoApi.getRandomValues(sample);
        } while (sample[0] >= unbiasedLimit);
        roll = (sample[0] % 6) + 1;
      } else {
        roll = Math.floor(Math.random() * 6) + 1;
      }
    }

    game.currentDice = roll;
    game.rollSeq = (game.rollSeq || 0) + 1;
    game.lastRoll = { seq: game.rollSeq, value: roll, playerId: currentPlayer.id };

    const startPos = currentPlayer.position;
    let targetPos = startPos + roll;
    let finishReached = false;
    let bounceAmount = 0;

    // Handle Finish Behavior
    if (targetPos === BOARD_SIZE) {
      finishReached = true;
    } else if (targetPos > BOARD_SIZE) {
      if (game.rules.finishMode === 'exact_bounce') {
        bounceAmount = targetPos - BOARD_SIZE;
        targetPos = BOARD_SIZE - bounceAmount;
      } else if (game.rules.finishMode === 'exact_stay') {
        // Did not roll exact number to 100; token stays in place
        targetPos = startPos;
      } else if (game.rules.finishMode === 'overshoot_wins') {
        targetPos = BOARD_SIZE;
        finishReached = true;
      }
    }

    // Handle Shortcuts (Ladders / Snakes)
    let shortcutType = null;
    let finalPos = targetPos;

    if (finalPos < BOARD_SIZE) {
      if (LADDERS[finalPos]) {
        shortcutType = 'LADDER';
        finalPos = LADDERS[finalPos];
      } else if (SNAKES[finalPos]) {
        shortcutType = 'SNAKE';
        finalPos = SNAKES[finalPos];
      }
    }

    if (finalPos === BOARD_SIZE) {
      finishReached = true;
    }

    currentPlayer.position = finalPos;

    let extraTurn = game.rules.bonusOnSix && roll === 6 && !finishReached;

    // Check winner
    if (finishReached && currentPlayer.rank === null) {
      const rank = game.winnerRankings.length + 1;
      currentPlayer.rank = rank;
      game.winnerRankings.push(currentPlayer.id);
      game.phase = 'FINISHED';
      game.lastAction = {
        type: 'PLAYER_WON',
        player: currentPlayer.name,
        roll: roll,
        fromPos: startPos,
        toPos: finalPos,
        rank: rank,
        message: `👑 ${currentPlayer.name} rolled a ${roll} and reached square 100 to win the championship!`
      };
      game.history.push(game.lastAction);
      return { game, roll, fromPos: startPos, toPos: finalPos, shortcutType, isGameOver: true, extraTurn: false };
    }

    let message = `${currentPlayer.name} rolled ${roll} and moved from ${startPos} to ${targetPos}.`;
    if (bounceAmount > 0) {
      message = `${currentPlayer.name} rolled ${roll}, overshot 100 and bounced back to ${targetPos}.`;
    }
    if (shortcutType === 'LADDER') {
      message += ` Climbed ladder from ${targetPos} to ${finalPos}! 🪜`;
    } else if (shortcutType === 'SNAKE') {
      message += ` Bitten by snake at ${targetPos}! Slid down to ${finalPos}! 🐍`;
    }
    if (extraTurn) {
      message += ` Rolled a 6, bonus turn granted!`;
    }

    game.lastAction = {
      type: 'MOVE',
      player: currentPlayer.name,
      roll: roll,
      fromPos: startPos,
      intermediatePos: targetPos,
      toPos: finalPos,
      shortcutType: shortcutType,
      extraTurn: extraTurn,
      message: message
    };
    game.history.push(game.lastAction);

    if (!extraTurn) {
      game.currentTurnIndex = (game.currentTurnIndex + 1) % game.players.length;
      game.turnCount += 1;
    }

    return {
      game,
      roll,
      fromPos: startPos,
      intermediatePos: targetPos,
      toPos: finalPos,
      shortcutType,
      extraTurn,
      isGameOver: false
    };
  }

  return {
    BOARD_SIZE,
    LADDERS,
    SNAKES,
    THEMES,
    HEROES,
    DEFAULT_RULES,
    getCellCoordinates,
    createGame,
    playTurn
  };
});
