import { bot } from './src/bot/bot';
import { config } from './src/config/env';

async function testBot() {
  console.log('Testing bot commands locally...');
  console.log('Bot token in config:', config.botToken);
  
  // Simulate a message
  const update: any = {
    update_id: 10000,
    message: {
      message_id: 1,
      from: { id: 12345, is_bot: false, first_name: 'TestUser' },
      chat: { id: 12345, type: 'private' },
      date: Math.floor(Date.now() / 1000),
      text: '/ping'
    }
  };

  try {
    console.log('Initializing bot...');
    await bot.init();
    console.log('Bot initialized:', bot.botInfo.username);
    
    console.log('Handling /ping update...');
    await bot.handleUpdate(update);
    console.log('Update handled successfully.');
  } catch (err) {
    console.error('Error handling update:', err);
  }
}

testBot();
