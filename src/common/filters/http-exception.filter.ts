import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const timestamp = new Date().toISOString();
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let error = 'Internal Server Error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        message = res;
        error = exception.name;
      } else if (typeof res === 'object' && res !== null) {
        const body = res as Record<string, any>;
        message = body.message || exception.message;
        error = body.error || exception.name;
      }
    } else if (exception && typeof exception === 'object' && (exception as any).code === 11000) {
      status = HttpStatus.CONFLICT;
      message = 'Duplicate key error: A record with that identifier already exists';
      error = 'Conflict';
    } else if (
      exception &&
      typeof exception === 'object' &&
      (exception as any).name === 'CastError'
    ) {
      status = HttpStatus.BAD_REQUEST;
      message = `Invalid format for field: ${(exception as any).path}`;
      error = 'Bad Request';
    } else if (exception instanceof Error) {
      this.logger.error(
        `Unhandled exception on ${request.method} ${request.url}: ${exception.message}`,
        exception.stack,
      );
    }

    response.status(status).json({
      success: false,
      timestamp,
      statusCode: status,
      path: request.url,
      message,
      error,
    });
  }
}
