import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Redis from 'ioredis'

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis
  private readonly logger = new Logger(RedisService.name)

  constructor(private readonly configService: ConfigService) {
    const url = this.configService.get<string>('REDIS_URL', 'redis://localhost:6379')
    this.client = new Redis(url)
  }

  getClient(): Redis {
    return this.client
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key)
  }

  async set(key: string, value: string, expireSeconds?: number): Promise<void> {
    if (expireSeconds) {
      await this.client.set(key, value, 'EX', expireSeconds)
    } else {
      await this.client.set(key, value)
    }
  }

  async del(key: string): Promise<void> {
    await this.client.del(key)
  }

  async incrWithExpire(key: string, expireSeconds: number): Promise<number> {
    const pipeline = this.client.multi()
    pipeline.incr(key)
    pipeline.expire(key, expireSeconds)
    const results = await pipeline.exec()
    return Number(results?.[0]?.[1] ?? 0)
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit()
  }
}
