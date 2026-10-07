/**
 * myArena Royalty - Transparent Local AI Agent
 * Fast, deterministic heuristics for solo play without LLM overhead.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./ludo'));
  } else {
    root.GameAI = factory(root.LudoEngine);
  }
})(typeof self !== 'undefined' ? self : this, function (LudoEngine) {
  'use strict';

  /**
   * Decide best token move for Ludo
   * Evaluates each legal move with transparent heuristic scores:
   * +1000: Reaching Home
   * +500: Capturing an opponent token
   * +250: Escaping Yard / entering board
   * +100: Landing on a Safe Square
   * +80: Moving a token that is currently threatened by an opponent within 1-6 squares
   * +20: Advancing furthest token
   */
  function pickLudoMove(game) {
    if (!game || game.phase !== 'MOVE' || !game.legalMoves || game.legalMoves.length === 0) {
      return null;
    }

    if (game.legalMoves.length === 1) {
      return game.legalMoves[0].tokenIndex;
    }

    const currentPlayer = game.players[game.currentTurnIndex];
    let bestToken = game.legalMoves[0].tokenIndex;
    let bestScore = -Infinity;

    for (const move of game.legalMoves) {
      let score = 0;
      const targetStep = move.targetStep;
      const tokenIdx = move.tokenIndex;

      // 1. Reaching home is the ultimate priority
      if (targetStep === LudoEngine.FINISH_STEP) {
        score += 1000;
      }

      // 2. Entering the board from base
      if (move.type === 'ENTER_TRACK') {
        score += 250;
      }

      // 3. Capturing opponent
      if (move.targetTrackIndex !== null) {
        const isSafe = game.rules.safeSquaresEnabled && LudoEngine.DEFAULT_SAFE_SQUARES.includes(move.targetTrackIndex);
        if (!isSafe) {
          for (const opp of game.players) {
            if (opp.id === currentPlayer.id) continue;
            opp.tokens.forEach(oppStep => {
              if (oppStep >= 0 && oppStep <= 50) {
                const oppTrack = LudoEngine.getAbsoluteTrackIndex(opp.teamIndex, oppStep);
                if (oppTrack === move.targetTrackIndex) {
                  score += 500; // Capture bonus!
                }
              }
            });
          }
        } else {
          // Landing safely
          score += 100;
        }
      }

      // 4. Moving closer to home
      score += targetStep * 2;

      if (score > bestScore) {
        bestScore = score;
        bestToken = tokenIdx;
      }
    }

    return bestToken;
  }

  return {
    pickLudoMove
  };
});
