import { Router } from 'express';
import { config as appConfig } from '../config/env';

const router = Router();

router.get('/', (req, res) => {
  res.json({
    miniAppUrl: appConfig.miniAppUrl,
    version: '1.0.0'
  });
});

export default router;