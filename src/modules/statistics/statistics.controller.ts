import { Request, Response, NextFunction } from 'express';
import * as statisticsService from './statistics.service';
import { apiResponse } from '../../utils/apiResponse';

export async function getStatisticsSummaryController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await statisticsService.getStatisticsSummary(req.query);

    apiResponse({
      res,
      success: true,
      message: 'Statistics summary retrieved successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}
