import { dramaboxService } from './dramabox.service';

export class EpisodeService {
  async getEpisodeList(seriesId: string, lang: string = 'in') {
    return await dramaboxService.getEpisodes(seriesId, lang);
  }

  async getStream(seriesId: string, episode: number, lang: string = 'in', plan: string = 'free') {
    return await dramaboxService.getStream(seriesId, episode, lang, plan);
  }
}

export const episodeService = new EpisodeService();
