import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common'
import { AdminJwtGuard } from '../common/guards/admin-jwt.guard'
import { JwtAuthGuard } from '../common/guards/jwt.guard'
import { CurrentAdmin } from '../common/decorators/current-admin.decorator'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { OptionalJwtGuard } from '../common/guards/optional-jwt.guard'
import { ProductService } from './product.service'
import {
  CreateAssessmentTemplateDto,
  ConfirmProductLeadContactDto,
  CreateProductDto,
  CreateProductLeadDto,
  CreateProductModuleDto,
  CreateRecommendationEventDto,
  CreateRecommendationRuleDto,
  CreateTagDictionaryDto,
  FollowProductLeadDto,
  SyncAssessmentsDto,
  UpdateAssessmentTemplateDto,
  UpdateProductDto,
  UpdateProductModuleDto,
  UpdateRecommendationRuleDto,
  UpdateTagDictionaryDto,
} from './dto'

function parseTags(tags?: string) {
  return tags ? tags.split(',').map((tag) => tag.trim()).filter(Boolean) : []
}

function parseTagIds(tagIds?: string) {
  return tagIds
    ? tagIds.split(',').map((tagId) => Number(tagId)).filter((tagId) => Number.isInteger(tagId) && tagId > 0)
    : []
}

function pageParams(page = '1', pageSize = '20') {
  return {
    page: Number(page) || 1,
    pageSize: Number(pageSize) || 20,
  }
}

@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Get('recommended')
  recommended(
    @Query('moduleCode') moduleCode?: string,
    @Query('productType') productType?: string,
    @Query('tags') tags?: string,
    @Query('tagIds') tagIds?: string,
    @Query('limit') limit = '10'
  ) {
    return this.productService.recommended(null, {
      moduleCode,
      productType,
      tags: parseTags(tags),
      tagIds: parseTagIds(tagIds),
      limit: Number(limit) || 10,
    })
  }

  @Get()
  list(
    @Query('moduleCode') moduleCode?: string,
    @Query('productType') productType?: string,
    @Query('tags') tags?: string,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20'
  ) {
    return this.productService.listPublic({
      moduleCode,
      productType,
      tags: parseTags(tags),
      ...pageParams(page, pageSize),
    })
  }

  @UseGuards(JwtAuthGuard)
  @Get('my-assessments')
  myAssessments(@CurrentUser() user: { userId: string }) {
    return this.productService.listMyAssessments(BigInt(user.userId))
  }

  @UseGuards(JwtAuthGuard)
  @Post('my-assessments/sync')
  syncMyAssessments(@CurrentUser() user: { userId: string }, @Body() dto: SyncAssessmentsDto) {
    return this.productService.syncMyAssessments(BigInt(user.userId), dto)
  }

  @UseGuards(JwtAuthGuard)
  @Get('my-leads')
  myLeads(
    @CurrentUser() user: { userId: string },
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20'
  ) {
    return this.productService.listMyLeads(BigInt(user.userId), pageParams(page, pageSize))
  }

  @UseGuards(JwtAuthGuard)
  @Get('my-leads/:id')
  myLeadDetail(@CurrentUser() user: { userId: string }, @Param('id') id: string) {
    return this.productService.detailMyLead(BigInt(id), BigInt(user.userId))
  }

  @UseGuards(JwtAuthGuard)
  @Post('my-leads/:id/confirm-contact')
  confirmMyLeadContact(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Body() dto: ConfirmProductLeadContactDto
  ) {
    return this.productService.confirmMyLeadContact(BigInt(id), BigInt(user.userId), dto)
  }

  @UseGuards(OptionalJwtGuard)
  @Post('events')
  createEvent(@CurrentUser() user: { userId: string } | null, @Body() dto: CreateRecommendationEventDto) {
    return this.productService.createRecommendationEvent(user?.userId ? BigInt(user.userId) : null, dto)
  }

  @Get(':id')
  detail(@Param('id') id: string, @Query('tags') tags?: string) {
    return this.productService.detailPublic(BigInt(id), parseTags(tags))
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/leads')
  createLead(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Body() dto: CreateProductLeadDto
  ) {
    return this.productService.createLead(BigInt(id), BigInt(user.userId), dto)
  }
}

@Controller('product-modules')
export class ProductModuleController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  list() {
    return this.productService.listPublicModules()
  }

  @Get(':moduleCode/assessment-template')
  assessmentTemplate(@Param('moduleCode') moduleCode: string) {
    return this.productService.publicAssessmentTemplate(moduleCode)
  }
}

@Controller('tags')
export class TagDictionaryPublicController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  list(
    @Query('moduleId') moduleId?: string,
    @Query('status') status?: string,
    @Query('group') group?: string,
    @Query('keyword') keyword?: string
  ) {
    return this.productService.listTagsPublic({
      moduleId: moduleId ? BigInt(moduleId) : undefined,
      status: status === undefined || status === '' ? undefined : Number(status),
      group,
      keyword,
    })
  }
}

@Controller('admin/product-modules')
@UseGuards(AdminJwtGuard)
export class ProductModuleAdminController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  list() {
    return this.productService.listModulesAdmin()
  }

  @Post()
  create(@Body() dto: CreateProductModuleDto) {
    return this.productService.createModule(dto)
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProductModuleDto) {
    return this.productService.updateModule(BigInt(id), dto)
  }
}

@Controller('admin/assessment-templates')
@UseGuards(AdminJwtGuard)
export class AssessmentTemplateAdminController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  list() {
    return this.productService.listAssessmentTemplatesAdmin()
  }

  @Post()
  create(@Body() dto: CreateAssessmentTemplateDto) {
    return this.productService.createAssessmentTemplateAdmin(dto)
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAssessmentTemplateDto) {
    return this.productService.updateAssessmentTemplateAdmin(BigInt(id), dto)
  }
}

@Controller('admin/recommendation-rules')
@UseGuards(AdminJwtGuard)
export class RecommendationRuleAdminController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  list(
    @Query('moduleId') moduleId?: string,
    @Query('productId') productId?: string,
    @Query('status') status?: string
  ) {
    return this.productService.listRecommendationRulesAdmin({
      moduleId: moduleId ? BigInt(moduleId) : undefined,
      productId: productId ? BigInt(productId) : undefined,
      status: status === undefined || status === '' ? undefined : Number(status),
    })
  }

  @Post()
  create(@Body() dto: CreateRecommendationRuleDto) {
    return this.productService.createRecommendationRuleAdmin(dto)
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateRecommendationRuleDto) {
    return this.productService.updateRecommendationRuleAdmin(BigInt(id), dto)
  }
}

@Controller('admin/tags')
@UseGuards(AdminJwtGuard)
export class TagDictionaryAdminController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  list(
    @Query('moduleId') moduleId?: string,
    @Query('status') status?: string,
    @Query('group') group?: string,
    @Query('keyword') keyword?: string
  ) {
    return this.productService.listTagsAdmin({
      moduleId: moduleId ? BigInt(moduleId) : undefined,
      status: status === undefined || status === '' ? undefined : Number(status),
      group,
      keyword,
    })
  }

  @Post()
  create(@Body() dto: CreateTagDictionaryDto) {
    return this.productService.createTagAdmin(dto)
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTagDictionaryDto) {
    return this.productService.updateTagAdmin(BigInt(id), dto)
  }
}

@Controller('admin/products')
@UseGuards(AdminJwtGuard)
export class ProductAdminController {
  constructor(private readonly productService: ProductService) {}

  @Get('analytics')
  analytics(
    @Query('moduleId') moduleId?: string,
    @Query('moduleCode') moduleCode?: string,
    @Query('productType') productType?: string,
    @Query('recommendationForm') recommendationForm?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.productService.recommendationAnalyticsAdmin({
      moduleId: moduleId ? BigInt(moduleId) : undefined,
      moduleCode,
      productType,
      recommendationForm,
      startDate,
      endDate,
    })
  }

  @Get()
  list(
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
    @Query('status') status?: string,
    @Query('moduleId') moduleId?: string,
    @Query('productType') productType?: string,
    @Query('keyword') keyword?: string
  ) {
    return this.productService.listProductsAdmin({
      ...pageParams(page, pageSize),
      status: status === undefined || status === '' ? undefined : Number(status),
      moduleId: moduleId ? BigInt(moduleId) : undefined,
      productType,
      keyword,
    })
  }

  @Post()
  create(@Body() dto: CreateProductDto) {
    return this.productService.createProduct(dto)
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productService.updateProduct(BigInt(id), dto)
  }

  @Post(':id/publish')
  publish(@Param('id') id: string) {
    return this.productService.publishProduct(BigInt(id))
  }

  @Post(':id/unpublish')
  unpublish(@Param('id') id: string) {
    return this.productService.unpublishProduct(BigInt(id))
  }
}

@Controller('admin/product-leads')
@UseGuards(AdminJwtGuard)
export class ProductLeadAdminController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  list(
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
    @Query('status') status?: string,
    @Query('productId') productId?: string,
    @Query('partnerId') partnerId?: string,
    @Query('followScope') followScope?: string,
    @Query('keyword') keyword?: string
  ) {
    return this.productService.listLeadsAdmin({
      ...pageParams(page, pageSize),
      status,
      productId: productId ? BigInt(productId) : undefined,
      partnerId: partnerId ? BigInt(partnerId) : undefined,
      followScope,
      keyword,
    })
  }

  @Get('summary')
  summary() {
    return this.productService.leadSummaryAdmin()
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.productService.detailLeadAdmin(BigInt(id))
  }

  @Put(':id/follow-up')
  followUp(
    @CurrentAdmin() admin: { adminId: string },
    @Param('id') id: string,
    @Body() dto: FollowProductLeadDto
  ) {
    return this.productService.followLeadAdmin(BigInt(id), BigInt(admin.adminId), dto)
  }
}

@Controller('partner')
@UseGuards(JwtAuthGuard)
export class ProductPartnerController {
  constructor(private readonly productService: ProductService) {}

  @Get('products')
  products(
    @CurrentUser() user: { userId: string },
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20'
  ) {
    return this.productService.listPartnerProducts(BigInt(user.userId), pageParams(page, pageSize))
  }

  @Get('product-leads')
  leads(
    @CurrentUser() user: { userId: string },
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20'
  ) {
    return this.productService.listPartnerLeads(BigInt(user.userId), pageParams(page, pageSize))
  }
}
