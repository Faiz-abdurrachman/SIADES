import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import {
  createFamilyController,
  getFamilyByIdController,
  listFamiliesController,
  updateFamilyController,
  deleteFamilyController,
} from './family.controller';

const familyRouter = Router();

familyRouter.use(authenticate);

familyRouter.post('/', authorize(['admin', 'operator']), createFamilyController);
familyRouter.get('/', authorize(['admin', 'operator', 'kepala_desa']), listFamiliesController);
familyRouter.get('/:id', authorize(['admin', 'operator', 'kepala_desa']), getFamilyByIdController);
familyRouter.put('/:id', authorize(['admin', 'operator']), updateFamilyController);
familyRouter.delete('/:id', authorize(['admin']), deleteFamilyController);

export default familyRouter;
