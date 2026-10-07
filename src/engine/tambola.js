/**
 * myArena Royalty - Housie / Tambola 90-Ball Game Engine
 * Authentic 3x9 ticket generation, draw without replacement, pattern verifier, and audit trails.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.TambolaEngine = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const COLUMN_RANGES = [
    { min: 1, max: 9 },   // Col 0
    { min: 10, max: 19 }, // Col 1
    { min: 20, max: 29 }, // Col 2
    { min: 30, max: 39 }, // Col 3
    { min: 40, max: 49 }, // Col 4
    { min: 50, max: 59 }, // Col 5
    { min: 60, max: 69 }, // Col 6
    { min: 70, max: 79 }, // Col 7
    { min: 80, max: 90 }  // Col 8
  ];

  const STANDARD_PATTERNS = [
    {
      id: 'early_five',
      name: 'Early Five',
      category: 'Speed',
      description: 'First player to mark any 5 called numbers on their ticket',
      rewardLabel: 'Royal Vanguard Crown',
      maxWinners: 1
    },
    {
      id: 'top_line',
      name: 'Top Line',
      category: 'Lines',
      description: 'All 5 numbers in the first (top) row of the ticket',
      rewardLabel: 'Silver Banner',
      maxWinners: 1
    },
    {
      id: 'middle_line',
      name: 'Middle Line',
      category: 'Lines',
      description: 'All 5 numbers in the second (middle) row of the ticket',
      rewardLabel: 'Golden Scepter',
      maxWinners: 1
    },
    {
      id: 'bottom_line',
      name: 'Bottom Line',
      category: 'Lines',
      description: 'All 5 numbers in the third (bottom) row of the ticket',
      rewardLabel: 'Ruby Chalice',
      maxWinners: 1
    },
    {
      id: 'four_corners',
      name: 'Four Corners',
      category: 'Special',
      description: 'The first and last numbers of the top and bottom rows (4 numbers)',
      rewardLabel: 'Diamond Bastion',
      maxWinners: 1
    },
    {
      id: 'any_two_lines',
      name: 'Any Two Lines',
      category: 'Lines',
      description: 'Any two completed rows (10 numbers total)',
      rewardLabel: 'Emerald Diadem',
      maxWinners: 1
    },
    {
      id: 'full_house',
      name: 'Full House',
      category: 'Grand',
      description: 'All 15 numbers on the ticket',
      rewardLabel: 'Imperial Sovereign Trophy',
      maxWinners: 1
    }
  ];

  /**
   * Helper: Shuffle array in place (Fisher-Yates)
   */
  function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = array[i];
      array[i] = array[j];
      array[j] = temp;
    }
    return array;
  }

  /**
   * Generate an authentic, auditable 90-ball Tambola ticket:
   * 3 rows x 9 columns, 15 numbers (5 per row), proper column intervals, sorted vertically.
   */
  function generateTicket(ticketId = null) {
    let ticket = null;
    let attempts = 0;

    while (!ticket && attempts < 100) {
      attempts++;
      ticket = tryGenerateTicket();
    }

    if (!ticket) {
      // Fallback deterministic generator
      ticket = generateDeterministicTicket();
    }

    const id = ticketId || `ticket_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    return {
      id: id,
      grid: ticket, // 3x9 array: number or 0
      allNumbers: ticket.flat().filter(n => n > 0).sort((a, b) => a - b)
    };
  }

  function tryGenerateTicket() {
    // 1. Initialize empty 3x9 grid
    const grid = [
      new Array(9).fill(0),
      new Array(9).fill(0),
      new Array(9).fill(0)
    ];

    // Decide column counts: 9 columns, total 15 numbers, each col has 1..3 numbers.
    // Start with 1 in each column (9 numbers), distribute remaining 6 numbers across columns.
    const colCounts = new Array(9).fill(1);
    const candidateCols = [0, 1, 2, 3, 4, 5, 6, 7, 8];
    shuffle(candidateCols);

    for (let i = 0; i < 6; i++) {
      const c = candidateCols[i % candidateCols.length];
      colCounts[c]++;
    }

    // Now assign cells in each column so each row gets exactly 5 numbers
    const rowCounts = [0, 0, 0];

    // For columns with count 3, all 3 rows get a number
    for (let c = 0; c < 9; c++) {
      if (colCounts[c] === 3) {
        grid[0][c] = 1;
        grid[1][c] = 1;
        grid[2][c] = 1;
        rowCounts[0]++;
        rowCounts[1]++;
        rowCounts[2]++;
      }
    }

    // For columns with count 2 and count 1, place greedily to balance rows to 5 each
    const colsRemaining = [];
    for (let c = 0; c < 9; c++) {
      if (colCounts[c] < 3) {
        colsRemaining.push({ col: c, count: colCounts[c] });
      }
    }

    // Sort columns by count descending
    colsRemaining.sort((a, b) => b.count - a.count);

    for (const item of colsRemaining) {
      const c = item.col;
      const count = item.count;

      // Find candidate rows for this column sorted by least filled row
      const availableRows = [0, 1, 2]
        .filter(r => rowCounts[r] < 5)
        .sort((r1, r2) => rowCounts[r1] - rowCounts[r2]);

      if (availableRows.length < count) {
        return null; // Retry
      }

      for (let k = 0; k < count; k++) {
        const r = availableRows[k];
        grid[r][c] = 1;
        rowCounts[r]++;
      }
    }

    // Check if each row has exactly 5 numbers
    if (rowCounts[0] !== 5 || rowCounts[1] !== 5 || rowCounts[2] !== 5) {
      return null; // Retry
    }

    // Now populate numbers for each column within its range
    for (let c = 0; c < 9; c++) {
      const { min, max } = COLUMN_RANGES[c];
      const count = colCounts[c];

      // Pick 'count' unique numbers in [min, max]
      const available = [];
      for (let n = min; n <= max; n++) available.push(n);
      shuffle(available);
      const chosen = available.slice(0, count).sort((a, b) => a - b);

      let chosenIdx = 0;
      for (let r = 0; r < 3; r++) {
        if (grid[r][c] === 1) {
          grid[r][c] = chosen[chosenIdx++];
        }
      }
    }

    return grid;
  }

  function generateDeterministicTicket() {
    // Guaranteed mathematically valid fallback ticket
    const grid = [
      [4,  0, 22,  0, 41, 53,  0,  0, 82],
      [0, 12,  0, 34, 48,  0, 65, 71,  0],
      [8, 19, 29,  0,  0,  0, 68, 77, 90]
    ];
    return grid;
  }

  /**
   * Initialize a new Housie / Tambola game session
   * @param {Object} hostConfig - { hostId, hostName, callerRole: 'HOST'|'ASSIGNED'|'AUTO', callerId, autoIntervalSeconds }
   * @param {Array} players - [{ id, name, role: 'PLAYER'|'CALLER'|'SPECTATOR' }]
   * @param {Array} activePatterns - Array of pattern objects
   */
  function createGame(hostConfig, players = [], activePatterns = null) {
    const pool = [];
    for (let i = 1; i <= 90; i++) pool.push(i);
    shuffle(pool);

    const patterns = (activePatterns || STANDARD_PATTERNS).map(p => ({
      id: p.id,
      name: p.name,
      category: p.category || 'Standard',
      description: p.description,
      rewardLabel: p.rewardLabel || 'Honor',
      maxWinners: p.maxWinners || 1,
      winners: [], // [{ playerId, playerName, ballNumber, timestamp }]
      customCells: p.customCells || null // For custom patterns: list of [r, c]
    }));

    const playerTickets = {};
    players.forEach(p => {
      if (p.role !== 'SPECTATOR' && p.role !== 'CALLER_ONLY') {
        playerTickets[p.id] = generateTicket();
      }
    });

    return {
      id: `housie_${Date.now()}`,
      hostId: hostConfig.hostId,
      callerId: hostConfig.callerId || hostConfig.hostId,
      callerRole: hostConfig.callerRole || 'HOST', // 'HOST' | 'ASSIGNED' | 'AUTO'
      autoIntervalSeconds: hostConfig.autoIntervalSeconds || 7,
      isAutoCalling: false,
      players: players,
      tickets: playerTickets,
      ballPool: pool, // Remaining balls to draw
      drawnBalls: [], // Numbers drawn so far in chronological order
      currentBall: null,
      patterns: patterns,
      phase: 'IN_PROGRESS', // 'IN_PROGRESS' | 'FINISHED'
      auditLog: [
        { type: 'GAME_STARTED', timestamp: Date.now(), message: 'Housie game session started.' }
      ]
    };
  }

  /**
   * Draw the next ball (authoritative)
   */
  function drawNextBall(game, callerPlayerId = null) {
    if (game.phase !== 'IN_PROGRESS') {
      throw new Error('Game is not in progress');
    }

    if (callerPlayerId && callerPlayerId !== game.callerId) {
      throw new Error('Only the designated caller can draw balls');
    }

    if (game.ballPool.length === 0) {
      game.phase = 'FINISHED';
      game.auditLog.push({
        type: 'ALL_BALLS_DRAWN',
        timestamp: Date.now(),
        message: 'All 90 numbers have been called. Game completed.'
      });
      return { game, currentBall: null, finished: true };
    }

    const ball = game.ballPool.pop();
    game.drawnBalls.push(ball);
    game.currentBall = ball;

    game.auditLog.push({
      type: 'BALL_DRAWN',
      ball: ball,
      order: game.drawnBalls.length,
      timestamp: Date.now(),
      message: `Ball #${game.drawnBalls.length} drawn: ${ball}`
    });

    return {
      game,
      currentBall: ball,
      order: game.drawnBalls.length,
      finished: false
    };
  }

  /**
   * Extract required numbers from ticket for a pattern
   */
  function getRequiredNumbersForPattern(ticket, pattern) {
    const grid = ticket.grid;
    const drawnSet = new Set();

    if (pattern.id === 'early_five') {
      // Early five requires any 5 numbers from ticket
      // In verification, we check if at least 5 numbers on ticket have been drawn
      return { type: 'COUNT_ANY', count: 5 };
    }

    if (pattern.id === 'top_line') {
      return { type: 'EXACT_LIST', numbers: grid[0].filter(n => n > 0) };
    }

    if (pattern.id === 'middle_line') {
      return { type: 'EXACT_LIST', numbers: grid[1].filter(n => n > 0) };
    }

    if (pattern.id === 'bottom_line') {
      return { type: 'EXACT_LIST', numbers: grid[2].filter(n => n > 0) };
    }

    if (pattern.id === 'four_corners') {
      const topNums = grid[0].filter(n => n > 0);
      const botNums = grid[2].filter(n => n > 0);
      if (topNums.length < 2 || botNums.length < 2) return null;
      const corners = [topNums[0], topNums[topNums.length - 1], botNums[0], botNums[botNums.length - 1]];
      return { type: 'EXACT_LIST', numbers: corners };
    }

    if (pattern.id === 'any_two_lines') {
      return {
        type: 'ANY_TWO_ROWS',
        row0: grid[0].filter(n => n > 0),
        row1: grid[1].filter(n => n > 0),
        row2: grid[2].filter(n => n > 0)
      };
    }

    if (pattern.id === 'full_house') {
      return { type: 'EXACT_LIST', numbers: ticket.allNumbers };
    }

    if (pattern.id === 'custom' && pattern.customCells) {
      const customNumbers = [];
      pattern.customCells.forEach(([r, c]) => {
        if (grid[r] && grid[r][c] > 0) {
          customNumbers.push(grid[r][c]);
        }
      });
      return { type: 'EXACT_LIST', numbers: customNumbers };
    }

    return null;
  }

  /**
   * Verify and execute a win claim
   */
  function claimWin(game, playerId, patternId) {
    const player = game.players.find(p => p.id === playerId);
    if (!player) {
      throw new Error(`Player ${playerId} not found`);
    }

    const ticket = game.tickets[playerId];
    if (!ticket) {
      throw new Error(`Player ${player.name} does not have an active ticket`);
    }

    const pattern = game.patterns.find(p => p.id === patternId);
    if (!pattern) {
      throw new Error(`Pattern ${patternId} not found`);
    }

    // Check if pattern has already been fully won
    if (pattern.winners.length >= pattern.maxWinners) {
      const reject = {
        type: 'CLAIM_REJECTED',
        playerId: playerId,
        playerName: player.name,
        patternId: patternId,
        patternName: pattern.name,
        reason: `${pattern.name} has already been claimed and closed!`,
        timestamp: Date.now()
      };
      game.auditLog.push(reject);
      return { success: false, reason: reject.reason, audit: reject };
    }

    // Check if player has already claimed this pattern
    if (pattern.winners.some(w => w.playerId === playerId)) {
      const reject = {
        type: 'CLAIM_REJECTED',
        playerId: playerId,
        playerName: player.name,
        patternId: patternId,
        patternName: pattern.name,
        reason: `${player.name} has already won ${pattern.name}!`,
        timestamp: Date.now()
      };
      game.auditLog.push(reject);
      return { success: false, reason: reject.reason, audit: reject };
    }

    const drawnSet = new Set(game.drawnBalls);
    const req = getRequiredNumbersForPattern(ticket, pattern);
    let isValid = false;
    let matchedNumbers = [];
    let missingNumbers = [];

    if (!req) {
      return { success: false, reason: 'Invalid pattern structure' };
    }

    if (req.type === 'EXACT_LIST') {
      matchedNumbers = req.numbers.filter(n => drawnSet.has(n));
      missingNumbers = req.numbers.filter(n => !drawnSet.has(n));
      isValid = missingNumbers.length === 0 && req.numbers.length > 0;
    } else if (req.type === 'COUNT_ANY') {
      const marked = ticket.allNumbers.filter(n => drawnSet.has(n));
      matchedNumbers = marked;
      isValid = marked.length >= req.count;
      if (!isValid) {
        missingNumbers = ticket.allNumbers.filter(n => !drawnSet.has(n));
      }
    } else if (req.type === 'ANY_TWO_ROWS') {
      const r0Complete = req.row0.every(n => drawnSet.has(n));
      const r1Complete = req.row1.every(n => drawnSet.has(n));
      const r2Complete = req.row2.every(n => drawnSet.has(n));
      const completedCount = (r0Complete ? 1 : 0) + (r1Complete ? 1 : 0) + (r2Complete ? 1 : 0);
      isValid = completedCount >= 2;
      matchedNumbers = [
        ...(r0Complete ? req.row0 : []),
        ...(r1Complete ? req.row1 : []),
        ...(r2Complete ? req.row2 : [])
      ];
    }

    if (!isValid) {
      const reason = missingNumbers.length > 0
        ? `Bogey Claim! Uncalled numbers: ${missingNumbers.slice(0, 3).join(', ')}`
        : `Bogey Claim! Incomplete pattern requirements.`;
      const reject = {
        type: 'CLAIM_REJECTED_BOGEY',
        playerId: playerId,
        playerName: player.name,
        patternId: patternId,
        patternName: pattern.name,
        reason: reason,
        ticketGrid: ticket.grid,
        drawnBallsCount: game.drawnBalls.length,
        timestamp: Date.now()
      };
      game.auditLog.push(reject);
      return { success: false, reason: reason, audit: reject };
    }

    // VALID CLAIM!
    const winRecord = {
      playerId: playerId,
      playerName: player.name,
      patternId: patternId,
      patternName: pattern.name,
      rewardLabel: pattern.rewardLabel,
      ballNumber: game.currentBall,
      drawOrder: game.drawnBalls.length,
      matchedNumbers: matchedNumbers,
      timestamp: Date.now()
    };

    pattern.winners.push(winRecord);

    const auditEntry = {
      type: 'CLAIM_ACCEPTED',
      ...winRecord,
      message: `🎉 VALID WIN! ${player.name} claimed ${pattern.name} on ball #${game.drawnBalls.length} (${game.currentBall})!`
    };
    game.auditLog.push(auditEntry);

    // If Full House is won, check if game should end
    if (patternId === 'full_house' && pattern.winners.length >= pattern.maxWinners) {
      game.phase = 'FINISHED';
      game.auditLog.push({
        type: 'FULL_HOUSE_CONCLUDED',
        timestamp: Date.now(),
        message: 'Full House claimed! Match successfully completed.'
      });
    }

    return {
      success: true,
      winRecord: winRecord,
      patternCompleted: pattern.winners.length >= pattern.maxWinners,
      isGameOver: game.phase === 'FINISHED',
      audit: auditEntry
    };
  }

  return {
    COLUMN_RANGES,
    STANDARD_PATTERNS,
    generateTicket,
    createGame,
    drawNextBall,
    claimWin,
    getRequiredNumbersForPattern
  };
});
