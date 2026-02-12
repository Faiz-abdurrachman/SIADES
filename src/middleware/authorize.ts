import { Request, Response, NextFunction } from 'express';
import { AuthorizationError } from '../utils/appError';

export function authorize(allowedRoles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const userRole = req.user?.role;

    if (!userRole || !allowedRoles.includes(userRole)) {
      next(new AuthorizationError('Insufficient permissions'));
      return;
    }

    next();
  };
}
