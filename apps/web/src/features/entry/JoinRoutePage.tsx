import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { ApiError, apiRequest } from '../../platform/api-client';
import { JoinRoomForm } from './JoinRoomForm';

type Check = { status: 'checking' } | { status: 'ready' } | { status: 'blocked'; error: ApiError };

export function JoinRoutePage() {
  const { code = '' } = useParams();
  const [check, setCheck] = useState<Check>({ status: 'checking' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setCheck({ status: 'checking' });
    apiRequest(`/api/invitations/${encodeURIComponent(code)}`)
      .then(() => active && setCheck({ status: 'ready' }))
      .catch((error: unknown) => active && setCheck({
        status: 'blocked',
        error: error instanceof ApiError ? error : new ApiError(0, 'NETWORK_UNAVAILABLE', 'The invitation could not be checked.', 'Try again.'),
      }));
    return () => { active = false; };
  }, [code, attempt]);

  if (check.status === 'checking') return <p role="status">Checking the invitation…</p>;
  if (check.status === 'ready') return <div className="stack"><h1>Join a room</h1><JoinRoomForm initialCode={code} /></div>;
  return (
    <section role="alert" className="panel stack">
      <h1>This invitation can't be used</h1>
      <p>{check.error.message} {check.error.nextStep}</p>
      <div className="cluster">
        <button type="button" onClick={() => setAttempt((count) => count + 1)}>Try again</button>
        <Link to="/" className="touch-link">Enter a different code</Link>
      </div>
    </section>
  );
}
