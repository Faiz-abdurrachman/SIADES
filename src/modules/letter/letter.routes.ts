import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import {
  createLetterTypeController,
  updateLetterTypeController,
  deleteLetterTypeController,
  listLetterTypesController,
  createLetterRequestController,
  getLetterRequestController,
  listLetterRequestsController,
  verifyLetterRequestController,
  approveLetterRequestController,
  rejectLetterRequestController,
} from './letter.controller';

const letterRouter = Router();

letterRouter.use(authenticate);

// ─── LETTER TYPE (admin only) ──────────────────────────────

letterRouter.post('/types', authorize(['admin']), createLetterTypeController);
letterRouter.get('/types', authorize(['admin', 'operator', 'kepala_desa']), listLetterTypesController);
letterRouter.put('/types/:id', authorize(['admin']), updateLetterTypeController);
letterRouter.delete('/types/:id', authorize(['admin']), deleteLetterTypeController);

// ─── LETTER REQUEST ────────────────────────────────────────

letterRouter.post('/requests', authorize(['operator']), createLetterRequestController);
letterRouter.get('/requests', authorize(['admin', 'operator', 'kepala_desa']), listLetterRequestsController);
letterRouter.get('/requests/:id', authorize(['admin', 'operator', 'kepala_desa']), getLetterRequestController);
letterRouter.patch('/requests/:id/verify', authorize(['operator']), verifyLetterRequestController);
letterRouter.patch('/requests/:id/approve', authorize(['kepala_desa']), approveLetterRequestController);
letterRouter.patch('/requests/:id/reject', authorize(['operator', 'kepala_desa']), rejectLetterRequestController);

export default letterRouter;
