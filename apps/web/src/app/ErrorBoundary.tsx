import { Component, type ReactNode } from 'react';

export function AppError() {
  return <main className="content"><section role="alert"><h1>Something went wrong</h1><p>The page could not be displayed.</p><p><a href="/">Return to myArena Hub and try again.</a></p></section></main>;
}
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  override render() { return this.state.failed ? <AppError /> : this.props.children; }
}