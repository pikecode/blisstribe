import { Injectable } from '@nestjs/common'
import { PrismaService } from '../common/prisma.service'
import { BusinessException } from '../common/interceptors/response.interceptor'
import { ErrorCode } from '@blisstribe/shared'
import type { CreateBannerDto, UpdateBannerDto } from './dto'

@Injectable()
export class BannerService {
  constructor(private readonly prisma: PrismaService) {}

  async listPublic() {
    const rows = await this.prisma.banner.findMany({
      where: { status: 1 },
      orderBy: [{ sort: 'asc' }, { createdAt: 'asc' }],
    })
    return rows.map((b) => ({
      id: Number(b.id),
      title: b.title,
      description: b.description,
      imageUrl: b.imageUrl,
      gradient: b.gradient,
      linkUrl: b.linkUrl,
    }))
  }

  async listAdmin(page: number, pageSize: number) {
    const [list, total] = await Promise.all([
      this.prisma.banner.findMany({
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [{ sort: 'asc' }, { createdAt: 'asc' }],
      }),
      this.prisma.banner.count(),
    ])
    return { list: list.map(this.toVO), total, page, pageSize }
  }

  async create(dto: CreateBannerDto) {
    const banner = await this.prisma.banner.create({
      data: {
        title: dto.title,
        description: dto.description ?? '',
        imageUrl: dto.imageUrl ?? '',
        gradient: dto.gradient ?? '',
        linkUrl: dto.linkUrl ?? '',
        sort: dto.sort ?? 0,
      },
    })
    return this.toVO(banner)
  }

  async update(id: string, dto: UpdateBannerDto) {
    const banner = await this.prisma.banner.findUnique({ where: { id: BigInt(id) } })
    if (!banner) throw new BusinessException(ErrorCode.PARAMS_INVALID, 'Banner不存在')
    const updated = await this.prisma.banner.update({
      where: { id: BigInt(id) },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl }),
        ...(dto.gradient !== undefined && { gradient: dto.gradient }),
        ...(dto.linkUrl !== undefined && { linkUrl: dto.linkUrl }),
        ...(dto.sort !== undefined && { sort: dto.sort }),
        ...(dto.status !== undefined && { status: dto.status }),
      },
    })
    return this.toVO(updated)
  }

  async remove(id: string) {
    const banner = await this.prisma.banner.findUnique({ where: { id: BigInt(id) } })
    if (!banner) throw new BusinessException(ErrorCode.PARAMS_INVALID, 'Banner不存在')
    await this.prisma.banner.delete({ where: { id: BigInt(id) } })
  }

  private toVO(b: { id: bigint; title: string; description: string; imageUrl: string; gradient: string; linkUrl: string; sort: number; status: number; createdAt: Date }) {
    return {
      id: Number(b.id),
      title: b.title,
      description: b.description,
      imageUrl: b.imageUrl,
      gradient: b.gradient,
      linkUrl: b.linkUrl,
      sort: b.sort,
      status: b.status,
      createdAt: b.createdAt.toISOString(),
    }
  }
}
