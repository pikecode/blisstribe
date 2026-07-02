import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common'
import { Response } from 'express'
import { BusinessException } from '../interceptors/response.interceptor'
import { ErrorCode, ErrorMessage } from '@blisstribe/shared'

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name)

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()

    let code: number = ErrorCode.INTERNAL_ERROR
    let message = '系统内部错误'
    let httpStatus = HttpStatus.INTERNAL_SERVER_ERROR

    if (exception instanceof BusinessException) {
      code = exception.errorCode
      message = exception.message
      httpStatus = this.mapCodeToHttpStatus(code)
    } else if (exception instanceof HttpException) {
      httpStatus = exception.getStatus()
      const res = exception.getResponse()
      code = httpStatus === 401 ? ErrorCode.NOT_LOGIN : ErrorCode.PARAMS_INVALID
      message = typeof res === 'string' ? res : (res as { message?: string }).message || '请求异常'
    } else {
      this.logger.error('未处理异常', (exception as Error)?.stack || exception)
    }

    response.status(httpStatus).json({
      code,
      message: message || ErrorMessage[code] || '错误',
      data: null,
      timestamp: Date.now(),
    })
  }

  private mapCodeToHttpStatus(code: number): HttpStatus {
    if (code >= 500000) return HttpStatus.INTERNAL_SERVER_ERROR
    if (code >= 429000) return HttpStatus.TOO_MANY_REQUESTS
    if (code >= 404000) return HttpStatus.NOT_FOUND
    if (code >= 403000) return HttpStatus.FORBIDDEN
    if (code >= 401000) return HttpStatus.UNAUTHORIZED
    return HttpStatus.BAD_REQUEST
  }
}
