import { Request, Response, NextFunction } from 'express';
import * as residentService from './resident.service';
import { apiResponse } from '../../utils/apiResponse';

export async function createBirthResidentController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const resident = await residentService.createBirthResident(req.body, req.user!.userId);

    apiResponse({
      res,
      success: true,
      message: 'Resident birth recorded successfully',
      data: resident,
      statusCode: 201,
    });
  } catch (error) {
    next(error);
  }
}

export async function createMoveInResidentController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const resident = await residentService.createMoveInResident(req.body, req.user!.userId);

    apiResponse({
      res,
      success: true,
      message: 'Resident move-in recorded successfully',
      data: resident,
      statusCode: 201,
    });
  } catch (error) {
    next(error);
  }
}

export async function getResidentByIdController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const resident = await residentService.getResidentById(req.params.id);

    apiResponse({
      res,
      success: true,
      message: 'Resident retrieved successfully',
      data: resident,
    });
  } catch (error) {
    next(error);
  }
}

export async function listResidentsController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await residentService.listResidents(req.query);

    apiResponse({
      res,
      success: true,
      message: 'Residents retrieved successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateResidentController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const resident = await residentService.updateResident(req.params.id, req.body, req.user!.userId);

    apiResponse({
      res,
      success: true,
      message: 'Resident updated successfully',
      data: resident,
    });
  } catch (error) {
    next(error);
  }
}

export async function patchLifeStatusController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const resident = await residentService.patchLifeStatus(req.params.id, req.body, req.user!.userId);

    apiResponse({
      res,
      success: true,
      message: 'Resident life status updated successfully',
      data: resident,
    });
  } catch (error) {
    next(error);
  }
}

export async function patchDomicileStatusController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const resident = await residentService.patchDomicileStatus(req.params.id, req.body, req.user!.userId);

    apiResponse({
      res,
      success: true,
      message: 'Resident domicile status updated successfully',
      data: resident,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteResidentController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await residentService.deleteResident(req.params.id, req.user!.userId);

    apiResponse({
      res,
      success: true,
      message: 'Resident deleted successfully',
    });
  } catch (error) {
    next(error);
  }
}
