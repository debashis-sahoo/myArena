import { createBrowserRouter, Link } from 'react-router';
import { App } from './App';
import { AppError } from './ErrorBoundary';
import { JoinRoutePage } from '../features/entry/JoinRoutePage';
import { LandingPage } from '../features/landing/LandingPage';
import { RoomPage } from '../features/lobby/RoomPage';
import { SoloPage } from '../features/solo/SoloPage';

export const router = createBrowserRouter([
  { element: <App />, errorElement: <AppError />, children: [
    { path: '/', element: <LandingPage /> },
    { path: '/join/:code', element: <JoinRoutePage /> },
    { path: '/room/:roomId', element: <RoomPage /> },
    { path: '/play/:gameId/solo', element: <SoloPage /> },
    { path: '*', element: <section><h1>Page unavailable</h1><p><Link to="/">Return to myArena Hub.</Link></p></section> },
  ] },
]);