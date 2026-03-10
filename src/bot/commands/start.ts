import { Context, InlineKeyboard } from 'grammy';
import { config } from '../../config/env';

export const startCommand = async (ctx: Context) => {
  const payload = ctx.match; 

  let targetUrl = config.miniAppUrl;

  if (payload) {
    // Standard Telegram Mini App start parameter
    targetUrl = `${config.miniAppUrl}#tgWebAppStartParam=${payload}`;
  }

  const keyboard = new InlineKeyboard().webApp(
    payload ? '▶️ Watch Now' : '📺 Open Streaming App',
    targetUrl
  );

  const message = payload 
    ? `<b>Ready to watch?</b>\n\nClick the button below to jump straight into the series!`
    : `<b>Welcome to the Streaming App!</b>\n\nClick the button below to start watching your favorite dramas.`;

  await ctx.reply(message, {
    reply_markup: keyboard,
    parse_mode: 'HTML'
  });
};