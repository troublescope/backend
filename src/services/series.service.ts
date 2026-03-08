import { dramaboxService } from './dramabox.service';

export class SeriesService {
  async getHomeData(lang: string = 'in') {
    return await dramaboxService.getHomeData(lang);
  }

  async getSeriesDetail(seriesId: string, lang: string = 'in') {
    return await dramaboxService.getDetail(seriesId, lang);
  }

  async searchSeries(query: string, page: number = 1, lang: string = 'in') {
    return await dramaboxService.search(query, page, lang);
  }

  async getVip(lang: string = 'in') {
    return await dramaboxService.getVip(lang);
  }
}

export const seriesService = new SeriesService();
