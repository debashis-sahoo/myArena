import { JoinRoomForm } from '../entry/JoinRoomForm';

export function JoinWithCode() {
  return <div id="join-section" tabIndex={-1} className="join-section"><JoinRoomForm heading="Join with Room Code" /></div>;
}
