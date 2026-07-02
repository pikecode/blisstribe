import { NestFactory } from '@nestjs/core'
import { ValidationPipe, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { NestExpressApplication } from '@nestjs/platform-express'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'
import { AppModule } from './app.module'
import { HttpExceptionFilter } from './common/filters/http-exception.filter'
import { ResponseInterceptor } from './common/interceptors/response.interceptor'

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule)
  const configService = app.get(ConfigService)
  const logger = new Logger('Bootstrap')

  // 全局前缀
  app.setGlobalPrefix('api/v1')

  // 静态文件服务：上传目录
  const uploadDir = configService.get<string>('UPLOAD_DIR', './uploads')
  const absoluteUploadDir = join(process.cwd(), uploadDir)
  if (!existsSync(absoluteUploadDir)) {
    mkdirSync(absoluteUploadDir, { recursive: true })
  }
  app.useStaticAssets(absoluteUploadDir, { prefix: '/uploads/' })

  // 跨域
  app.enableCors({
    origin: configService.get<string>('CORS_ORIGIN', '*'),
    credentials: true,
  })

  // 全局管道：参数校验
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  )

  // 全局过滤器 + 拦截器：统一响应格式
  app.useGlobalFilters(new HttpExceptionFilter())
  app.useGlobalInterceptors(new ResponseInterceptor())

  const port = configService.get<number>('PORT', 3000)
  await app.listen(port)
  logger.log(`API running on http://localhost:${port}/api/v1`)
}

bootstrap()
