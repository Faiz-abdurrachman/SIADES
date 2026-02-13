import { Request, Response, NextFunction } from 'express';
import * as eventService from './event.service';
import { apiResponse } from '../../utils/apiResponse';

export async function getEventByIdController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const event = await eventService.getEventById(req.params.id);

    apiResponse({
      res,
      success: true,
      message: 'Event retrieved successfully',
      data: event,
    });
  } catch (error) {
    next(error);
  }
}

export async function listEventsController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await eventService.listEvents(req.query);

    apiResponse({
      res,
      success: true,
      message: 'Events retrieved successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}
