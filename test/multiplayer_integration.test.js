/**
 * Integration Test for myArena Royalty Multiplayer Server
 */

const assert = require('assert');
const http = require('http');
const { server, startServer } = require('../src/server/server');
const roomManager = require('../src/server/room_manager');

const TEST_PORT = 3333;
const BASE_URL = `http://localhost:${TEST_PORT}`;

function post(endpoint, data, reconnectToken = null) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(data || {});
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    };
    if (reconnectToken) headers['X-Reconnect-Token'] = reconnectToken;
    const req = http.request(
      `${BASE_URL}${endpoint}`,
      {
        method: 'POST',
        headers
      },
      res => {
        let body = '';
        res.on('data', chunk => (body += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            resolve({ status: res.statusCode, data: parsed });
          } catch (e) {
            resolve({ status: res.statusCode, raw: body });
          }
        });
      }
    );
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function get(endpoint) {
  return new Promise((resolve, reject) => {
    http.get(`${BASE_URL}${endpoint}`, res => {
      let body = '';
      res.on('data', chunk => (body += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    }).on('error', reject);
  });
}

async function runMultiplayerTests() {
  console.log('====================================================');
  console.log('🌐 RUNNING MULTIPLAYER INTEGRATION TESTS');
  console.log('====================================================');

  await startServer(TEST_PORT);

  try {
    const indexRes = await get('/');
    assert.strictEqual(indexRes.status, 200);
    assert.strictEqual((indexRes.raw.match(/src="\/app\.js"/g) || []).length, 1);

    // 1. Create Room
    console.log('1. Host creates a Ludo room...');
    const createRes = await post('/api/rooms/create', {
      hostName: 'Tony Stark',
      gameType: 'ludo',
      maxPlayers: 4
    });
    assert.strictEqual(createRes.status, 200);
    const { roomCode, player: hostPlayer, reconnectToken: hostToken } = createRes.data;
    assert(roomCode.startsWith('ROYAL-'), `Expected code starting with ROYAL-, got ${roomCode}`);
    assert.strictEqual(hostPlayer.name, 'Tony Stark');
    assert.strictEqual(hostPlayer.role, 'HOST');
    console.log(`   ✓ Created room: ${roomCode}`);

    // 2. Guest joins room
    console.log('2. Guest Steve joins room...');
    const joinRes = await post('/api/rooms/join', {
      roomCode: roomCode,
      playerName: 'Steve Rogers'
    });
    assert.strictEqual(joinRes.status, 200);
    const { player: guestPlayer, reconnectToken: guestToken } = joinRes.data;
    assert.strictEqual(guestPlayer.name, 'Steve Rogers');
    assert.strictEqual(guestPlayer.role, 'PLAYER');
    console.log('   ✓ Guest joined successfully');

    const chatRes = await post('/api/rooms/chat', {
      roomCode: roomCode,
      message: 'Ready when you are!'
    }, guestToken);
    assert.strictEqual(chatRes.status, 200);
    assert.strictEqual(chatRes.data.message.playerId, guestPlayer.id);
    assert.strictEqual(chatRes.data.message.name, guestPlayer.name);
    assert.strictEqual(chatRes.data.message.message, 'Ready when you are!');
    assert.strictEqual(chatRes.data.chat.length, 1);

    const blankChatRes = await post('/api/rooms/chat', {
      roomCode: roomCode,
      message: '   '
    }, guestToken);
    assert.strictEqual(blankChatRes.status, 400);

    const unauthenticatedChatRes = await post('/api/rooms/chat', {
      roomCode: roomCode,
      message: 'Impersonated message'
    });
    assert.strictEqual(unauthenticatedChatRes.status, 401);
    console.log('   ✓ Authenticated room chat accepts valid messages and rejects abuse');

    // 3. Prevent duplicate display name
    console.log('3. Attempting to join with duplicate name...');
    const dupRes = await post('/api/rooms/join', {
      roomCode: roomCode,
      playerName: 'Steve Rogers'
    });
    assert.strictEqual(dupRes.status, 400);
    assert(dupRes.data.error.includes('already taken'), `Expected error message, got: ${dupRes.data.error}`);
    console.log('   ✓ Duplicate name properly rejected');

    // 4. Non-host attempts to start game (should be rejected)
    console.log('4. Non-host attempts to start game...');
    const invalidStart = await post('/api/rooms/start', {
      roomCode: roomCode,
      hostId: hostPlayer.id
    }, guestToken);
    assert.strictEqual(invalidStart.status, 400);
    console.log('   ✓ Unauthorized start properly rejected');

    // 5. Server enforces readiness, then host starts game
    console.log('5. Guest readies up and host starts game...');
    const unreadyStart = await post('/api/rooms/start', {
      roomCode: roomCode
    }, hostToken);
    assert.strictEqual(unreadyStart.status, 400);
    assert(unreadyStart.data.error.includes('ready'));

    const readyRes = await post('/api/rooms/ready', {
      roomCode: roomCode,
      playerId: hostPlayer.id,
      isReady: true
    }, guestToken);
    assert.strictEqual(readyRes.status, 200);
    assert.strictEqual(readyRes.data.player.id, guestPlayer.id);
    assert.strictEqual(readyRes.data.player.isReady, true);

    const startRes = await post('/api/rooms/start', {
      roomCode: roomCode
    }, hostToken);
    assert.strictEqual(startRes.status, 200);
    assert.strictEqual(startRes.data.gameState.phase, 'ROLL');
    console.log('   ✓ Game started with valid authoritative state');

    // 6. Wrong turn action rejection
    console.log('6. Guest attempts to roll on Host\'s turn...');
    const wrongTurnRes = await post('/api/rooms/action', {
      roomCode: roomCode,
      playerId: hostPlayer.id,
      action: { type: 'ROLL_DICE' }
    }, guestToken);
    assert.strictEqual(wrongTurnRes.status, 400);
    assert(wrongTurnRes.data.error.includes("turn, not yours"));
    console.log('   ✓ Wrong-turn action properly rejected');

    // 7. Legal action by host
    console.log('7. Host rolls dice...');
    const rollRes = await post('/api/rooms/action', {
      roomCode: roomCode,
      playerId: guestPlayer.id,
      action: { type: 'ROLL_DICE' }
    }, hostToken);
    assert.strictEqual(rollRes.status, 200);
    assert.deepStrictEqual(rollRes.data.gameState.lastRoll, {
      seq: 1,
      value: rollRes.data.actionResult.roll,
      playerId: hostPlayer.id
    });
    console.log(`   ✓ Dice rolled successfully: ${rollRes.data.actionResult.roll}`);

    // 8. Reconnection test
    console.log('8. Guest reconnects using reconnectToken...');
    const reconnectRes = await post('/api/rooms/join', {
      roomCode: roomCode,
      reconnectToken: guestToken
    });
    assert.strictEqual(reconnectRes.status, 200);
    assert.strictEqual(reconnectRes.data.reconnected, true);
    assert.strictEqual(reconnectRes.data.player.id, guestPlayer.id);
    console.log('   ✓ Session restored seamlessly upon reconnect');

    // 8b. Disconnecting mid-game keeps the seat instead of forfeiting the match
    console.log('8b. Guest drops connection mid-game...');
    const fakeStream = { write() {} };
    roomManager.addSubscriber(roomCode, fakeStream, guestPlayer.id);
    roomManager.removeSubscriber(roomCode, fakeStream);
    assert(!roomManager.disconnectTimers.has(`${roomCode}:${guestPlayer.id}`), 'No eviction timer mid-game');
    const droppedPlayer = roomManager.rooms.get(roomCode).players.find(p => p.id === guestPlayer.id);
    assert(droppedPlayer && droppedPlayer.connected === false, 'Seat kept and marked offline');
    console.log('   ✓ Seat kept while the player is offline');

    // 8c. Server restart wipes memory; the client checkpoint rebuilds the room exactly
    console.log('8c. Simulating a server restart and restoring from checkpoint...');
    const latest = await post('/api/rooms/join', { roomCode, reconnectToken: guestToken });
    const checkpoint = latest.data.checkpoint;
    assert(checkpoint && checkpoint.data && checkpoint.version > 1, 'Responses carry a checkpoint');
    const before = latest.data.room.gameState;
    assert(!checkpoint.data.includes(guestToken), 'Checkpoint must not expose secrets');

    roomManager.rooms.clear();
    roomManager.subscribers.clear();
    const lostPing = await post('/api/rooms/ping', { roomCode }, guestToken);
    assert.strictEqual(lostPing.status, 404);

    const flipped = checkpoint.data.slice(0, 40) + (checkpoint.data[40] === 'A' ? 'B' : 'A') + checkpoint.data.slice(41);
    const tampered = await post('/api/rooms/restore', { checkpoint: flipped }, guestToken);
    assert.strictEqual(tampered.status, 400, 'Tampered checkpoints are rejected');
    const stranger = await post('/api/rooms/restore', { checkpoint: checkpoint.data }, 'not-a-member');
    assert.strictEqual(stranger.status, 401, 'Only room members can restore');

    const restoreRes = await post('/api/rooms/restore', { checkpoint: checkpoint.data }, guestToken);
    assert.strictEqual(restoreRes.status, 200);
    assert.strictEqual(restoreRes.data.restored, true);
    assert.strictEqual(restoreRes.data.room.status, 'IN_GAME');
    assert.deepStrictEqual(restoreRes.data.room.gameState.lastRoll, before.lastRoll);
    assert.strictEqual(restoreRes.data.room.gameState.currentTurnIndex, before.currentTurnIndex);
    assert.deepStrictEqual(
      restoreRes.data.room.gameState.players.map(p => p.tokens),
      before.players.map(p => p.tokens)
    );

    const secondRestore = await post('/api/rooms/restore', { checkpoint: checkpoint.data }, hostToken);
    assert.strictEqual(secondRestore.status, 200);
    assert.strictEqual(secondRestore.data.restored, false, 'Older or equal checkpoints never overwrite');

    const restoredRoom = roomManager.rooms.get(roomCode);
    const realId = restoredRoom.id;
    restoredRoom.id = 'someone-elses-room';
    restoredRoom.version = 0;
    const collision = await post('/api/rooms/restore', { checkpoint: checkpoint.data }, guestToken);
    assert.strictEqual(collision.status, 409, 'A reused room code is never overwritten');
    restoredRoom.id = realId;
    restoredRoom.version = 100;

    const tokenById = { [hostPlayer.id]: hostToken, [guestPlayer.id]: guestToken };
    const restoredGame = restoreRes.data.room.gameState;
    const currentId = restoredGame.players[restoredGame.currentTurnIndex].id;
    const actionAfterRestore = await post('/api/rooms/action', {
      roomCode,
      action: restoredGame.phase === 'MOVE'
        ? { type: 'MOVE_TOKEN', tokenIndex: restoredGame.legalMoves[0].tokenIndex }
        : { type: 'ROLL_DICE' }
    }, tokenById[currentId]);
    assert.strictEqual(actionAfterRestore.status, 200, 'Play continues after restore');
    console.log('   ✓ Room rebuilt from checkpoint; tampering, strangers and stale copies rejected');

    // 9. Host handoff test
    console.log('9. Host leaves room, testing host handoff...');
    const leaveRes = await post('/api/rooms/leave', {
      roomCode: roomCode
    }, hostToken);
    assert.strictEqual(leaveRes.status, 200);
    assert.strictEqual(leaveRes.data.hostMigrated, true);
    assert.strictEqual(leaveRes.data.room.hostId, guestPlayer.id);
    assert.strictEqual(leaveRes.data.room.status, 'FINISHED');
    assert.deepStrictEqual(leaveRes.data.room.gameState.winnerRankings, [guestPlayer.id]);
    console.log(`   ✓ Host rights transferred deterministically to: ${guestPlayer.name}`);

    // 10. Tambola state is personalized and future draws remain private
    console.log('10. Verifying private Tambola state...');
    const tambolaCreate = await post('/api/rooms/create', {
      hostName: 'Caller',
      gameType: 'tambola',
      maxPlayers: 2
    });
    const tambolaCode = tambolaCreate.data.roomCode;
    const tambolaHost = tambolaCreate.data.player;
    const tambolaHostToken = tambolaCreate.data.reconnectToken;
    const tambolaJoin = await post('/api/rooms/join', {
      roomCode: tambolaCode,
      playerName: 'Ticket Holder'
    });
    const tambolaGuest = tambolaJoin.data.player;
    const tambolaGuestToken = tambolaJoin.data.reconnectToken;

    await post('/api/rooms/ready', {
      roomCode: tambolaCode,
      isReady: true
    }, tambolaGuestToken);
    const tambolaStart = await post('/api/rooms/start', {
      roomCode: tambolaCode
    }, tambolaHostToken);
    assert.deepStrictEqual(Object.keys(tambolaStart.data.gameState.tickets), [tambolaHost.id]);
    assert.strictEqual(tambolaStart.data.gameState.ballPool, undefined);

    const tambolaReconnect = await post('/api/rooms/join', {
      roomCode: tambolaCode,
      reconnectToken: tambolaGuestToken
    });
    assert.deepStrictEqual(Object.keys(tambolaReconnect.data.room.gameState.tickets), [tambolaGuest.id]);
    assert.strictEqual(tambolaReconnect.data.room.gameState.ballPool, undefined);
    console.log('   ✓ Tickets and future ball order are private per player');

    // 10b. When the Tambola host (caller) leaves mid-game, the new host can keep drawing
    const hostLeaves = await post('/api/rooms/leave', { roomCode: tambolaCode }, tambolaHostToken);
    assert.strictEqual(hostLeaves.data.room.hostId, tambolaGuest.id);
    const newCallerDraw = await post('/api/rooms/action', {
      roomCode: tambolaCode, action: { type: 'DRAW_BALL' }
    }, tambolaGuestToken);
    assert.strictEqual(newCallerDraw.status, 200, `New host could not draw: ${newCallerDraw.data && newCallerDraw.data.error}`);
    assert.strictEqual(newCallerDraw.data.gameState.callerId, tambolaGuest.id);
    console.log('   ✓ Caller role passes to the new host when the host leaves mid-game');

    // 11. Idle lobby seats are still released after the grace period
    console.log('11. Lobby player goes offline past the grace period...');
    const lobbyCreate = await post('/api/rooms/create', { hostName: 'Lobby Host', gameType: 'ludo', maxPlayers: 4 });
    const lobbyCode = lobbyCreate.data.roomCode;
    const lobbyJoin = await post('/api/rooms/join', { roomCode: lobbyCode, playerName: 'Wanderer' });
    const previousGrace = roomManager.lobbyDisconnectGraceMs;
    roomManager.lobbyDisconnectGraceMs = 30;
    const lobbyStream = { write() {} };
    roomManager.addSubscriber(lobbyCode, lobbyStream, lobbyJoin.data.player.id);
    roomManager.removeSubscriber(lobbyCode, lobbyStream);
    await new Promise(resolve => setTimeout(resolve, 120));
    roomManager.lobbyDisconnectGraceMs = previousGrace;
    assert(!roomManager.rooms.get(lobbyCode).players.some(p => p.id === lobbyJoin.data.player.id));
    console.log('   ✓ Offline lobby seat released after grace period');

    // 12. A 40-player Tambola room with a host-chosen pattern set
    console.log('12. Running a 40-player Tambola room with custom winning patterns...');
    const bigCreate = await post('/api/rooms/create', {
      hostName: 'Big Caller',
      gameType: 'tambola',
      maxPlayers: 40,
      rules: {
        patternIds: ['pyramid', 'early_five', 'not_a_pattern'],
        activePatterns: [{ id: 'custom', customCells: [[0, 0]] }],
        callerRole: 'AUTO',
        autoIntervalSeconds: 999
      }
    });
    assert.strictEqual(bigCreate.status, 200);
    const bigCode = bigCreate.data.roomCode;
    const bigHostToken = bigCreate.data.reconnectToken;
    assert.strictEqual(bigCreate.data.room.maxPlayers, 40);
    assert.deepStrictEqual(bigCreate.data.room.rules.patternIds, ['early_five', 'pyramid']);
    assert.strictEqual(bigCreate.data.room.rules.activePatterns, undefined, 'Client pattern objects are discarded');
    assert.strictEqual(bigCreate.data.room.rules.autoIntervalSeconds, 30, 'Interval is clamped');

    const bigGuests = [];
    for (let i = 1; i < 40; i++) {
      const joined = await post('/api/rooms/join', { roomCode: bigCode, playerName: `Player ${i}` });
      assert.strictEqual(joined.status, 200, `Player ${i} could not join: ${joined.data && joined.data.error}`);
      bigGuests.push(joined.data);
    }
    const overflow = await post('/api/rooms/join', { roomCode: bigCode, playerName: 'One Too Many' });
    assert.strictEqual(overflow.status, 400, 'The 41st player is turned away');

    const guestSetup = await post('/api/rooms/settings', {
      roomCode: bigCode, rules: { patternIds: ['full_house'] }
    }, bigGuests[0].reconnectToken);
    assert.strictEqual(guestSetup.status, 400, 'Only the host can change the game setup');

    const hostSetup = await post('/api/rooms/settings', {
      roomCode: bigCode,
      rules: { patternIds: ['full_house', 'star', 'temperature', 'early_five', 'second_full_house'], callerRole: 'HOST' }
    }, bigHostToken);
    assert.strictEqual(hostSetup.status, 200);
    assert.deepStrictEqual(hostSetup.data.room.rules.patternIds,
      ['early_five', 'star', 'temperature', 'full_house', 'second_full_house']);

    for (const guest of bigGuests) {
      await post('/api/rooms/ready', { roomCode: bigCode, isReady: true }, guest.reconnectToken);
    }
    // Simulate 40 live connections so the draw is broadcast to every player.
    const streams = [bigCreate.data.player, ...bigGuests.map(g => g.player)].map(player => {
      const stream = { playerId: player.id, events: [], write(chunk) { this.events.push(chunk); } };
      roomManager.addSubscriber(bigCode, stream, player.id);
      return stream;
    });
    const bigStart = await post('/api/rooms/start', { roomCode: bigCode }, bigHostToken);
    assert.strictEqual(bigStart.status, 200);
    assert.deepStrictEqual(bigStart.data.gameState.patterns.map(p => p.id),
      ['early_five', 'star', 'temperature', 'full_house', 'second_full_house']);
    assert.strictEqual(bigStart.data.gameState.players.length, 40);

    streams.forEach(stream => { stream.events = []; });
    const drawStarted = Date.now();
    const draw = await post('/api/rooms/action', { roomCode: bigCode, action: { type: 'DRAW_BALL' } }, bigHostToken);
    const drawMs = Date.now() - drawStarted;
    assert.strictEqual(draw.status, 200);
    streams.forEach(stream => {
      const update = stream.events
        .map(chunk => JSON.parse(chunk.replace(/^data: /, '')))
        .find(event => event.type === 'GAME_STATE_UPDATED');
      assert(update, `Player ${stream.playerId} missed the draw`);
      assert.deepStrictEqual(Object.keys(update.gameState.tickets), [stream.playerId], 'Each player sees only their own ticket');
      assert.strictEqual(update.gameState.ballPool, undefined);
    });
    assert(drawMs < 1500, `Broadcasting a draw to 40 players took ${drawMs}ms`);
    streams.forEach(stream => roomManager.removeSubscriber(bigCode, stream));
    console.log(`   ✓ 40 players joined, host-only setup enforced, draw broadcast privately to all 40 in ${drawMs}ms`);

    console.log('\n====================================================');
    console.log('ALL MULTIPLAYER INTEGRATION TESTS PASSED! 🎉');
    console.log('====================================================');
  } finally {
    server.close();
  }
}

runMultiplayerTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
