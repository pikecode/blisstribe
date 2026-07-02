import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common'
import { map, Observable } from 'rxjs'
import { ErrorCode, ErrorMessage } from '@blisstribe/shared'

export interface SuccessResponse<T> {
  code: number
  message: string
  data: T
  timestamp: number
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, SuccessResponse<T>> {
  intercept(_context: ExecutionContext, next: CallHandler<T>): Observable<SuccessResponse<T>> {
    return next.handle().pipe(
      map((data) => ({
        code: 200,
        message: ErrorMessage[200] || 'success',
        data,
        timestamp: Date.now(),
      }))
    )
  }
}

// 业务异常：携带错误码
export class BusinessException extends Error {
  constructor(
    public readonly errorCode: number,
    message?: string
  ) {
    super(message || ErrorMessage[errorCode] || '业务异常')
  }
}

export { ErrorCode }
