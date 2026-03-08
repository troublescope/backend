import { Bot } from 'grammy';
import { config } from '../config/env';
import { startCommand } from './commands/start';
import { pingCommand } from './commands/ping';
import { inlineQueryHandler } from './handlers/inlineQuery';

if (!config.botToken) {
  throw new Error('BOT_TOKEN is not provided.');
}

export const bot = new Bot(config.botToken);

bot.command('start', startCommand);
bot.command('ping', pingCommand);
bot.on('inline_query', inlineQueryHandler);

let initPromise: Promise<void> | null = null;

const ensureBotInitialized = async () => {
  if (bot.isInited()) return;
  if (!initPromise) {
    initPromise = bot.init().then(() => undefined).finally(() => {
      initPromise = null;
    });
  }
  await initPromise;
};

export const handleTelegramUpdate = async (update: unknown) => {
  await ensureBotInitialized();
  await bot.handleUpdate(update as any);
};
