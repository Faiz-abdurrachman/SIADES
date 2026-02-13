import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import {
  getEventByIdController,
  listEventsController,
} from './event.controller';

const eventRouter = Router();

eventRouter.use(authenticate);

eventRouter.get('/', authorize(['admin', 'operator', 'kepala_desa']), listEventsController);
eventRouter.get('/:id', authorize(['admin', 'operator', 'kepala_desa']), getEventByIdController);

export default eventRouter;
