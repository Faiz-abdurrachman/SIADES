import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { getStatisticsSummaryController } from './statistics.controller';

const statisticsRouter = Router();

statisticsRouter.use(authenticate);

statisticsRouter.get('/summary', authorize(['admin', 'kepala_desa']), getStatisticsSummaryController);

export default statisticsRouter;
