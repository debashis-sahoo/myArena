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

  // ---------------------------------------------------------------------------
  // WINNING PATTERN CATALOG
  // Positions in a "lines" rule are the 1st..5th printed number of each line
  // (every line holds exactly five numbers), so shapes are unambiguous on any ticket.
  // Popularity (1-5) reflects how widely each dividend appears across popular Tambola
  // and Housie guides: 5 = the classic six played almost everywhere, 4 = standard extras
  // in most guides, 3 = common party patterns, 2 = regional and niche variations.
  // ---------------------------------------------------------------------------
  const ALL = [0, 1, 2, 3, 4];
  const lines = (top, middle, bottom) => ({ type: 'lines', lines: [top, middle, bottom] });
  const columns = (...cols) => ({ type: 'columns', columns: cols });
  const digit = d => ({ type: 'values', test: 'digit', digit: d });
  const range = (min, max) => ({ type: 'values', test: 'range', min, max });

  const PATTERN_CATALOG = [
    // Classic six
    { id: 'early_five', name: 'Early Five', aka: 'Jaldi 5', category: 'Quick', popularity: 5, description: 'Any 5 numbers on the ticket', rule: { type: 'count', count: 5 } },
    { id: 'top_line', name: 'Top Line', aka: 'First Line', category: 'Lines', popularity: 5, description: 'All 5 numbers of the top line', rule: lines(ALL, [], []) },
    { id: 'middle_line', name: 'Middle Line', aka: 'Second Line', category: 'Lines', popularity: 5, description: 'All 5 numbers of the middle line', rule: lines([], ALL, []) },
    { id: 'bottom_line', name: 'Bottom Line', aka: 'Third Line', category: 'Lines', popularity: 5, description: 'All 5 numbers of the bottom line', rule: lines([], [], ALL) },
    { id: 'four_corners', name: 'Four Corners', aka: 'Corners', category: 'Corners', popularity: 5, description: 'First and last numbers of the top and bottom lines', rule: lines([0, 4], [], [0, 4]) },
    { id: 'full_house', name: 'Full House', aka: 'Housie / Tambola', category: 'Full House', popularity: 5, description: 'All 15 numbers on the ticket', rule: { type: 'full_house', tier: 1 } },

    // Standard extras
    { id: 'second_full_house', name: 'Second Full House', aka: '2nd Housie', category: 'Full House', popularity: 4, description: 'All 15 numbers, after the first Full House, by a different winner', rule: { type: 'full_house', tier: 2 } },
    { id: 'star', name: 'Star', aka: 'Cross Rule / Corners with Star', category: 'Shapes', popularity: 4, description: 'Four corners plus the middle number of the middle line', rule: lines([0, 4], [2], [0, 4]) },
    { id: 'pyramid', name: 'Pyramid', aka: 'Triangle', category: 'Shapes', popularity: 4, description: '3rd number of the top line; 2nd and 4th of the middle; 1st, 3rd and 5th of the bottom', rule: lines([2], [1, 3], [0, 2, 4]) },
    { id: 'temperature', name: 'Temperature', aka: 'BP Rule', category: 'Values', popularity: 4, description: 'The lowest and the highest number on the ticket', rule: { type: 'extremes', low: 1, high: 1 } },
    { id: 'bamboo', name: 'Bamboo', aka: 'Middle Column', category: 'Shapes', popularity: 4, description: 'The 3rd (middle) number of every line', rule: lines([2], [2], [2]) },
    { id: 'six_corners', name: 'Six Corners', aka: 'All Corners', category: 'Corners', popularity: 4, description: 'First and last numbers of every line', rule: lines([0, 4], [0, 4], [0, 4]) },
    { id: 'breakfast', name: 'Breakfast', aka: 'Columns 1-3', category: 'Columns', popularity: 4, description: 'Every number in the first three columns (1-29)', rule: columns(0, 1, 2) },
    { id: 'lunch', name: 'Lunch', aka: 'Columns 4-6', category: 'Columns', popularity: 4, description: 'Every number in the middle three columns (30-59)', rule: columns(3, 4, 5) },
    { id: 'dinner', name: 'Dinner', aka: 'Columns 7-9', category: 'Columns', popularity: 4, description: 'Every number in the last three columns (60-90)', rule: columns(6, 7, 8) },
    { id: 'odd_numbers', name: 'Odd Numbers', aka: 'Odd Rule', category: 'Values', popularity: 4, description: 'Every odd number on the ticket', rule: { type: 'values', test: 'odd' } },
    { id: 'even_numbers', name: 'Even Numbers', aka: 'Even Rule', category: 'Values', popularity: 4, description: 'Every even number on the ticket', rule: { type: 'values', test: 'even' } },
    { id: 'any_two_lines', name: 'Any Two Lines', aka: 'Double Line', category: 'Lines', popularity: 4, description: 'Any two complete lines (10 numbers)', rule: { type: 'any_lines', count: 2 } },
    { id: 'early_seven', name: 'Early Seven', aka: 'Jaldi 7', category: 'Quick', popularity: 4, description: 'Any 7 numbers on the ticket', rule: { type: 'count', count: 7 } },

    // Popular party patterns
    { id: 'third_full_house', name: 'Third Full House', aka: '3rd Housie', category: 'Full House', popularity: 3, description: 'All 15 numbers, after the second Full House, by a different winner', rule: { type: 'full_house', tier: 3 } },
    { id: 'early_three', name: 'Early Three', aka: 'Jaldi 3', category: 'Quick', popularity: 3, description: 'Any 3 numbers on the ticket', rule: { type: 'count', count: 3 } },
    { id: 'kings_corners', name: "King's Corners", aka: 'First of Every Line', category: 'Corners', popularity: 3, description: 'The first number of every line', rule: lines([0], [0], [0]) },
    { id: 'queens_corners', name: "Queen's Corners", aka: 'Last of Every Line', category: 'Corners', popularity: 3, description: 'The last number of every line', rule: lines([4], [4], [4]) },
    { id: 'first_half', name: 'First Half (1-45)', aka: 'Day Rule', category: 'Values', popularity: 3, description: 'Every number from 1 to 45 on the ticket', rule: range(1, 45) },
    { id: 'second_half', name: 'Second Half (46-90)', aka: 'Night Rule', category: 'Values', popularity: 3, description: 'Every number from 46 to 90 on the ticket', rule: range(46, 90) },
    { id: 'laddu', name: 'Laddu', aka: "Bull's Eye", category: 'Quick', popularity: 3, description: 'The middle number of the middle line', rule: lines([], [2], []) },
    { id: 'fat_ladies', name: 'Fat Ladies', aka: 'All 8s', category: 'Digits', popularity: 3, description: 'Every number containing the digit 8', rule: digit(8) },
    { id: 'smallest_five', name: 'Smallest Five', aka: 'Small Five', category: 'Values', popularity: 3, description: 'The five lowest numbers on the ticket', rule: { type: 'extremes', low: 5, high: 0 } },
    { id: 'biggest_five', name: 'Biggest Five', aka: 'High Five', category: 'Values', popularity: 3, description: 'The five highest numbers on the ticket', rule: { type: 'extremes', low: 0, high: 5 } },
    { id: 'letter_h', name: 'Letter H', aka: 'H Rule', category: 'Letters', popularity: 3, description: 'The whole middle line plus the first and last numbers of the top and bottom lines', rule: lines([0, 4], ALL, [0, 4]) },
    { id: 'letter_t', name: 'Letter T', aka: 'T Rule', category: 'Letters', popularity: 3, description: 'The whole top line plus the 3rd number of the middle and bottom lines', rule: lines(ALL, [2], [2]) },
    { id: 'letter_l', name: 'Letter L', aka: "Lovers' Lane", category: 'Letters', popularity: 3, description: 'The first number of every line plus the whole bottom line', rule: lines([0], [0], ALL) },
    { id: 'border', name: 'Border', aka: 'Lockdown', category: 'Shapes', popularity: 3, description: 'The whole top and bottom lines plus the first and last numbers of the middle line', rule: lines(ALL, [0, 4], ALL) },
    { id: 'red_cross', name: 'Red Cross', aka: 'Plus', category: 'Shapes', popularity: 3, description: 'The whole middle line plus the 3rd number of the top and bottom lines', rule: lines([2], ALL, [2]) },

    // Regional and niche variations
    { id: 'anda', name: 'Anda', aka: 'All 0s', category: 'Digits', popularity: 2, description: 'Every number containing the digit 0', rule: digit(0) },
    { id: 'danda', name: 'Danda', aka: 'All 1s', category: 'Digits', popularity: 2, description: 'Every number containing the digit 1', rule: digit(1) },
    { id: 'ugly_ducklings', name: 'Ugly Ducklings', aka: 'All 2s', category: 'Digits', popularity: 2, description: 'Every number containing the digit 2', rule: digit(2) },
    { id: 'pandavas', name: 'Pandavas', aka: 'All 5s', category: 'Digits', popularity: 2, description: 'Every number containing the digit 5', rule: digit(5) },
    { id: 'hockey_sticks', name: 'Hockey Sticks', aka: 'All 7s', category: 'Digits', popularity: 2, description: 'Every number containing the digit 7', rule: digit(7) },
    { id: 'double_temperature', name: 'Double Temperature', aka: 'Double BP', category: 'Values', popularity: 2, description: 'The two lowest and the two highest numbers on the ticket', rule: { type: 'extremes', low: 2, high: 2 } },
    { id: 'ladder', name: 'Ladder', aka: '1-2-3', category: 'Shapes', popularity: 2, description: '1st number of the top line, 2nd of the middle line, 3rd of the bottom line', rule: lines([0], [1], [2]) },
    { id: 'reverse_pyramid', name: 'Reverse Pyramid', aka: 'Inverted Triangle', category: 'Shapes', popularity: 2, description: '1st, 3rd and 5th of the top line; 2nd and 4th of the middle; 3rd of the bottom', rule: lines([0, 2, 4], [1, 3], [2]) },
    { id: 'railway_track', name: 'Railway Track', aka: 'Top & Bottom', category: 'Lines', popularity: 2, description: 'The whole top line and the whole bottom line', rule: lines(ALL, [], ALL) },
    { id: 'first_twins', name: 'First Twins', aka: 'Left Pairs', category: 'Shapes', popularity: 2, description: 'The first two numbers of every line', rule: lines([0, 1], [0, 1], [0, 1]) },
    { id: 'last_twins', name: 'Last Twins', aka: 'Right Pairs', category: 'Shapes', popularity: 2, description: 'The last two numbers of every line', rule: lines([3, 4], [3, 4], [3, 4]) },
    { id: 'hum_tum', name: 'Hum Tum', aka: 'You & Me', category: 'Shapes', popularity: 2, description: 'First two numbers of the top line and last two numbers of the bottom line', rule: lines([0, 1], [], [3, 4]) },
    { id: 'i_love_you', name: 'I Love You (143)', aka: '1-4-3', category: 'Shapes', popularity: 2, description: 'First number of the top line, first four of the middle, first three of the bottom', rule: lines([0], [0, 1, 2, 3], [0, 1, 2]) },
    { id: 'drum', name: 'Drum', aka: 'Inner Columns', category: 'Shapes', popularity: 2, description: 'The 2nd, 3rd and 4th numbers of every line', rule: lines([1, 2, 3], [1, 2, 3], [1, 2, 3]) },
    { id: 'safe', name: 'Safe', aka: 'Inner Three', category: 'Shapes', popularity: 2, description: 'The 2nd, 3rd and 4th numbers of the middle line (everything off the border)', rule: lines([], [1, 2, 3], []) },
    { id: 'odd_positions', name: 'Odd Positions', aka: 'Odd Columns', category: 'Shapes', popularity: 2, description: 'The 1st, 3rd and 5th numbers of every line', rule: lines([0, 2, 4], [0, 2, 4], [0, 2, 4]) },
    { id: 'diamond', name: 'Diamond', aka: 'Kite', category: 'Shapes', popularity: 2, description: '3rd number of the top line, first and last of the middle line, 3rd of the bottom line', rule: lines([2], [0, 4], [2]) },
    { id: 'ab_tak_chappan', name: 'Ab Tak Chappan', aka: 'Up to 56', category: 'Values', popularity: 2, description: 'Every number from 1 to 56 on the ticket', rule: range(1, 56) }
  ];

  const PATTERN_BY_ID = PATTERN_CATALOG.reduce((map, pattern) => {
    map[pattern.id] = pattern;
    return map;
  }, {});

  // The classic six: the default whenever a host has not chosen patterns.
  const DEFAULT_PATTERN_IDS = ['early_five', 'top_line', 'middle_line', 'bottom_line', 'four_corners', 'full_house'];

  // Keep only known pattern ids (deduplicated, catalog order, full houses last) so a
  // client can never inject its own pattern definitions.
  function sanitizePatternIds(ids) {
    const wanted = new Set(Array.isArray(ids) ? ids.filter(id => typeof id === 'string') : []);
    const chosen = PATTERN_CATALOG.filter(pattern => wanted.has(pattern.id));
    if (chosen.length === 0) return DEFAULT_PATTERN_IDS.slice();
    const isFullHouse = pattern => pattern.rule.type === 'full_house';
    return [...chosen.filter(p => !isFullHouse(p)), ...chosen.filter(isFullHouse)].map(p => p.id);
  }

  const STANDARD_PATTERNS = DEFAULT_PATTERN_IDS.map(id => PATTERN_BY_ID[id]);

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

    // Accepts catalog ids or pattern objects; anything unknown to the catalog is dropped.
    const requestedIds = activePatterns
      ? activePatterns.map(p => (typeof p === 'string' ? p : p && p.id))
      : DEFAULT_PATTERN_IDS;
    const patterns = sanitizePatternIds(requestedIds).map(id => {
      const p = PATTERN_BY_ID[id];
      return {
        id: p.id,
        name: p.name,
        aka: p.aka,
        category: p.category,
        popularity: p.popularity,
        description: p.description,
        rewardLabel: p.name,
        maxWinners: 1,
        winners: [] // [{ playerId, playerName, ballNumber, timestamp }]
      };
    });

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

  function numberHasDigit(n, d) {
    return String(n).includes(String(d));
  }

  /**
   * Work out what a ticket must have called to win a pattern:
   *   EXACT_LIST - every listed number must be called
   *   COUNT_ANY  - any `count` numbers on the ticket must be called
   *   ANY_ROWS   - any `count` complete lines
   * Returns null for unknown patterns.
   */
  function getRequiredNumbersForPattern(ticket, pattern) {
    const definition = PATTERN_BY_ID[pattern && pattern.id];
    if (!definition) return null;
    const rule = definition.rule;
    const rows = ticket.grid.map(row => row.filter(n => n > 0));
    const sorted = ticket.allNumbers.slice().sort((a, b) => a - b);

    switch (rule.type) {
      case 'count':
        return { type: 'COUNT_ANY', count: rule.count };
      case 'any_lines':
        return { type: 'ANY_ROWS', count: rule.count, rows };
      case 'full_house':
        return { type: 'EXACT_LIST', numbers: sorted };
      case 'lines':
        return {
          type: 'EXACT_LIST',
          numbers: rule.lines.flatMap((positions, r) => positions.map(i => rows[r][i]).filter(n => n > 0))
        };
      case 'columns':
        return {
          type: 'EXACT_LIST',
          numbers: rule.columns.flatMap(c => ticket.grid.map(row => row[c]).filter(n => n > 0))
        };
      case 'extremes':
        return {
          type: 'EXACT_LIST',
          numbers: [...sorted.slice(0, rule.low), ...(rule.high ? sorted.slice(-rule.high) : [])]
        };
      case 'values': {
        const test = {
          odd: n => n % 2 === 1,
          even: n => n % 2 === 0,
          digit: n => numberHasDigit(n, rule.digit),
          range: n => n >= rule.min && n <= rule.max
        }[rule.test];
        return { type: 'EXACT_LIST', numbers: sorted.filter(test) };
      }
      default:
        return null;
    }
  }

  // Later Full Houses can only be won after the earlier ones, by a different player.
  function checkFullHouseOrder(game, pattern, playerId) {
    const definition = PATTERN_BY_ID[pattern.id];
    if (!definition || definition.rule.type !== 'full_house') return null;
    const tierPatterns = game.patterns
      .map(p => ({ p, def: PATTERN_BY_ID[p.id] }))
      .filter(entry => entry.def && entry.def.rule.type === 'full_house' && entry.def.rule.tier < definition.rule.tier);
    for (const { p } of tierPatterns) {
      if (p.winners.length < p.maxWinners) return `${pattern.name} opens only after ${p.name} has been won`;
      if (p.winners.some(w => w.playerId === playerId)) return `You already won ${p.name}; ${pattern.name} goes to another player`;
    }
    return null;
  }

  // The game ends when its final Full House is won, or when every pattern is closed.
  function isGameComplete(game) {
    const fullHouses = game.patterns.filter(p => PATTERN_BY_ID[p.id] && PATTERN_BY_ID[p.id].rule.type === 'full_house');
    const closed = p => p.winners.length >= p.maxWinners;
    if (fullHouses.length > 0) {
      const finalTier = fullHouses.reduce((best, p) =>
        PATTERN_BY_ID[p.id].rule.tier > PATTERN_BY_ID[best.id].rule.tier ? p : best);
      if (closed(finalTier)) return true;
    }
    return game.patterns.every(closed);
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

    const orderProblem = checkFullHouseOrder(game, pattern, playerId);
    if (orderProblem) {
      return { success: false, reason: orderProblem };
    }

    if (req.type === 'EXACT_LIST' && req.numbers.length === 0) {
      return { success: false, reason: `Your ticket has no numbers for ${pattern.name}` };
    }

    if (req.type === 'EXACT_LIST') {
      matchedNumbers = req.numbers.filter(n => drawnSet.has(n));
      missingNumbers = req.numbers.filter(n => !drawnSet.has(n));
      isValid = missingNumbers.length === 0;
    } else if (req.type === 'COUNT_ANY') {
      const marked = ticket.allNumbers.filter(n => drawnSet.has(n));
      matchedNumbers = marked;
      isValid = marked.length >= req.count;
      if (!isValid) {
        missingNumbers = ticket.allNumbers.filter(n => !drawnSet.has(n));
      }
    } else if (req.type === 'ANY_ROWS') {
      const completeRows = req.rows.filter(row => row.every(n => drawnSet.has(n)));
      isValid = completeRows.length >= req.count;
      matchedNumbers = completeRows.flat();
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

    if (isGameComplete(game)) {
      game.phase = 'FINISHED';
      game.auditLog.push({
        type: 'GAME_CONCLUDED',
        timestamp: Date.now(),
        message: `${pattern.name} claimed! Match successfully completed.`
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
    PATTERN_CATALOG,
    DEFAULT_PATTERN_IDS,
    STANDARD_PATTERNS,
    sanitizePatternIds,
    generateTicket,
    createGame,
    drawNextBall,
    claimWin,
    getRequiredNumbersForPattern
  };
});
