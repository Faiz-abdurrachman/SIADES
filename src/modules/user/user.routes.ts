import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import {
  createUserController,
  getUserByIdController,
  listUsersController,
  updateUserController,
  deleteUserController,
} from './user.controller';

const userRouter = Router();

userRouter.use(authenticate);

userRouter.post('/', authorize(['admin']), createUserController);
userRouter.get('/', authorize(['admin']), listUsersController);
userRouter.get('/:id', authorize(['admin']), getUserByIdController);
userRouter.put('/:id', authorize(['admin']), updateUserController);
userRouter.delete('/:id', authorize(['admin']), deleteUserController);

export default userRouter;
