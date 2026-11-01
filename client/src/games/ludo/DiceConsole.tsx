import { useEffect, useRef, type CSSProperties, type ReactElement } from 'react';
import { COLOR_HEX } from '@myarena/shared';
import { useReducedMotion } from '../../state/viewport';
import { playRoll } from './anim/dice';
import { Die, type DieRefs } from './Die';
import type { PlayerInfo } from './playerInfo';
import type { ReadyLudo } from './useLudo';

interface Props {
  ludo: ReadyLudo;
  info: Map<string, PlayerInfo>;
  /** Short screens: smaller chrome. */
  compact: boolean;
  /** Die on the left, turn text, countdown, and ROLL DICE on the right (portrait and compact layouts). */
  row: boolean;
}

function clock(ms: number): string {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function typingTarget(el: EventTarget | null): boolean {
  return el instanceof HTMLElement && !!el.closest('input, textarea, select, button, [contenteditable="true"]');
}

/**
 * "DICE ROLL" console: whose turn it is, the countdown, the 3D die, and ROLL DICE. The die, ROLL DICE, and the spacebar
 * all call the same `roll()`; the displayed face always equals the server's result.
 */
export function DiceConsole({ ludo, info, compact, row }: Props): ReactElement {
  const { state, anim, youId, isMyTurn, canRoll, countdownMs, pending, notice, roll } = ludo;
  const reduced = useReducedMotion();
  const refs = useRef<DieRefs>({ tray: null, throwEl: null, cube: null, shadow: null });
  const shakeRef = useRef<HTMLDivElement>(null);
  const prevFace = useRef(state.roll?.value ?? 1);
  const rolling = anim?.event.type === 'rolled';
  const resting = rolling ? prevFace.current : (state.roll?.value ?? prevFace.current);
  if (!rolling && state.roll) prevFace.current = state.roll.value;

  const animId = anim?.id;
  useEffect(() => {
    const ev = anim?.event;
    if (!ev || ev.type !== 'rolled') return;
    const r = refs.current;
    const shake = shakeRef.current;
    if (!r.tray || !r.throwEl || !r.cube || !r.shadow || !shake) return;
    const rect = r.tray.getBoundingClientRect();
    void playRoll(
      { throwEl: r.throwEl, cubeEl: r.cube, shadowEl: r.shadow, shakeEl: shake, trayWidth: rect.width, trayHeight: rect.height },
      prevFace.current,
      ev.value,
      reduced,
    );
    // Keyed by the animation id: the roll plays once per event.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animId]);

  // Spacebar rolls only on my turn, and never while typing or while a dialog or control has focus.
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.code !== 'Space' || e.repeat) return;
      if (typingTarget(e.target) || document.body.classList.contains('modal-open')) return;
      if (!canRoll) return;
      e.preventDefault();
      roll();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canRoll, roll]);

  const turnPlayer = state.players.find((p) => p.playerId === state.turn);
  const turnName = turnPlayer ? (info.get(turnPlayer.playerId)?.name ?? 'Player') : '';
  const accent = COLOR_HEX[turnPlayer?.color ?? ''] ?? '#fff';
  const finished = state.phase === 'finished';

  let message = notice;
  if (rolling || pending === 'roll') message = 'Rolling...';
  else if (pending === 'move') message = 'Moving...';
  else if (isMyTurn && state.phase === 'waiting_move' && !anim) message = 'Tap a glowing pawn to move';
  else if (canRoll) message = state.bonus ? 'Roll again!' : 'Roll the die!';
  else if (!isMyTurn && !finished && state.phase === 'waiting_roll' && state.remainingMs !== null) message = null;

  const shown = rolling ? null : (state.roll?.value ?? null);
  const showClock = countdownMs !== null && !rolling && !finished;

  const tray = (
    <div className={`roll-target ${canRoll ? 'golden' : ''}`}>
      <Die face={resting} disabled={!canRoll} onRoll={roll} refs={refs} />
      {canRoll && (
        <span className="roll-tooltip" aria-hidden="true">
          Your Turn to Roll!
        </span>
      )}
    </div>
  );
  const turn = (
    <p className="turn-text" aria-hidden={finished}>
      {finished ? 'MATCH OVER' : isMyTurn ? 'YOUR TURN!' : `${turnName}'s TURN...`}
    </p>
  );
  const side = (
    <div className="dice-side">
      {showClock && (
        <span className="countdown" role="timer" aria-label={`${Math.ceil((countdownMs ?? 0) / 1000)} seconds left`}>
          {clock(countdownMs ?? 0)}
        </span>
      )}
      {shown !== null && !finished && (
        <span className="last-roll" aria-hidden="true">
          {shown}
        </span>
      )}
      <button type="button" className="btn lime roll-btn" disabled={!canRoll} onClick={roll}>
        ROLL DICE
      </button>
    </div>
  );
  const note = (
    <p className="dice-message" role="status" aria-live="polite">
      {message}
    </p>
  );

  return (
    <section
      ref={shakeRef}
      className={`dice-console ${row ? 'row' : 'stack'} ${isMyTurn && !finished ? 'mine' : 'theirs'} ${canRoll ? 'can-roll' : ''} ${compact ? 'compact' : ''}`}
      style={{ ['--c' as string]: accent } as CSSProperties}
      aria-label="Dice roll"
    >
      {row ? (
        <div className="dc-row">
          {tray}
          <div className="dc-info">
            <h2 className="dice-title">DICE ROLL</h2>
            {turn}
            {side}
            {note}
          </div>
        </div>
      ) : (
        <>
          <h2 className="dice-title">DICE ROLL</h2>
          {turn}
          <div className="dice-stage">
            {tray}
            {side}
          </div>
          {note}
        </>
      )}
      {state.warning === youId && (
        <p className="dice-banner warn" role="alert">
          You missed 2 turns. Miss another and you will be removed.
        </p>
      )}
      {state.lastPlayer === youId && !finished && (
        <p className="dice-banner info" role="status">
          You are the last player. Keep playing, or press Quit to leave.
        </p>
      )}
    </section>
  );
}
