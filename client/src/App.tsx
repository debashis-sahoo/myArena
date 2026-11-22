import type { ReactElement } from 'react';
import { Route, Routes } from 'react-router';
import { ConnectionBanner } from './components/common/ConnectionBanner';
import { ArenaAtmosphere } from './components/common/ArenaAtmosphere';
import { Toaster } from './components/common/Toast';
import { HubPage } from './routes/HubPage';
import { RoomPage } from './routes/RoomPage';

export function App(): ReactElement {
  return (
    <>
      <ArenaAtmosphere />
      <ConnectionBanner />
      <Routes>
        <Route path="/" element={<HubPage entryMode="player" />} />
        <Route path="/host" element={<HubPage entryMode="host" />} />
        <Route path="/room/:gameId/:roomId" element={<RoomPage />} />
        <Route path="*" element={<HubPage entryMode="player" />} />
      </Routes>
      <Toaster />
    </>
  );
}
