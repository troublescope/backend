import { Context } from 'grammy';

export const pingCommand = async (ctx: Context) => {
  await ctx.reply('🏓 <b>Pong!</b>\n\nRegion: <code>Singapore (sin1)</code>', { parse_mode: 'HTML' });
};
