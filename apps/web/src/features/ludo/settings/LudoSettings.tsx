import { THEME_IDS, type ThemeId } from '@myarena/ludo';
import type { GameSettingsProps } from '../../games/registry';
import { themeNames, turnLimitText } from '../themes/names';

const isTheme = (value: unknown): value is ThemeId => THEME_IDS.includes(value as ThemeId);

// Read-only for now; the host's pickers arrive with the theme and turn-limit stories.
export function LudoSettings({ settings }: GameSettingsProps) {
  const theme = settings.gameSettings.theme;
  return (
    <section aria-labelledby="ludo-settings-heading" className="panel stack">
      <h2 id="ludo-settings-heading">Room settings</h2>
      <p>Maximum players: {settings.maxParticipants}</p>
      <p>Theme: {isTheme(theme) ? themeNames[theme] : themeNames.classic}</p>
      <p>Turn limit: {turnLimitText(settings.gameSettings.turnLimitSeconds ?? 60)}</p>
    </section>
  );
}
