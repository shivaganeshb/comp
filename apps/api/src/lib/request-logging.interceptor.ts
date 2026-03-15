import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { sanitizeHeaders } from '@trycompai/utils/data-masking';

/**
 * Request logging interceptor that masks sensitive data (PII, tokens, API keys)
 * from logs for SOC2 compliance.
 *
 * Logs request method, URL, status code, and duration.
 * Sensitive headers (Authorization, Cookie, X-API-Key) are masked automatically.
 */
@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;
    const startTime = Date.now();

    // Log the incoming request with sanitized headers
    const safeHeaders = sanitizeHeaders({
      'x-api-key': request.headers['x-api-key'],
      authorization: request.headers['authorization'],
      'x-forwarded-for': request.headers['x-forwarded-for'],
      'user-agent': request.headers['user-agent'],
    });

    this.logger.log(
      `${method} ${url} - headers: ${JSON.stringify(safeHeaders)}`,
    );

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse();
          const statusCode = response.statusCode;
          const duration = Date.now() - startTime;
          this.logger.log(`${method} ${url} ${statusCode} - ${duration}ms`);
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          const statusCode = error?.status || error?.statusCode || 500;
          this.logger.warn(
            `${method} ${url} ${statusCode} - ${duration}ms - ${error?.message || 'Unknown error'}`,
          );
        },
      }),
    );
  }
}
