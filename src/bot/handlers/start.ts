import { Scenes } from 'telegraf';
import { query } from '../../lib/db';
import { mainMenuKeyboard, contactKeyboard, roleKeyboard } from '../keyboards/menu';
import { sessionManager } from '../utils/session';
import { welcomeNew, welcomeBack, registrationComplete } from '../utils/formatting';
import { getText } from '../utils/i18n';

export const startWizard = new Scenes.WizardScene<any>(
  'registration',
  async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return ctx.scene.leave();

    // Check if user already exists
    const user = await query<any>('SELECT * FROM users WHERE id = $1', [userId]);
    if (user.length > 0) {
      const u = user[0];
      const session = sessionManager.getOrCreate(userId);
      session.isAuthenticated = true;
      session.role = u.role;
      session.name = u.name;

      await ctx.replyWithHTML(
        welcomeBack(u.name, u.role, u.rating),
        { reply_markup: mainMenuKeyboard().reply_markup }
      );
      return ctx.scene.leave();
    }

    // New user
    const session = sessionManager.getOrCreate(userId);
    session.state = 'awaiting_phone';

    const stats = { lots: 21, users: 7, categories: 6 };
    await ctx.replyWithHTML(
      welcomeNew(ctx.from?.first_name || 'Foydalanuvchi', stats),
      { reply_markup: contactKeyboard().reply_markup }
    );
    ctx.wizard.next();
  },
  async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return ctx.scene.leave();

    const msg = ctx.message as any;
    let phone = '';

    if (msg?.contact) {
      phone = msg.contact.phone_number;
    } else if (msg?.text) {
      phone = msg.text.trim();
      if (!phone.startsWith('+') || phone.length < 10) {
        await ctx.reply(
          getText('uz', 'welcome', 'invalid_phone'),
          { reply_markup: contactKeyboard().reply_markup }
        );
        return;
      }
    }

    const session = sessionManager.getOrCreate(userId);
    session.data.phone = phone;

    await ctx.reply(
      `${getText('uz', 'welcome', 'phone_received')}\n\n${getText('uz', 'welcome', 'role_prompt')}\n\n` +
      `🛒 Sotuvchi — Mahsulotlaringizni sotasiz\n` +
      `🛍️ Xaridor — Arzon partiya qidirasiz\n` +
      `🔄 Ikkalasi — Ham sotasiz, ham olasiz`,
      { reply_markup: roleKeyboard().reply_markup }
    );
    ctx.wizard.next();
  },
  async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId || !ctx.callbackQuery) return ctx.scene.leave();

    const data = (ctx.callbackQuery as any).data;
    const roleMap: Record<string, string> = { role_sotuvchi: 'sotuvchi', role_xaridor: 'xaridor', role_ikkalasi: 'ikkalasi' };
    const role = roleMap[data] || 'ikkalasi';

    const session = sessionManager.getOrCreate(userId);
    const phone = session.data.phone || '';

    try {
      await query(
        `INSERT INTO users (id, username, phone, name, role, rating, lang)
         VALUES ($1, $2, $3, $4, $5, 0, 'uz')
         ON CONFLICT (id) DO UPDATE SET role = $5`,
        [userId, ctx.from?.username || '', phone, ctx.from?.first_name || 'Foydalanuvchi', role]
      );

      session.isAuthenticated = true;
      session.role = role;
      session.name = ctx.from?.first_name || '';

      await ctx.editMessageText(
        registrationComplete(ctx.from?.first_name || '', phone, role, 'uz'),
        { parse_mode: 'HTML', reply_markup: mainMenuKeyboard().reply_markup }
      );
    } catch (err) {
      console.error('Registration error:', err);
      await ctx.reply(getText('uz', 'registration', 'error'));
    }

    return ctx.scene.leave();
  }
);

// Add cancel fallback by checking messages in the wizard
// The wizard scene handler intercepts updates, so we can't use regular command handlers
// Instead, use the "handlers" option in scenes or add a middleware
