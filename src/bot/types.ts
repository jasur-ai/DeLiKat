import { Scenes } from 'telegraf';

export interface BotContext extends Scenes.SceneContext {
  // SceneContext already has 'scene' and 'session' properties
  // WizardScene's complex type constraints are handled with 'as any' in scene files
}
