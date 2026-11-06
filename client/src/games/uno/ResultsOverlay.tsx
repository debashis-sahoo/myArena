import './ResultsOverlay.css';
import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactElement } from 'react';
import { COLOR_HEX, getGame, type UnoTable } from '@myarena/shared';
import { Avatar } from '../../art/Avatars';
import { Confetti } from '../../components/common/Confetti';
import { playAgain } from './unoStore';

/*
 * The match results over the dimmed table: the winner, the standings (place, avatar, name, cards left or "Left") and the way on.
 *   table         the shown table; renders nothing until its phase is 'finished'
 *   youId         the viewer's playerId
 *   info          platform avatar keys by playerId (usePlayerInfo(room) fits); a missing entry falls back to the fox, or the robot for a bot
 *   canPlayAgain  the viewer may re-deal: the host in an online room, the human in a solo room; everyone else sees "Waiting for the host to play again."
 *   onHub         Back to Hub (everyone): the screen calls leaveRoom and navigates to '/'
 * Play again is disabled with a reason while fewer than two seats are still active.
 */
export interface ResultsOverlayProps {
  table: UnoTable;
  youId: string;
  info: ReadonlyMap<string, { avatar: string }>;
  canPlayAgain: boolean;
  onHub: () => void;
}

const SEAT_COLORS = getGame('uno')?.seatColors ?? [];
const FOCUSABLE = 'button:not([disabled])';
/** A refused or slow re-deal must not leave the button stuck on "Dealing...". */
const BUSY_MS = 3000;

export function ResultsOverlay({ table, youId, info, canPlayAgain, onHub }: ResultsOverlayProps): ReactElement | null {
  const titleId = useId();
  const reasonId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const againBtn = useRef<HTMLButtonElement>(null);
  const hubBtn = useRef<HTMLButtonElement>(null);
  const mounted = useRef(true);
  const [busy, setBusy] = useState(false);
  const finished = table.phase === 'finished';

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (finished) (againBtn.current ?? hubBtn.current)?.focus();
  }, [finished]);

  if (!finished) return null;

  const standings = table.standings ?? [];
  const seat = (id: string) => table.players.find((p) => p.playerId === id);
  const winner = table.winner ? seat(table.winner) : undefined;
  const youWon = table.winner === youId;
  const active = table.players.filter((p) => p.status === 'active').length;
  const tooFew = active < 2;

  const again = async (): Promise<void> => {
    if (busy || tooFew) return;
    setBusy(true);
    const ok = await playAgain();
    if (!ok && mounted.current) setBusy(false);
    else window.setTimeout(() => mounted.current && setBusy(false), BUSY_MS);
  };

  const trapTab = (e: KeyboardEvent<HTMLDivElement>): void => {
    if (e.key !== 'Tab') return;
    const items = [...(panel.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])];
    const first = items[0];
    const last = items[items.length - 1];
    if (!first || !last) return;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const ringOf = (id: string): string | undefined => {
    const slot = seat(id)?.slot;
    const name = slot === undefined ? undefined : SEAT_COLORS[slot];
    return name ? COLOR_HEX[name] : undefined;
  };
  const avatarOf = (id: string): string => info.get(id)?.avatar ?? (seat(id)?.kind === 'bot' ? 'robot' : 'fox');

  return (
    <div className="un-results">
      <Confetti count={34} />
      <div className="un-res-panel" role="dialog" aria-modal="true" aria-labelledby={titleId} ref={panel} onKeyDown={trapTab}>
        <div className="un-res-win">
          {table.winner && <Avatar k={avatarOf(table.winner)} size={64} ring={ringOf(table.winner)} />}
          <h2 id={titleId} className="un-res-title">
            <span aria-hidden="true">🏆 </span>
            {youWon ? 'You win!' : `${winner?.name ?? 'A player'} wins!`}
          </h2>
        </div>
        <ol className="un-res-list" aria-label="Standings">
          {standings.map((s) => {
            const mine = s.playerId === youId;
            const left = s.status === 'left' || s.cardsLeft === null;
            return (
              <li
                key={s.playerId}
                className={`un-res-row${s.playerId === table.winner ? ' is-winner' : ''}${mine ? ' is-you' : ''}${left ? ' is-left' : ''}`}
                style={{ '--c': ringOf(s.playerId) ?? '#fff' } as CSSProperties}
              >
                <span className="un-res-place">{s.place}</span>
                <Avatar k={avatarOf(s.playerId)} size={32} ring={ringOf(s.playerId)} />
                <span className="un-res-name">
                  <span className="un-res-nm">{s.name}</span>
                  {mine && <em className="un-res-you"> (you)</em>}
                  {seat(s.playerId)?.kind === 'bot' && <i className="un-res-bot">Bot</i>}
                </span>
                <span className="un-res-cards">{left ? 'Left' : `${s.cardsLeft} ${s.cardsLeft === 1 ? 'card' : 'cards'}`}</span>
              </li>
            );
          })}
        </ol>
        <div className="un-res-foot">
          <div className="un-res-actions">
            <button type="button" ref={hubBtn} className="un-btn" onClick={onHub}>
              Back to Hub
            </button>
            {canPlayAgain && (
              <button
                type="button"
                ref={againBtn}
                className="un-btn gold"
                aria-disabled={tooFew || busy}
                aria-describedby={tooFew ? reasonId : undefined}
                onClick={() => void again()}
              >
                {busy ? 'Dealing...' : 'Play again'}
              </button>
            )}
          </div>
          {canPlayAgain && tooFew && (
            <p id={reasonId} className="un-res-note">
              At least two players are needed.
            </p>
          )}
          {!canPlayAgain && <p className="un-res-note">Waiting for the host to play again.</p>}
        </div>
      </div>
    </div>
  );
}
