import { THEME_IDS, type ThemeId } from '@myarena/ludo';
import { RadioGroup } from '../view/RadioGroup';
import { ThemePreview } from './ThemePreview';
import { themes } from './themes';

interface ThemePickerProps { value: ThemeId; onChange: (theme: ThemeId) => void; disabled?: boolean | undefined; }

/** A "Theme" radio group (arrow keys move between themes) with a small preview and a description for each. */
export function ThemePicker({ value, onChange, disabled }: ThemePickerProps) {
  return (
    <RadioGroup
      legend="Theme" value={value} onChange={onChange} disabled={disabled} variant="cards"
      options={THEME_IDS.map((id) => ({ value: id, label: themes[id].name, description: themes[id].description, extra: <ThemePreview theme={id} /> }))}
    />
  );
}
