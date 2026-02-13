import { Request, Response, NextFunction } from 'express';
import * as letterService from './letter.service';
import { apiResponse } from '../../utils/apiResponse';

// ─── LETTER TYPE ───────────────────────────────────────────

export async function createLetterTypeController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const letterType = await letterService.createLetterType(req.body, req.user!.userId);

    apiResponse({
      res,
      success: true,
      message: 'Letter type created successfully',
      data: letterType,
      statusCode: 201,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateLetterTypeController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const letterType = await letterService.updateLetterType(req.params.id, req.body, req.user!.userId);

    apiResponse({
      res,
      success: true,
      message: 'Letter type updated successfully',
      data: letterType,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteLetterTypeController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await letterService.deleteLetterType(req.params.id, req.user!.userId);

    apiResponse({
      res,
      success: true,
      message: 'Letter type deleted successfully',
    });
  } catch (error) {
    next(error);
  }
}

export async function listLetterTypesController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await letterService.listLetterTypes(req.query);

    apiResponse({
      res,
      success: true,
      message: 'Letter types retrieved successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

// ─── LETTER REQUEST ────────────────────────────────────────

export async function createLetterRequestController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const letterRequest = await letterService.createLetterRequest(req.body, req.user!.userId);

    apiResponse({
      res,
      success: true,
      message: 'Letter request created successfully',
      data: letterRequest,
      statusCode: 201,
    });
  } catch (error) {
    next(error);
  }
}

export async function getLetterRequestController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const letterRequest = await letterService.getLetterRequestById(req.params.id);

    apiResponse({
      res,
      success: true,
      message: 'Letter request retrieved successfully',
      data: letterRequest,
    });
  } catch (error) {
    next(error);
  }
}

export async function listLetterRequestsController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await letterService.listLetterRequests(req.query);

    apiResponse({
      res,
      success: true,
      message: 'Letter requests retrieved successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function verifyLetterRequestController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const letterRequest = await letterService.verifyLetterRequest(req.params.id, req.user!.userId);

    apiResponse({
      res,
      success: true,
      message: 'Letter request verified successfully',
      data: letterRequest,
    });
  } catch (error) {
    next(error);
  }
}

export async function approveLetterRequestController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const letterRequest = await letterService.approveLetterRequest(req.params.id, req.user!.userId);

    apiResponse({
      res,
      success: true,
      message: 'Letter request approved successfully',
      data: letterRequest,
    });
  } catch (error) {
    next(error);
  }
}

export async function rejectLetterRequestController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const letterRequest = await letterService.rejectLetterRequest(req.params.id, req.body, req.user!.userId);

    apiResponse({
      res,
      success: true,
      message: 'Letter request rejected successfully',
      data: letterRequest,
    });
  } catch (error) {
    next(error);
  }
}
