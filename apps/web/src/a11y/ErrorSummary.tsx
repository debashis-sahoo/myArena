import { useEffect, useRef } from 'react';
import { focusElement } from './focus';

export interface FormError { message: string; nextStep?: string | undefined; fieldId?: string | undefined; }

export function ErrorSummary({ errors }: { errors: FormError[] }) {
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => { if (errors.length) focusElement(container.current); }, [errors]);
  if (!errors.length) return null;
  return (
    <div ref={container} role="alert" tabIndex={-1} className="error-summary">
      <h2>There is a problem</h2>
      <ul>
        {errors.map((error, index) => (
          <li key={index}>
            {error.fieldId ? (
              <a href={`#${error.fieldId}`} onClick={(event) => { event.preventDefault(); focusElement(document.getElementById(error.fieldId!)); }}>
                {error.message}
              </a>
            ) : error.message}
            {error.nextStep ? <> {error.nextStep}</> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
