import { Router } from 'express';
import { loginController, meController } from './auth.controller';
import { authenticate } from '../../middleware/authenticate';

const authRouter = Router();

authRouter.post('/login', loginController);
authRouter.get('/me', authenticate, meController);

export default authRouter;
