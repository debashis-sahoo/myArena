import { useId, type ReactNode } from 'react';

export interface RadioOption<T extends string | number> { value: T; label: string; description?: string; extra?: ReactNode; }

interface RadioGroupProps<T extends string | number> {
  legend: string;
  value: T;
  options: readonly RadioOption<T>[];
  onChange: (value: T) => void;
  disabled?: boolean | undefined;
  /** Layout hook: "segmented" (compact buttons) or "cards" (larger choices with a description or preview). */
  variant?: 'segmented' | 'cards';
}

/** Native radios, so arrow keys, grouping and names come from the browser. */
export function RadioGroup<T extends string | number>({ legend, value, options, onChange, disabled = false, variant = 'segmented' }: RadioGroupProps<T>) {
  const name = useId();
  return (
    <fieldset className="ludo-fieldset" disabled={disabled}>
      <legend className="field-label">{legend}</legend>
      <div className={variant === 'cards' ? 'ludo-cards' : 'segmented'}>
        {options.map((option) => (
          <label key={String(option.value)} className={variant === 'cards' ? 'ludo-card' : 'segment'}>
            <input type="radio" name={name} value={String(option.value)} checked={option.value === value} onChange={() => onChange(option.value)} />
            {variant === 'cards' ? (
              <span className="ludo-card-body">
                {option.extra}
                <span className="ludo-card-title">{option.label}</span>
                {option.description ? <span className="muted">{option.description}</span> : null}
              </span>
            ) : <span>{option.label}</span>}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
