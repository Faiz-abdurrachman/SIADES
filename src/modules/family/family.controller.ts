import { Request, Response, NextFunction } from 'express';
import * as familyService from './family.service';
import { apiResponse } from '../../utils/apiResponse';

export async function createFamilyController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const family = await familyService.createFamily(req.body, req.user!.userId);

    apiResponse({
      res,
      success: true,
      message: 'Family created successfully',
      data: family,
      statusCode: 201,
    });
  } catch (error) {
    next(error);
  }
}

export async function getFamilyByIdController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const family = await familyService.getFamilyById(req.params.id);

    apiResponse({
      res,
      success: true,
      message: 'Family retrieved successfully',
      data: family,
    });
  } catch (error) {
    next(error);
  }
}

export async function listFamiliesController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await familyService.listFamilies(req.query);

    apiResponse({
      res,
      success: true,
      message: 'Families retrieved successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateFamilyController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const family = await familyService.updateFamily(req.params.id, req.body, req.user!.userId);

    apiResponse({
      res,
      success: true,
      message: 'Family updated successfully',
      data: family,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteFamilyController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await familyService.deleteFamily(req.params.id, req.user!.userId);

    apiResponse({
      res,
      success: true,
      message: 'Family deleted successfully',
    });
  } catch (error) {
    next(error);
  }
}
