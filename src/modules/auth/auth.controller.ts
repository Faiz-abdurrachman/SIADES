import { Request, Response, NextFunction } from 'express';
import { login } from './auth.service';
import { apiResponse } from '../../utils/apiResponse';

export async function loginController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = await login(req.body);

    apiResponse({
      res,
      success: true,
      message: 'Login successful',
      data: { token },
    });
  } catch (error) {
    next(error);
  }
}

export function meController(req: Request, res: Response): void {
  apiResponse({
    res,
    success: true,
    message: 'Authenticated user',
    data: {
      userId: req.user!.userId,
      role: req.user!.role,
    },
  });
}
