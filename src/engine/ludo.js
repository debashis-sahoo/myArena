/**
 * myArena Royalty - Ludo Game Engine
 * Authoritative, pure-function state machine for 2-4 player Ludo with regional rule presets.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.LudoEngine = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Constants
  const TOTAL_TRACK_SQUARES = 52;
  const HOME_PATH_LENGTH = 5; // steps 51..55
  const FINISH_STEP = 56; // step 56 is HOME
  const START_SQUARES = [0, 13, 26, 39]; // Red, Green, Yellow, Blue
  const DEFAULT_SAFE_SQUARES = [0, 8, 13, 21, 26, 34, 39, 47];

  const HEROES = [
    {
      id: 'iron_man',
      name: 'Iron Man',
      teamColor: 'red',
      colorHex: '#e62429',
      accentHex: '#fecb00',
      symbol: '⚛',
      lore: 'Repulsor Powered Armored Avenger'
    },
    {
      id: 'hulk',
      name: 'Hulk',
      teamColor: 'green',
      colorHex: '#2e7d32',
      accentHex: '#7b1fa2',
      symbol: '✊',
      lore: 'Gamma Smashing Unstoppable Titan'
    },
    {
      id: 'thor',
      name: 'Thor',
      teamColor: 'yellow',
      colorHex: '#f59e0b',
      accentHex: '#38bdf8',
      symbol: '⚡',
      lore: 'Mjolnir Wielding God of Thunder'
    },
    {
      id: 'captain_america',
      name: 'Captain America',
      teamColor: 'blue',
      colorHex: '#1d4ed8',
      accentHex: '#ef4444',
      symbol: '★',
      lore: 'Vibranium Shield First Avenger'
    }
  ];

  const DEFAULT_RULES = {
    entryRoll: [6], // Only 6 allows leaving base; or [1, 6]
    bonusOnSix: true,
    maxConsecutiveSixes: 3, // 3 consecutive sixes voids turn
    bonusOnCapture: true,
    bonusOnHome: true,
    safeSquaresEnabled: true,
    exactFinish: true // must roll exact distance to reach 56
  };

  /**
   * Initialize a new Ludo game
   * @param {Array} players - Array of player configs: { id, name, teamIndex (0..3), isAI, heroId }
   * @param {Object} customRules - Optional rule overrides
   */
  function createGame(players, customRules = {}) {
    if (!players || players.length < 2 || players.length > 4) {
      throw new Error('Ludo requires 2 to 4 players');
    }

    const rules = Object.assign({}, DEFAULT_RULES, customRules);

    // Ensure valid team indices 0..3 without duplicates
    const usedTeams = new Set();
    const validatedPlayers = players.map((p, idx) => {
      let teamIndex = typeof p.teamIndex === 'number' ? p.teamIndex : idx;
      if (teamIndex < 0 || teamIndex > 3 || usedTeams.has(teamIndex)) {
        for (let t = 0; t < 4; t++) {
          if (!usedTeams.has(t)) {
            teamIndex = t;
            break;
          }
        }
      }
      usedTeams.add(teamIndex);

      const defaultHero = HEROES[teamIndex];
      return {
        id: p.id || `p_${teamIndex}`,
        name: p.name || defaultHero.name,
        teamIndex: teamIndex,
        color: defaultHero.teamColor,
        hero: HEROES.find(h => h.id === p.heroId) || defaultHero,
        isAI: Boolean(p.isAI),
        tokens: [-1, -1, -1, -1], // -1 = base, 0..50 = track, 51..55 = home path, 56 = home
        finishedCount: 0,
        rank: null
      };
    });

    // Sort players by turn order based on teamIndex clockwise: 0 -> 1 -> 2 -> 3
    validatedPlayers.sort((a, b) => a.teamIndex - b.teamIndex);

    return {
      id: `ludo_${Date.now()}`,
      rules: rules,
      players: validatedPlayers,
      currentTurnIndex: 0,
      phase: 'ROLL', // 'ROLL' | 'MOVE' | 'FINISHED'
      currentDice: null,
      consecutiveSixes: 0,
      legalMoves: [],
      winnerRankings: [], // Player IDs in order of finishing
      lastAction: { type: 'INIT', message: 'Game initialized. Waiting for first roll.' },
      turnCount: 1,
      history: []
    };
  }

  /**
   * Converts a token's stepCount to the absolute board track cell index (0..51)
   * Returns null if token is in base (-1) or in home path (>= 51)
   */
  function getAbsoluteTrackIndex(teamIndex, stepCount) {
    if (stepCount < 0 || stepCount > 50) return null;
    const start = START_SQUARES[teamIndex];
    return (start + stepCount) % TOTAL_TRACK_SQUARES;
  }

  /**
   * Determine legal moves for the current player given their dice roll
   */
  function computeLegalMoves(game) {
    if (game.phase !== 'MOVE' || !game.currentDice) return [];
    const player = game.players[game.currentTurnIndex];
    const dice = game.currentDice;
    const legal = [];

    player.tokens.forEach((stepCount, tokenIdx) => {
      // Token in base: can only enter if dice is in entryRoll (e.g., 6)
      if (stepCount === -1) {
        if (game.rules.entryRoll.includes(dice)) {
          legal.push({
            tokenIndex: tokenIdx,
            type: 'ENTER_TRACK',
            targetStep: 0,
            targetTrackIndex: START_SQUARES[player.teamIndex]
          });
        }
      } else if (stepCount >= 0 && stepCount < FINISH_STEP) {
        // Token already on board
        const nextStep = stepCount + dice;
        if (nextStep <= FINISH_STEP) {
          const isHome = nextStep === FINISH_STEP;
          const targetTrack = nextStep <= 50 ? getAbsoluteTrackIndex(player.teamIndex, nextStep) : null;
          legal.push({
            tokenIndex: tokenIdx,
            type: isHome ? 'REACH_HOME' : (nextStep > 50 ? 'HOME_PATH' : 'TRACK_MOVE'),
            targetStep: nextStep,
            targetTrackIndex: targetTrack
          });
        } else if (!game.rules.exactFinish) {
          // If exact finish is disabled, overshoot counts as reaching home
          legal.push({
            tokenIndex: tokenIdx,
            type: 'REACH_HOME',
            targetStep: FINISH_STEP,
            targetTrackIndex: null
          });
        }
      }
    });

    return legal;
  }

  /**
   * Roll dice for current player
   * @param {Object} game
   * @param {Number|null} forcedRoll - Optional for deterministic testing
   */
  function rollDice(game, forcedRoll = null) {
    if (game.phase !== 'ROLL') {
      throw new Error(`Cannot roll dice in phase: ${game.phase}`);
    }

    const roll = (typeof forcedRoll === 'number' && forcedRoll >= 1 && forcedRoll <= 6)
      ? forcedRoll
      : Math.floor(Math.random() * 6) + 1;

    game.currentDice = roll;

    const currentPlayer = game.players[game.currentTurnIndex];

    // Check consecutive sixes
    if (roll === 6) {
      game.consecutiveSixes += 1;
    } else {
      game.consecutiveSixes = 0;
    }

    // Three consecutive sixes penalty rule
    if (game.rules.maxConsecutiveSixes && game.consecutiveSixes >= game.rules.maxConsecutiveSixes) {
      game.lastAction = {
        type: 'PENALTY_THREE_SIXES',
        player: currentPlayer.name,
        roll: roll,
        message: `${currentPlayer.name} rolled three consecutive sixes! Turn forfeited.`
      };
      game.history.push(game.lastAction);
      game.consecutiveSixes = 0;
      game.currentDice = null;
      game.phase = 'ROLL';
      advanceTurn(game);
      return { game, roll, legalMoves: [], turnAdvanced: true };
    }

    game.phase = 'MOVE';
    game.legalMoves = computeLegalMoves(game);

    if (game.legalMoves.length === 0) {
      // No legal moves possible
      game.lastAction = {
        type: 'NO_LEGAL_MOVES',
        player: currentPlayer.name,
        roll: roll,
        message: `${currentPlayer.name} rolled a ${roll}. No moves available.`
      };
      game.history.push(game.lastAction);
      game.currentDice = null;
      game.phase = 'ROLL';
      if (roll === 6 && game.rules.bonusOnSix) {
        game.lastAction.message += ' Bonus roll awarded.';
        return { game, roll, legalMoves: [], turnAdvanced: false };
      }
      advanceTurn(game);
      return { game, roll, legalMoves: [], turnAdvanced: true };
    }

    game.lastAction = {
      type: 'DICE_ROLLED',
      player: currentPlayer.name,
      roll: roll,
      message: `${currentPlayer.name} rolled a ${roll} with ${game.legalMoves.length} possible move(s).`
    };
    game.history.push(game.lastAction);

    return { game, roll, legalMoves: game.legalMoves, turnAdvanced: false };
  }

  /**
   * Execute movement of selected token
   */
  function moveToken(game, tokenIndex) {
    if (game.phase !== 'MOVE') {
      throw new Error(`Cannot move token in phase: ${game.phase}`);
    }

    const moveOption = game.legalMoves.find(m => m.tokenIndex === tokenIndex);
    if (!moveOption) {
      throw new Error(`Token ${tokenIndex} cannot legally move with roll ${game.currentDice}`);
    }

    const currentPlayer = game.players[game.currentTurnIndex];
    const prevStep = currentPlayer.tokens[tokenIndex];
    const nextStep = moveOption.targetStep;
    const dice = game.currentDice;

    currentPlayer.tokens[tokenIndex] = nextStep;

    let captured = null;
    let extraTurnAwarded = false;
    let extraTurnReason = null;

    // Check Token Reached Home
    if (nextStep === FINISH_STEP) {
      currentPlayer.finishedCount += 1;
      if (game.rules.bonusOnHome) {
        extraTurnAwarded = true;
        extraTurnReason = 'TOKEN_HOME_BONUS';
      }

      // Check if this player finished all 4 tokens
      if (currentPlayer.finishedCount === 4 && currentPlayer.rank === null) {
        const rank = game.winnerRankings.length + 1;
        currentPlayer.rank = rank;
        game.winnerRankings.push(currentPlayer.id);
        game.lastAction = {
          type: 'PLAYER_FINISHED',
          player: currentPlayer.name,
          rank: rank,
          message: `🏆 ${currentPlayer.name} finished all tokens and secured #${rank} place!`
        };
        game.history.push(game.lastAction);
      }
    } else if (nextStep <= 50) {
      // Token is on main track, check captures
      const landingTrackIndex = moveOption.targetTrackIndex;
      const isSafe = game.rules.safeSquaresEnabled && DEFAULT_SAFE_SQUARES.includes(landingTrackIndex);

      if (!isSafe) {
        // Search other players on this exact track square
        for (const opp of game.players) {
          if (opp.id === currentPlayer.id) continue;
          opp.tokens.forEach((oppStep, oppTokenIdx) => {
            if (oppStep >= 0 && oppStep <= 50) {
              const oppTrack = getAbsoluteTrackIndex(opp.teamIndex, oppStep);
              if (oppTrack === landingTrackIndex) {
                // CAPTURE!
                opp.tokens[oppTokenIdx] = -1; // Send back to base
                captured = {
                  opponentId: opp.id,
                  opponentName: opp.name,
                  opponentTokenIndex: oppTokenIdx
                };
              }
            }
          });
        }

        if (captured && game.rules.bonusOnCapture) {
          extraTurnAwarded = true;
          extraTurnReason = 'CAPTURE_BONUS';
        }
      }
    }

    // Bonus roll on rolling a 6
    if (!extraTurnAwarded && game.rules.bonusOnSix && dice === 6) {
      extraTurnAwarded = true;
      extraTurnReason = 'ROLLED_SIX_BONUS';
    }

    // Log the move
    game.lastAction = {
      type: 'TOKEN_MOVED',
      player: currentPlayer.name,
      tokenIndex: tokenIndex,
      fromStep: prevStep,
      toStep: nextStep,
      roll: dice,
      captured: captured,
      extraTurn: extraTurnAwarded ? extraTurnReason : null,
      message: `${currentPlayer.name} moved token ${tokenIndex + 1} to step ${nextStep}.${
        captured ? ` Captured ${captured.opponentName}'s token!` : ''
      }${extraTurnAwarded ? ` Bonus turn awarded (${extraTurnReason})!` : ''}`
    };
    game.history.push(game.lastAction);

    // Check game over condition
    // Game ends if only 1 active player left unranked (or all finished)
    const activeUnfinished = game.players.filter(p => p.finishedCount < 4);
    if (activeUnfinished.length <= 1) {
      if (activeUnfinished.length === 1 && activeUnfinished[0].rank === null) {
        activeUnfinished[0].rank = game.winnerRankings.length + 1;
        game.winnerRankings.push(activeUnfinished[0].id);
      }
      game.phase = 'FINISHED';
      game.lastAction = {
        type: 'GAME_OVER',
        winnerRankings: game.winnerRankings,
        message: 'Ludo match concluded!'
      };
      game.history.push(game.lastAction);
      return { game, moveExecuted: true, extraTurn: false, isGameOver: true };
    }

    // Turn transition
    game.currentDice = null;
    game.legalMoves = [];

    if (extraTurnAwarded && currentPlayer.finishedCount < 4) {
      game.phase = 'ROLL';
      return { game, moveExecuted: true, extraTurn: true, isGameOver: false };
    } else {
      game.consecutiveSixes = 0;
      game.phase = 'ROLL';
      advanceTurn(game);
      return { game, moveExecuted: true, extraTurn: false, isGameOver: false };
    }
  }

  /**
   * Advances turn to the next player who has not finished
   */
  function advanceTurn(game) {
    if (game.phase === 'FINISHED') return;

    game.consecutiveSixes = 0;
    let nextIndex = game.currentTurnIndex;
    let attempts = 0;
    do {
      nextIndex = (nextIndex + 1) % game.players.length;
      attempts++;
    } while (game.players[nextIndex].finishedCount >= 4 && attempts <= game.players.length);

    game.currentTurnIndex = nextIndex;
    game.turnCount += 1;
    game.currentDice = null;
    game.legalMoves = [];
    game.phase = 'ROLL';
  }

  return {
    TOTAL_TRACK_SQUARES,
    HOME_PATH_LENGTH,
    FINISH_STEP,
    START_SQUARES,
    DEFAULT_SAFE_SQUARES,
    HEROES,
    DEFAULT_RULES,
    createGame,
    getAbsoluteTrackIndex,
    computeLegalMoves,
    rollDice,
    moveToken,
    advanceTurn
  };
});
