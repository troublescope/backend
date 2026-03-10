import { dramaboxService } from './dramabox.service';

export class SeriesService {
  async getHomeData(lang: string = 'in', page: number = 1, limit: number = 20) {
    return await dramaboxService.getHomeData(lang, page, limit);
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

  async getCategories(lang: string = 'in') {
    return await dramaboxService.getCategories(lang);
  }

  async getCategoryFeed(categoryId: string, lang: string = 'in', page: number = 1, limit: number = 20) {
    return await dramaboxService.getCategoryFeed(categoryId, lang, page, limit);
  }

  async getForYouFeed(lang: string = 'in', page: number = 1, limit: number = 20) {
    return await dramaboxService.getForYouFeed(lang, page, limit);
  }

  async getTrendingFeed(lang: string = 'in', page: number = 1, limit: number = 20) {
    return await dramaboxService.getTrendingFeed(lang, page, limit);
  }

  async getNewestFeed(lang: string = 'in', page: number = 1, limit: number = 20) {
    return await dramaboxService.getNewestFeed(lang, page, limit);
  }
}

export const seriesService = new SeriesService();
