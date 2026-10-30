import type { OnlineGameModule } from '../games/registry';
import { LudoMatch } from './match/LudoMatch';
import { LudoSettings } from './settings/LudoSettings';

const ludo: OnlineGameModule = { Settings: LudoSettings, Match: LudoMatch };
export default ludo;
