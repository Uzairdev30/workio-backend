import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
  timestamp: string;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    const response = context.switchToHttp().getResponse();
    return next.handle().pipe(
      map((data) => {
        const result = data?.message ? { success: true, statusCode: response.statusCode, message: data.message, data: data.data ?? data, timestamp: new Date().toISOString() } : { success: true, statusCode: response.statusCode, message: 'Request successful', data, timestamp: new Date().toISOString() };
        if (result.data?.message && result.data?.data !== undefined) {
          result.message = result.data.message;
          result.data = result.data.data;
        }
        return result;
      }),
    );
  }
}
