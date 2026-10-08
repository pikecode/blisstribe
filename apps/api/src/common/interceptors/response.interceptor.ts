import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
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
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<SuccessResponse<T>> {
    if (
      this.reflector.getAllAndOverride<boolean>('skipResponseEnvelope', [
        context.getHandler(),
        context.getClass(),
      ])
    ) {
      return next.handle() as Observable<SuccessResponse<T>>
    }
    return next.handle().pipe(
      map((data) => ({
        code: 200,
        message: ErrorMessage[200] || 'success',
        data: this.convertBigIntToString(data),
        timestamp: Date.now(),
      }))
    )
  }

  private convertBigIntToString(data: any): any {
    if (data === null || data === undefined) {
      return data
    }

    if (typeof data === 'bigint') {
      return data.toString()
    }

    if (data instanceof Date) {
      return data.toISOString()
    }

    if (Array.isArray(data)) {
      return data.map(item => this.convertBigIntToString(item))
    }

    if (typeof data === 'object') {
      const result: any = {}
      for (const key in data) {
        if (data.hasOwnProperty(key)) {
          result[key] = this.convertBigIntToString(data[key])
        }
      }
      return result
    }

    return data
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
