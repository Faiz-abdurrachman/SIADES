import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import {
  createResidentController,
  getResidentByIdController,
  listResidentsController,
  updateResidentController,
  patchLifeStatusController,
  patchDomicileStatusController,
  deleteResidentController,
} from './resident.controller';

const residentRouter = Router();

residentRouter.use(authenticate);

residentRouter.post('/', authorize(['admin', 'operator']), createResidentController);
residentRouter.get('/', authorize(['admin', 'operator', 'kepala_desa']), listResidentsController);
residentRouter.get('/:id', authorize(['admin', 'operator', 'kepala_desa']), getResidentByIdController);
residentRouter.put('/:id', authorize(['admin', 'operator']), updateResidentController);
residentRouter.patch('/:id/life-status', authorize(['admin', 'operator']), patchLifeStatusController);
residentRouter.patch('/:id/domicile-status', authorize(['admin', 'operator']), patchDomicileStatusController);
residentRouter.delete('/:id', authorize(['admin']), deleteResidentController);

export default residentRouter;
