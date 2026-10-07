/**
 * Comprehensive Unit Test Suite for myArena Royalty Game Engines
 */

const assert = require('assert');
const LudoEngine = require('../src/engine/ludo');
const SnakesEngine = require('../src/engine/snakes');
const TambolaEngine = require('../src/engine/tambola');
const GameAI = require('../src/engine/ai');

console.log('====================================================');
console.log('🧪 RUNNING MYARENA ROYALTY ENGINE UNIT TESTS');
console.log('====================================================');

let testsPassed = 0;
let testsFailed = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    testsPassed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    testsFailed++;
  }
}

// -----------------------------------------------------------------------------
// LUDO TESTS
// -----------------------------------------------------------------------------
console.log('\n--- 1. LUDO ENGINE TESTS ---');

runTest('Ludo: Initialize 4-player game with default rules', () => {
  const players = [
    { id: 'u1', name: 'Tony', teamIndex: 0 },
    { id: 'u2', name: 'Bruce', teamIndex: 1 },
    { id: 'u3', name: 'Thor', teamIndex: 2 },
    { id: 'u4', name: 'Steve', teamIndex: 3 }
  ];
  const game = LudoEngine.createGame(players);
  assert.strictEqual(game.players.length, 4);
  assert.strictEqual(game.phase, 'ROLL');
  assert.strictEqual(game.currentTurnIndex, 0);
  assert.deepStrictEqual(game.players[0].tokens, [-1, -1, -1, -1]);
});

runTest('Ludo: Rolling non-6 when all tokens in base gives no legal moves and passes turn', () => {
  const players = [
    { id: 'u1', name: 'Tony', teamIndex: 0 },
    { id: 'u2', name: 'Bruce', teamIndex: 1 }
  ];
  const game = LudoEngine.createGame(players);
  const result = LudoEngine.rollDice(game, 4);
  assert.strictEqual(result.roll, 4);
  assert.strictEqual(result.turnAdvanced, true);
  assert.strictEqual(game.currentTurnIndex, 1); // Advanced to next player
});

runTest('Ludo: Rolling 6 allows leaving base onto start square', () => {
  const players = [
    { id: 'u1', name: 'Tony', teamIndex: 0 },
    { id: 'u2', name: 'Bruce', teamIndex: 1 }
  ];
  const game = LudoEngine.createGame(players);
  const rollRes = LudoEngine.rollDice(game, 6);
  assert.strictEqual(rollRes.turnAdvanced, false);
  assert.strictEqual(rollRes.legalMoves.length, 4);
  assert.strictEqual(rollRes.legalMoves[0].type, 'ENTER_TRACK');

  // Move token 0
  const moveRes = LudoEngine.moveToken(game, 0);
  assert.strictEqual(game.players[0].tokens[0], 0); // On start square (step 0)
  assert.strictEqual(moveRes.extraTurn, true); // Rolling 6 grants bonus turn!
  assert.strictEqual(game.currentTurnIndex, 0); // Still Tony's turn
});

runTest('Ludo: Rolling 6 with no legal move preserves the configured bonus turn', () => {
  const players = [
    { id: 'u1', name: 'Tony', teamIndex: 0 },
    { id: 'u2', name: 'Bruce', teamIndex: 1 }
  ];
  const game = LudoEngine.createGame(players, { entryRoll: [1], bonusOnSix: true });
  const result = LudoEngine.rollDice(game, 6);
  assert.strictEqual(result.turnAdvanced, false);
  assert.strictEqual(game.currentTurnIndex, 0);
  assert.strictEqual(game.phase, 'ROLL');
});

runTest('Ludo: Consecutive six counter resets when the turn advances', () => {
  const players = [
    { id: 'u1', name: 'Tony', teamIndex: 0 },
    { id: 'u2', name: 'Bruce', teamIndex: 1 }
  ];
  const game = LudoEngine.createGame(players, { entryRoll: [1], bonusOnSix: false });
  LudoEngine.rollDice(game, 6);
  assert.strictEqual(game.currentTurnIndex, 1);
  assert.strictEqual(game.consecutiveSixes, 0);
});

runTest('Ludo: lastRoll keeps the rolled value and sequence after the move resolves', () => {
  const players = [
    { id: 'u1', name: 'Tony', teamIndex: 0 },
    { id: 'u2', name: 'Bruce', teamIndex: 1 }
  ];
  const game = LudoEngine.createGame(players);
  assert.strictEqual(game.lastRoll, null);

  LudoEngine.rollDice(game, 6);
  assert.deepStrictEqual(game.lastRoll, { seq: 1, value: 6, playerId: 'u1' });
  LudoEngine.moveToken(game, 0);
  // currentDice is cleared by the move, but the display source must not be.
  assert.strictEqual(game.currentDice, null);
  assert.deepStrictEqual(game.lastRoll, { seq: 1, value: 6, playerId: 'u1' });

  LudoEngine.rollDice(game, 6);
  assert.strictEqual(game.lastRoll.seq, 2, 'a repeated value must still be a new roll');
  assert.strictEqual(game.lastRoll.value, 6);
});

runTest('Ludo: unforced rolls cover every face', () => {
  const game = LudoEngine.createGame([
    { id: 'u1', name: 'Tony', teamIndex: 0 },
    { id: 'u2', name: 'Bruce', teamIndex: 1 }
  ], { entryRoll: [], bonusOnSix: false, maxConsecutiveSixes: null });
  const counts = [0, 0, 0, 0, 0, 0];
  for (let i = 0; i < 600; i++) counts[LudoEngine.rollDice(game).roll - 1] += 1;
  counts.forEach((count, face) => {
    assert(count > 50 && count < 150, `Face ${face + 1} appeared ${count}/600 times`);
  });
});

runTest('Ludo: Three consecutive sixes forfeits turn', () => {
  const players = [
    { id: 'u1', name: 'Tony', teamIndex: 0 },
    { id: 'u2', name: 'Bruce', teamIndex: 1 }
  ];
  const game = LudoEngine.createGame(players);

  // 1st six
  LudoEngine.rollDice(game, 6);
  LudoEngine.moveToken(game, 0);

  // 2nd six
  LudoEngine.rollDice(game, 6);
  LudoEngine.moveToken(game, 0);

  // 3rd six -> Penalty triggered!
  const thirdRes = LudoEngine.rollDice(game, 6);
  assert.strictEqual(thirdRes.turnAdvanced, true);
  assert.strictEqual(game.currentTurnIndex, 1); // Pass to Bruce
});

runTest('Ludo: Captures send opponent token back to base and grant bonus turn', () => {
  const players = [
    { id: 'u1', name: 'Tony', teamIndex: 0 }, // Start square 0
    { id: 'u2', name: 'Bruce', teamIndex: 1 } // Start square 13
  ];
  const game = LudoEngine.createGame(players);

  // Manually place Tony's token at step 10 on track (track index 10)
  game.players[0].tokens[0] = 10;

  // Place Bruce's token such that its absolute track index is 10
  // Bruce start is 13. Bruce track index = (13 + step) % 52.
  // 10 = (13 + 49) % 52 -> step 49
  game.players[1].tokens[0] = 49;
  assert.strictEqual(LudoEngine.getAbsoluteTrackIndex(1, 49), 10);

  // Now Tony rolls 2 -> Tony moves from step 8 to 10
  game.players[0].tokens[0] = 8;
  game.phase = 'ROLL';
  game.currentTurnIndex = 0;

  LudoEngine.rollDice(game, 2);
  const moveRes = LudoEngine.moveToken(game, 0);

  assert.strictEqual(game.players[0].tokens[0], 10);
  assert.strictEqual(game.players[1].tokens[0], -1); // Bruce's token captured back to base!
  assert.strictEqual(moveRes.extraTurn, true); // Capture bonus
});

runTest('Ludo: Safe square prevents captures', () => {
  const players = [
    { id: 'u1', name: 'Tony', teamIndex: 0 },
    { id: 'u2', name: 'Bruce', teamIndex: 1 }
  ];
  const game = LudoEngine.createGame(players);

  // Safe square 8 (star)
  game.players[0].tokens[0] = 6;
  // Bruce on track index 8: (13 + 47) % 52 = 8
  game.players[1].tokens[0] = 47;
  assert.strictEqual(LudoEngine.getAbsoluteTrackIndex(1, 47), 8);

  game.phase = 'ROLL';
  game.currentTurnIndex = 0;
  LudoEngine.rollDice(game, 2);
  LudoEngine.moveToken(game, 0);

  // Both should peacefully exist on square 8
  assert.strictEqual(game.players[0].tokens[0], 8);
  assert.strictEqual(game.players[1].tokens[0], 47); // Bruce NOT captured
});

runTest('Ludo: Exact finish requirement rejects overshooting rolls', () => {
  const players = [
    { id: 'u1', name: 'Tony', teamIndex: 0 },
    { id: 'u2', name: 'Bruce', teamIndex: 1 }
  ];
  const game = LudoEngine.createGame(players, { exactFinish: true });
  game.players[0].tokens[0] = 54; // Needs exact 2 to reach 56

  game.phase = 'ROLL';
  game.currentTurnIndex = 0;
  const rollRes = LudoEngine.rollDice(game, 5); // 54 + 5 = 59 > 56

  // Since token 0 overshoots and other tokens in base, legal moves is 0
  assert.strictEqual(rollRes.turnAdvanced, true);
  assert.strictEqual(game.players[0].tokens[0], 54);
});

// -----------------------------------------------------------------------------
// SNAKES AND LADDERS TESTS
// -----------------------------------------------------------------------------
console.log('\n--- 2. SNAKES AND LADDERS ENGINE TESTS ---');

runTest('Snakes & Ladders: 100-cell serpentine coordinate calculation', () => {
  const c1 = SnakesEngine.getCellCoordinates(1);
  assert.strictEqual(c1.row, 0);
  assert.strictEqual(c1.col, 0);

  const c10 = SnakesEngine.getCellCoordinates(10);
  assert.strictEqual(c10.row, 0);
  assert.strictEqual(c10.col, 9);

  const c11 = SnakesEngine.getCellCoordinates(11); // Row 1 reverses (R to L)
  assert.strictEqual(c11.row, 1);
  assert.strictEqual(c11.col, 9);

  const c20 = SnakesEngine.getCellCoordinates(20);
  assert.strictEqual(c20.row, 1);
  assert.strictEqual(c20.col, 0);

  const c100 = SnakesEngine.getCellCoordinates(100);
  assert.strictEqual(c100.row, 9);
});

runTest('Snakes & Ladders: Climbing ladder atomically moves token to ladder top', () => {
  const game = SnakesEngine.createGame([
    { id: 'p1', name: 'Alice' },
    { id: 'p2', name: 'Bob' }
  ]);
  // Ladder at 4 -> 14. Start at 1, roll 3 -> lands on 4 -> climbs to 14
  game.players[0].position = 1;
  const res = SnakesEngine.playTurn(game, 3);
  assert.strictEqual(res.intermediatePos, 4);
  assert.strictEqual(res.toPos, 14);
  assert.strictEqual(res.shortcutType, 'LADDER');
  assert.strictEqual(game.players[0].position, 14);
});

runTest('Snakes & Ladders: Opening roll advances from square zero without an extra step', () => {
  const game = SnakesEngine.createGame([
    { id: 'p1', name: 'Alice' },
    { id: 'p2', name: 'Bob' }
  ]);
  const result = SnakesEngine.playTurn(game, 3);
  assert.strictEqual(result.fromPos, 0);
  assert.strictEqual(result.toPos, 3);
});

runTest('Snakes & Ladders: Snake bite atomically slides token to tail', () => {
  const game = SnakesEngine.createGame([
    { id: 'p1', name: 'Alice' },
    { id: 'p2', name: 'Bob' }
  ]);
  // Snake at 17 -> 7. Start at 12, roll 5 -> lands on 17 -> slides to 7
  game.players[0].position = 12;
  const res = SnakesEngine.playTurn(game, 5);
  assert.strictEqual(res.intermediatePos, 17);
  assert.strictEqual(res.toPos, 7);
  assert.strictEqual(res.shortcutType, 'SNAKE');
  assert.strictEqual(game.players[0].position, 7);
});

runTest('Snakes & Ladders: Exact stay finish rule', () => {
  const game = SnakesEngine.createGame(
    [{ id: 'p1', name: 'Alice' }],
    { finishMode: 'exact_stay', bonusOnSix: false }
  );
  game.players[0].position = 98;
  const res = SnakesEngine.playTurn(game, 4); // 98 + 4 = 102 > 100
  assert.strictEqual(res.toPos, 98); // Stays at 98
  assert.strictEqual(res.isGameOver, false);

  // Now roll exact 2 to win
  const winRes = SnakesEngine.playTurn(game, 2);
  assert.strictEqual(winRes.toPos, 100);
  assert.strictEqual(winRes.isGameOver, true);
  assert.strictEqual(game.phase, 'FINISHED');
});

// -----------------------------------------------------------------------------
// HOUSIE / TAMBOLA TESTS
// -----------------------------------------------------------------------------
console.log('\n--- 3. HOUSIE / TAMBOLA ENGINE TESTS ---');

runTest('Tambola: 50 randomly generated tickets all adhere to authentic 90-ball rules', () => {
  for (let i = 0; i < 50; i++) {
    const ticket = TambolaEngine.generateTicket(`t_${i}`);
    const grid = ticket.grid;

    // Must be 3 rows by 9 columns
    assert.strictEqual(grid.length, 3);
    grid.forEach(row => assert.strictEqual(row.length, 9));

    // Must have exactly 15 numbers total
    assert.strictEqual(ticket.allNumbers.length, 15);

    // Each row must have exactly 5 numbers
    for (let r = 0; r < 3; r++) {
      const rowNumbers = grid[r].filter(n => n > 0);
      assert.strictEqual(rowNumbers.length, 5, `Row ${r} did not have 5 numbers`);
    }

    // Each column must strictly adhere to its range and be sorted top-to-bottom
    for (let c = 0; c < 9; c++) {
      const { min, max } = TambolaEngine.COLUMN_RANGES[c];
      const colNumbers = [grid[0][c], grid[1][c], grid[2][c]].filter(n => n > 0);
      assert(colNumbers.length >= 1 && colNumbers.length <= 3, `Column ${c} count invalid: ${colNumbers.length}`);

      colNumbers.forEach(num => {
        assert(num >= min && num <= max, `Number ${num} in column ${c} outside [${min}, ${max}]`);
      });

      // Verify sorted strictly ascending
      for (let k = 0; k < colNumbers.length - 1; k++) {
        assert(colNumbers[k] < colNumbers[k + 1], `Column ${c} numbers not sorted`);
      }
    }

    // Verify no duplicates
    const unique = new Set(ticket.allNumbers);
    assert.strictEqual(unique.size, 15);
  }
});

runTest('Tambola: Numbers are drawn without replacement from 1 to 90', () => {
  const game = TambolaEngine.createGame(
    { hostId: 'h1', callerRole: 'HOST' },
    [{ id: 'h1', name: 'Caller' }, { id: 'p1', name: 'Player' }]
  );

  const drawn = [];
  for (let i = 0; i < 90; i++) {
    const res = TambolaEngine.drawNextBall(game, 'h1');
    assert(res.currentBall >= 1 && res.currentBall <= 90);
    drawn.push(res.currentBall);
  }

  // 90 unique numbers
  assert.strictEqual(new Set(drawn).size, 90);
  assert.strictEqual(game.ballPool.length, 0);

  // 91st draw marks finished
  const overRes = TambolaEngine.drawNextBall(game, 'h1');
  assert.strictEqual(overRes.finished, true);
});

runTest('Tambola: Valid claim for Top Line is accepted and recorded in audit log', () => {
  const game = TambolaEngine.createGame(
    { hostId: 'h1', callerRole: 'HOST' },
    [{ id: 'p1', name: 'WinnerPlayer' }]
  );

  const ticket = game.tickets['p1'];
  const topLineNumbers = ticket.grid[0].filter(n => n > 0);

  // Simulate calling the 5 top line numbers
  topLineNumbers.forEach(n => {
    game.drawnBalls.push(n);
  });
  game.currentBall = topLineNumbers[topLineNumbers.length - 1];

  const claimRes = TambolaEngine.claimWin(game, 'p1', 'top_line');
  assert.strictEqual(claimRes.success, true);
  assert.strictEqual(claimRes.winRecord.patternId, 'top_line');
  assert.strictEqual(game.patterns.find(p => p.id === 'top_line').winners.length, 1);
});

runTest('Tambola: Bogey claim with uncalled numbers is rejected', () => {
  const game = TambolaEngine.createGame(
    { hostId: 'h1', callerRole: 'HOST' },
    [{ id: 'p1', name: 'CheaterPlayer' }]
  );

  // Only draw 1 ball
  game.drawnBalls.push(1);
  game.currentBall = 1;

  // Claim Full House
  const claimRes = TambolaEngine.claimWin(game, 'p1', 'full_house');
  assert.strictEqual(claimRes.success, false);
  assert(claimRes.reason.includes('Bogey Claim'));
});

runTest('Tambola: catalog offers 40+ uniquely identified patterns rated 1-5 for popularity', () => {
  const catalog = TambolaEngine.PATTERN_CATALOG;
  assert(catalog.length >= 40, `Only ${catalog.length} patterns`);
  assert.strictEqual(new Set(catalog.map(p => p.id)).size, catalog.length, 'Pattern ids must be unique');
  catalog.forEach(p => {
    assert(p.popularity >= 1 && p.popularity <= 5, `${p.id} popularity out of range`);
    assert(p.name && p.description && p.category && p.rule, `${p.id} is missing metadata`);
  });
  const classic = catalog.filter(p => p.popularity === 5).map(p => p.id).sort();
  assert.deepStrictEqual(classic, TambolaEngine.DEFAULT_PATTERN_IDS.slice().sort());
});

runTest('Tambola: every catalog pattern is winnable once its numbers are called, and rejected before', () => {
  for (let round = 0; round < 40; round++) {
    TambolaEngine.PATTERN_CATALOG.forEach(definition => {
      // Full house tiers need earlier tiers won first; they are covered separately.
      if (definition.rule.type === 'full_house' && definition.rule.tier > 1) return;
      const game = TambolaEngine.createGame({ hostId: 'h1' }, [{ id: 'p1', name: 'Solo' }], [definition.id]);
      const ticket = game.tickets.p1;
      const req = TambolaEngine.getRequiredNumbersForPattern(ticket, { id: definition.id });
      assert(req, `${definition.id} did not resolve`);

      let needed;
      if (req.type === 'COUNT_ANY') needed = ticket.allNumbers.slice(0, req.count);
      else if (req.type === 'ANY_ROWS') needed = req.rows.slice(0, req.count).flat();
      else needed = req.numbers;

      if (req.type === 'EXACT_LIST' && needed.length === 0) {
        // e.g. no number containing an 8: the ticket simply cannot win this dividend.
        const empty = TambolaEngine.claimWin(game, 'p1', definition.id);
        assert.strictEqual(empty.success, false);
        return;
      }

      const early = TambolaEngine.claimWin(game, 'p1', definition.id);
      assert.strictEqual(early.success, false, `${definition.id} accepted before any number was called`);
      needed.forEach(n => game.drawnBalls.push(n));
      game.currentBall = needed[needed.length - 1];
      const claim = TambolaEngine.claimWin(game, 'p1', definition.id);
      assert.strictEqual(claim.success, true, `${definition.id} rejected a valid ticket: ${claim.reason}`);
    });
  }
});

runTest('Tambola: shape patterns pick the documented positions on every line', () => {
  const ticket = {
    grid: [
      [1, 13, 24, 0, 0, 0, 66, 71, 0],
      [6, 0, 0, 36, 46, 0, 69, 0, 81],
      [0, 0, 26, 39, 0, 51, 0, 78, 83]
    ],
    allNumbers: [1, 6, 13, 24, 26, 36, 39, 46, 51, 66, 69, 71, 78, 81, 83]
  };
  const numbers = id => TambolaEngine.getRequiredNumbersForPattern(ticket, { id }).numbers.slice().sort((a, b) => a - b);
  assert.deepStrictEqual(numbers('four_corners'), [1, 26, 71, 83]);
  assert.deepStrictEqual(numbers('pyramid'), [24, 26, 36, 51, 69, 83]);
  assert.deepStrictEqual(numbers('star'), [1, 26, 46, 71, 83]);
  assert.deepStrictEqual(numbers('temperature'), [1, 83]);
  assert.deepStrictEqual(numbers('breakfast'), [1, 6, 13, 24, 26]);
  assert.deepStrictEqual(numbers('fat_ladies'), [78, 81, 83]);
  assert.deepStrictEqual(numbers('kings_corners'), [1, 6, 26]);
  assert.deepStrictEqual(numbers('first_half'), [1, 6, 13, 24, 26, 36, 39]);
});

runTest('Tambola: only known pattern ids are accepted, with full houses last', () => {
  assert.deepStrictEqual(
    TambolaEngine.sanitizePatternIds(['full_house', 'hacked', { id: 'evil' }, 'pyramid', 'pyramid', 'early_five']),
    ['early_five', 'pyramid', 'full_house']
  );
  assert.deepStrictEqual(TambolaEngine.sanitizePatternIds([]), TambolaEngine.DEFAULT_PATTERN_IDS);
  const game = TambolaEngine.createGame({ hostId: 'h1' }, [{ id: 'p1', name: 'A' }],
    [{ id: 'custom', customCells: [[0, 0]] }, 'star']);
  assert.deepStrictEqual(game.patterns.map(p => p.id), ['star']);
});

runTest('Tambola: second and third Full House go in order to different players, then the game ends', () => {
  const players = [{ id: 'p1', name: 'Asha' }, { id: 'p2', name: 'Bilal' }, { id: 'p3', name: 'Chen' }];
  const game = TambolaEngine.createGame({ hostId: 'p1' }, players,
    ['full_house', 'second_full_house', 'third_full_house']);
  for (let n = 1; n <= 90; n++) game.drawnBalls.push(n);
  game.currentBall = 90;

  assert.strictEqual(TambolaEngine.claimWin(game, 'p2', 'second_full_house').success, false);
  assert.strictEqual(TambolaEngine.claimWin(game, 'p1', 'full_house').success, true);
  assert.strictEqual(game.phase, 'IN_PROGRESS');
  const repeat = TambolaEngine.claimWin(game, 'p1', 'second_full_house');
  assert.strictEqual(repeat.success, false);
  assert(repeat.reason.includes('another player'));
  assert.strictEqual(TambolaEngine.claimWin(game, 'p2', 'second_full_house').success, true);
  assert.strictEqual(TambolaEngine.claimWin(game, 'p3', 'third_full_house').success, true);
  assert.strictEqual(game.phase, 'FINISHED');
});

// -----------------------------------------------------------------------------
// AI TESTS
// -----------------------------------------------------------------------------
console.log('\n--- 4. AI TESTS ---');

runTest('GameAI: Ludo AI prioritizes capturing opponent over arbitrary advance', () => {
  const players = [
    { id: 'p1', name: 'AI_Player', teamIndex: 0 },
    { id: 'p2', name: 'Opponent', teamIndex: 1 }
  ];
  const game = LudoEngine.createGame(players);

  // Token 0 can capture opponent at track index 5
  game.players[0].tokens[0] = 3; // +2 roll = 5
  game.players[1].tokens[0] = 44; // (13 + 44) % 52 = 5 (Opponent on 5)

  // Token 1 is at step 20 (no capture)
  game.players[0].tokens[1] = 20;

  game.phase = 'ROLL';
  game.currentTurnIndex = 0;
  LudoEngine.rollDice(game, 2);

  const chosenToken = GameAI.pickLudoMove(game);
  assert.strictEqual(chosenToken, 0, 'AI did not prioritize the capture move!');
});

console.log('\n====================================================');
console.log(`TOTAL TESTS: ${testsPassed + testsFailed} | PASSED: ${testsPassed} | FAILED: ${testsFailed}`);
console.log('====================================================');

if (testsFailed > 0) {
  process.exit(1);
}
