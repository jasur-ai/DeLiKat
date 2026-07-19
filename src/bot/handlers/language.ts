import { Composer, Markup } from 'telegraf';
import { queryOne } from '../../lib/db';
import { mainMenuKeyboard } from '../keyboards/menu';
import { getText } from '../utils/i18n';
import { sessionManager } from '../utils/session';

const LANGUAGE_FLAGS: Record<string, string> = { uz: '🇺🇿', ru: '🇷🇺', en: '🇺🇸' };
const LANGUAGE_NAMES: Record<string, string> = { uz: "O'zbekcha", ru: 'Русский', en: 'English' };

export const languageCommands = new Composer();

languageCommands.command('language', async (ctx) => {
  const userId = ctx.from?.id;
  const session = userId ? sessionManager.getOrCreate(userId) : null;
  const currentLang = session?.lang || 'uz';

  const rows = ['uz', 'ru', 'en'].map(code => {
    const prefix = code === currentLang ? '✅ ' : '';
    return [Markup.button.callback(`${prefix}${LANGUAGE_FLAGS[code]} ${LANGUAGE_NAMES[code]}`, `lang_${code}`)];
  });
  rows.push([Markup.button.callback('◀️ Back', 'lang_done')]);

  await ctx.replyWithHTML(
    '🌐 <b>Tilni tanlang / Выберите язык / Select language:</b>',
    Markup.inlineKeyboard(rows)
  );
});

// Export callback handler for centralized dispatch
export async function handleLanguageCallback(ctx: any, data: string): Promise<boolean> {
  if (!data.startsWith('lang_')) return false;

  if (data === 'lang_done') {
    const userId = ctx.from?.id;
    const session = userId ? sessionManager.getOrCreate(userId) : null;
    const lang = session?.lang || 'uz';
    await ctx.editMessageText(
      getText(lang, 'lang', 'changed'),
      { parse_mode: 'HTML', reply_markup: mainMenuKeyboard(lang).reply_markup }
    );
    return true;
  }

  const newLang = data.replace('lang_', '');
  if (!['uz', 'ru', 'en'].includes(newLang)) return true;

  const userId = ctx.from?.id;
  if (userId) {
    const session = sessionManager.getOrCreate(userId);
    session.lang = newLang;

    // Save to DB
    try {
      await queryOne('UPDATE users SET lang = $1 WHERE id = $2', [newLang, userId]);
    } catch { /* skip db error */ }
  }

  await ctx.editMessageText(
    getText(newLang, 'lang', 'changed'),
    { parse_mode: 'HTML', reply_markup: mainMenuKeyboard(newLang).reply_markup }
  );
  return true;
}
