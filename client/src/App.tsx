import type { ReactElement } from 'react';
import { Route, Routes } from 'react-router';
import { ConnectionBanner } from './components/common/ConnectionBanner';
import { Toaster } from './components/common/Toast';
import { HubPage } from './routes/HubPage';
import { RoomPage } from './routes/RoomPage';

export function App(): ReactElement {
  return (
    <>
      <ConnectionBanner />
      <Routes>
        <Route path="/" element={<HubPage />} />
        <Route path="/room/:gameId/:roomId" element={<RoomPage />} />
        <Route path="*" element={<HubPage />} />
      </Routes>
      <Toaster />
    </>
  );
}
