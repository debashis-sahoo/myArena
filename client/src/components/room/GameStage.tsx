import { useEffect, useRef, useState, type ReactElement } from 'react';
import type { RoomState } from '@myarena/shared';
import { getBoard } from '../../games/registry';
import { useReducedMotion } from '../../state/viewport';

/**
 * Mounts the game's board in the largest available square and keeps it correct on resize and rotation
 * (FR-023, FR-032, FR-033). The board never overflows the stage.
 */
export function GameStage({ room, playerId }: { room: RoomState; playerId: string }): ReactElement {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(0);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect) setSize(Math.floor(Math.min(rect.width, rect.height)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const Board = getBoard(room.gameId);
  const me = room.seats.find((s) => s.occupant?.playerId === playerId)?.occupant;

  return (
    <div className="stage" ref={ref}>
      <div className="stage-inner" style={{ width: size, height: size }}>
        {size > 0 && (
          <Board
            room={room}
            you={{ playerId, color: me?.color ?? 'red', isHost: me?.isHost ?? false }}
            matchState={room.state}
            stageSize={size}
            send={() => undefined}
            reducedMotion={reducedMotion}
          />
        )}
      </div>
    </div>
  );
}
