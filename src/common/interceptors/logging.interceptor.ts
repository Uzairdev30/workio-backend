import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const correlationId = uuidv4();
    request.correlationId = correlationId;
    const { method, url, body } = request;
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          this.logger.log(`${method} ${url} ${context.switchToHttp().getResponse().statusCode} +${duration}ms [${correlationId}]`);
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          this.logger.error(`${method} ${url} ERROR +${duration}ms [${correlationId}] - ${error.message}`);
        },
      }),
    );
  }
}
