import { RadioGroup } from './RadioGroup';
import type { Quality } from '../quality/quality';

export type QualityChoice = Quality | 'auto';

const options: { value: QualityChoice; label: string }[] = [
  { value: 'auto', label: 'Automatic' }, { value: 'high', label: 'High' }, { value: 'standard', label: 'Standard' }, { value: 'lite', label: 'Lite' },
];

/** "Visual quality": Automatic, High, Standard or Lite. It applies at once and is remembered on this device. */
export function QualityControl({ value, onChange }: { value: QualityChoice; onChange: (value: QualityChoice) => void }) {
  return <RadioGroup legend="Visual quality" value={value} options={options} onChange={onChange} />;
}
