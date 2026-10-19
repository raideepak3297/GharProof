import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ResponseFormat<T> {
  success: boolean;
  timestamp: string;
  data: T;
}

@Injectable()
export class TransformResponseInterceptor<T> implements NestInterceptor<T, ResponseFormat<T> | T> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ResponseFormat<T> | T> {
    return next.handle().pipe(
      map((data) => {
        // If the handler already returned a stream (e.g. PDF download) or null/undefined, handle appropriately
        const httpCtx = context.switchToHttp();
        const response = httpCtx.getResponse();

        // Check if header indicates binary stream (like PDF)
        const contentType = response.getHeader('Content-Type');
        if (
          contentType &&
          typeof contentType === 'string' &&
          contentType.includes('application/pdf')
        ) {
          return data;
        }

        return {
          success: true,
          timestamp: new Date().toISOString(),
          data: data !== undefined ? data : null,
        };
      }),
    );
  }
}
