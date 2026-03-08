import { InlineQueryResultBuilder } from 'grammy';
import { dramaboxService } from '../../services/dramabox.service';
import { config } from '../../config/env';

export const inlineQueryHandler = async (ctx: any) => {
  const query = ctx.inlineQuery.query;
  
  if (!query) return;

  try {
    const results = await dramaboxService.search(query, 1, 'in');
    
    const inlineResults = results.slice(0, 50).map((drama) => {
      const miniAppUrl = `${config.miniAppUrl}#tgWebAppStartParam=${drama.id}`;
      
      const tags = drama.tags.length > 0 
        ? `\nTags: <i>${drama.tags.slice(0, 3).join(', ')}</i>` 
        : '';
      
      // Simple and Elegant HTML Layout
      const caption = `<b>${drama.title}</b>\n\n` +
        `Episodes: <code>${drama.chapters}</code>\n` +
        `Views: <code>${drama.playCount}</code>` +
        `${tags}\n\n` +
        `<i>${drama.description.substring(0, 300)}${drama.description.length > 300 ? '...' : ''}</i>`;

      return InlineQueryResultBuilder.photo(
        `drama:${drama.id}`,
        drama.cover,
        {
          title: drama.title,
          description: `${drama.chapters} Episodes`,
          thumbnail_url: drama.cover,
          caption: caption,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: '▶️ Watch Now',
                  web_app: { url: miniAppUrl }
                }
              ]
            ]
          }
        }
      );
    });

    await ctx.answerInlineQuery(inlineResults, {
      cache_time: 300, 
      is_personal: false
    });
  } catch (err) {
    console.error('Inline search error:', err);
  }
};
