/**
 * Integration Test for myArena Royalty Multiplayer Server
 */

const assert = require('assert');
const http = require('http');
const { server, startServer } = require('../src/server/server');

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
    assert.strictEqual(unauthenticatedChatRes.status, 400);
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
