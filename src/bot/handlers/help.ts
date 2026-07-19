import { Composer } from 'telegraf';
import { mainMenuKeyboard } from '../keyboards/menu';
import { helpFull } from '../utils/formatting';

export const helpCommands = new Composer();

helpCommands.command('help', async (ctx) => {
  await ctx.replyWithHTML(
    helpFull(),
    mainMenuKeyboard()
  );
});
