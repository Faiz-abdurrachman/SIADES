import { Request, Response, NextFunction } from 'express';
import * as userService from './user.service';
import { apiResponse } from '../../utils/apiResponse';

export async function createUserController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await userService.createUser(req.body, req.user!.userId);

    apiResponse({
      res,
      success: true,
      message: 'User created successfully',
      data: user,
      statusCode: 201,
    });
  } catch (error) {
    next(error);
  }
}

export async function getUserByIdController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await userService.getUserById(req.params.id);

    apiResponse({
      res,
      success: true,
      message: 'User retrieved successfully',
      data: user,
    });
  } catch (error) {
    next(error);
  }
}

export async function listUsersController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await userService.listUsers(req.query);

    apiResponse({
      res,
      success: true,
      message: 'Users retrieved successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateUserController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await userService.updateUser(req.params.id, req.body, req.user!.userId);

    apiResponse({
      res,
      success: true,
      message: 'User updated successfully',
      data: user,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteUserController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await userService.deleteUser(req.params.id, req.user!.userId);

    apiResponse({
      res,
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    next(error);
  }
}
