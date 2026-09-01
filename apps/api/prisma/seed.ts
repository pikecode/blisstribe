import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'
import { createHmac } from 'crypto'
import { copyFileSync, existsSync, mkdirSync } from 'fs'
import { isAbsolute, join } from 'path'

const prisma = new PrismaClient()
const publicBaseUrl = (process.env.PUBLIC_BASE_URL || 'http://localhost:4000').replace(/\/$/, '')
const uploadDir = process.env.UPLOAD_DIR || './uploads'
const absoluteUploadDir = isAbsolute(uploadDir) ? uploadDir : join(process.cwd(), uploadDir)
const seedCoverDir = join(__dirname, 'assets', 'covers')

function uploadedCoverUrl(filename: string) {
  if (!existsSync(absoluteUploadDir)) mkdirSync(absoluteUploadDir, { recursive: true })
  copyFileSync(join(seedCoverDir, filename), join(absoluteUploadDir, filename))
  return `${publicBaseUrl}/uploads/${filename}`
}

async function main(): Promise<void> {
  // 1. 创建初始管理员
  const passwordHash = await bcrypt.hash('admin123', 10)
  const admin = await prisma.admin.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      passwordHash,
      nickname: '超级管理员',
      status: 1,
    },
  })
  console.log(`管理员已就绪: ${admin.username} / admin123`)

  // 2. 创建初始协议版本
  for (const type of ['user', 'privacy'] as const) {
    await prisma.agreement.upsert({
      where: { type_version: { type, version: '1.0' } },
      update: {},
      create: {
        type,
        version: '1.0',
        title: type === 'user' ? '用户服务协议' : '隐私保护政策',
        content: `${type === 'user' ? '用户服务协议' : '隐私保护政策'}内容（待补充）`,
        isCurrent: true,
        effectiveAt: new Date(),
      },
    })
  }
  console.log('协议初版已就绪')

  // 3. 创建角色与权限（RBAC）
  const superAdminRole = await prisma.role.upsert({
    where: { code: 'super_admin' },
    update: {},
    create: { code: 'super_admin', name: '超级管理员', status: 1 },
  })
  await prisma.adminRole.upsert({
    where: { adminId_roleId: { adminId: admin.id, roleId: superAdminRole.id } },
    update: {},
    create: { adminId: admin.id, roleId: superAdminRole.id },
  })

  const permissions = [
    { code: 'user:read', name: '查看用户' },
    { code: 'user:write', name: '编辑用户' },
    { code: 'agreement:publish', name: '发布协议' },
    { code: 'stats:read', name: '查看统计' },
  ]
  for (const p of permissions) {
    const perm = await prisma.permission.upsert({
      where: { code: p.code },
      update: {},
      create: p,
    })
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: { roleId: superAdminRole.id, permissionId: perm.id },
      },
      update: {},
      create: { roleId: superAdminRole.id, permissionId: perm.id },
    })
  }
  console.log('RBAC 初始化完成')

  // 4. 创建产品推荐 MVP 示例数据
  const healthModule = await prisma.productModule.upsert({
    where: { code: 'health' },
    update: {
      name: '健康',
      description: '健康类产品和服务',
      icon: '健康',
      coverUrl: '/static/images/covers/module-health.svg',
      showOnHome: true,
      assessmentEnabled: true,
      assessmentType: 'health',
      status: 1,
    },
    create: {
      code: 'health',
      name: '健康',
      description: '健康类产品和服务',
      icon: '健康',
      coverUrl: '/static/images/covers/module-health.svg',
      showOnHome: true,
      assessmentEnabled: true,
      assessmentType: 'health',
      sortOrder: 0,
      status: 1,
    },
  })

  const beautyModule = await prisma.productModule.upsert({
    where: { code: 'beauty' },
    update: {
      name: '美学',
      description: '皮肤管理、形象提升和轻医美咨询类服务',
      icon: '美学',
      coverUrl: '/static/images/covers/module-beauty.svg',
      showOnHome: true,
      assessmentEnabled: true,
      assessmentType: 'beauty',
      status: 1,
      sortOrder: 10,
    },
    create: {
      code: 'beauty',
      name: '美学',
      description: '皮肤管理、形象提升和轻医美咨询类服务',
      icon: '美学',
      coverUrl: '/static/images/covers/module-beauty.svg',
      showOnHome: true,
      assessmentEnabled: true,
      assessmentType: 'beauty',
      sortOrder: 10,
      status: 1,
    },
  })

  const familyModule = await prisma.productModule.upsert({
    where: { code: 'family' },
    update: {
      name: '家庭',
      description: '家庭健康、亲子陪伴和长辈关怀类服务',
      icon: '家庭',
      coverUrl: '/static/images/covers/module-family.svg',
      showOnHome: true,
      assessmentEnabled: true,
      assessmentType: 'family',
      status: 1,
      sortOrder: 20,
    },
    create: {
      code: 'family',
      name: '家庭',
      description: '家庭健康、亲子陪伴和长辈关怀类服务',
      icon: '家庭',
      coverUrl: '/static/images/covers/module-family.svg',
      showOnHome: true,
      assessmentEnabled: true,
      assessmentType: 'family',
      sortOrder: 20,
      status: 1,
    },
  })

  const emotionModule = await prisma.productModule.upsert({
    where: { code: 'emotion' },
    update: {
      name: '情绪',
      description: '压力管理、关系沟通和心理支持类服务',
      icon: '情绪',
      coverUrl: '/static/images/covers/module-emotion.svg',
      showOnHome: true,
      assessmentEnabled: true,
      assessmentType: 'emotion',
      status: 1,
      sortOrder: 30,
    },
    create: {
      code: 'emotion',
      name: '情绪',
      description: '压力管理、关系沟通和心理支持类服务',
      icon: '情绪',
      coverUrl: '/static/images/covers/module-emotion.svg',
      showOnHome: true,
      assessmentEnabled: true,
      assessmentType: 'emotion',
      sortOrder: 30,
      status: 1,
    },
  })

  async function upsertTag(item: {
    code: string
    name: string
    group: string
    moduleId?: bigint
    description?: string
    sortOrder: number
  }) {
    await prisma.tagDictionary.upsert({
      where: { code: item.code },
      update: {
        name: item.name,
        group: item.group,
        moduleId: item.moduleId ?? null,
        description: item.description ?? '',
        sortOrder: item.sortOrder,
        status: 1,
      },
      create: {
        code: item.code,
        name: item.name,
        group: item.group,
        moduleId: item.moduleId ?? null,
        description: item.description ?? '',
        sortOrder: item.sortOrder,
        status: 1,
      },
    })
  }

  const seedTags = [
    { code: 'intent_browse', name: '先了解', group: '意向强度', sortOrder: 0 },
    { code: 'intent_focus', name: '重点改善', group: '意向强度', sortOrder: 1 },
    { code: 'intent_urgent', name: '尽快改善', group: '意向强度', sortOrder: 2 },
    { code: 'intent_contact', name: '愿意联系', group: '意向强度', sortOrder: 3 },
    { code: 'intent_view_product', name: '先看产品', group: '意向强度', sortOrder: 4 },
    { code: 'intent_no_contact', name: '暂不联系', group: '意向强度', sortOrder: 5 },
    { code: 'service_online', name: '线上咨询', group: '服务方式', sortOrder: 10 },
    { code: 'service_offline', name: '到店体验', group: '服务方式', sortOrder: 11 },
    { code: 'service_community', name: '社群陪伴', group: '服务方式', sortOrder: 12 },
    { code: 'service_free', name: '免费评估', group: '服务方式', sortOrder: 13 },
    { code: 'service_trial', name: '低价体验', group: '服务方式', sortOrder: 14 },
    { code: 'service_standard', name: '标准服务', group: '服务方式', sortOrder: 15 },
    { code: 'health_wellness', name: '健康养生', group: '健康', moduleId: healthModule.id, sortOrder: 100 },
    { code: 'health_sleep', name: '睡眠改善', group: '健康', moduleId: healthModule.id, sortOrder: 101 },
    { code: 'health_weight', name: '体重管理', group: '健康', moduleId: healthModule.id, sortOrder: 102 },
    { code: 'health_exercise', name: '运动健身', group: '健康', moduleId: healthModule.id, sortOrder: 103 },
    { code: 'health_family', name: '家庭健康', group: '健康', moduleId: healthModule.id, sortOrder: 104 },
    { code: 'health_nutrition', name: '营养咨询', group: '健康', moduleId: healthModule.id, sortOrder: 105 },
    { code: 'life_style', name: '生活方式', group: '生活方式', sortOrder: 200 },
    { code: 'career_growth', name: '职场进阶', group: '生活方式', sortOrder: 201 },
    { code: 'food_explore', name: '美食探店', group: '生活方式', sortOrder: 202 },
    { code: 'beauty_skin', name: '皮肤管理', group: '美学', moduleId: beautyModule.id, sortOrder: 300 },
    { code: 'beauty_image', name: '形象提升', group: '美学', moduleId: beautyModule.id, sortOrder: 301 },
    { code: 'family_elder', name: '长辈关怀', group: '家庭', moduleId: familyModule.id, sortOrder: 400 },
    { code: 'family_parenting', name: '亲子育儿', group: '家庭', moduleId: familyModule.id, sortOrder: 401 },
    { code: 'emotion_stress', name: '压力管理', group: '情绪', moduleId: emotionModule.id, sortOrder: 500 },
    { code: 'emotion_support', name: '情绪支持', group: '情绪', moduleId: emotionModule.id, sortOrder: 501 },
    { code: 'emotion_relation', name: '关系沟通', group: '情绪', moduleId: emotionModule.id, sortOrder: 502 },
  ]
  for (const tag of seedTags) {
    await upsertTag(tag)
  }

  async function tagIdsByNames(names: string[], moduleId?: bigint) {
    const rows = await prisma.tagDictionary.findMany({
      where: {
        deletedAt: null,
        name: { in: names },
        OR: moduleId ? [{ moduleId }, { moduleId: null }] : undefined,
      },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      select: { id: true },
    })
    return Array.from(new Map(rows.map((item) => [String(item.id), item.id])).values())
  }

  type SeedAssessmentTemplate = {
    moduleId: bigint
    title: string
    subtitle: string
    sortOrder: number
    questions: Array<{
      key: string
      title: string
      options: Array<{ label: string; value: string; tags: string[] }>
    }>
  }

  async function upsertAssessmentTemplate(item: SeedAssessmentTemplate) {
    const existing = await prisma.assessmentTemplate.findFirst({
      where: { moduleId: item.moduleId, deletedAt: null },
      select: { id: true },
    })
    const data = {
      moduleId: item.moduleId,
      title: item.title,
      subtitle: item.subtitle,
      version: 1,
      status: 1,
      sortOrder: item.sortOrder,
    }
    const template = existing
      ? await prisma.assessmentTemplate.update({ where: { id: existing.id }, data })
      : await prisma.assessmentTemplate.create({ data })
    await prisma.assessmentQuestion.deleteMany({ where: { templateId: template.id } })
    for (const [questionIndex, question] of item.questions.entries()) {
      await prisma.assessmentQuestion.create({
        data: {
          templateId: template.id,
          key: question.key,
          title: question.title,
          type: 'single',
          sortOrder: questionIndex,
          options: {
            create: await Promise.all(question.options.map(async (option, optionIndex) => ({
              label: option.label,
              value: option.value,
              tags: option.tags,
              tagIds: await tagIdsByNames(option.tags, item.moduleId),
              tagWeights: Object.fromEntries((await tagIdsByNames(option.tags, item.moduleId)).map((id) => [String(id), 1])),
              sortOrder: optionIndex,
            }))),
          },
        },
      })
    }
  }

  const assessmentTemplates: SeedAssessmentTemplate[] = [
    {
      moduleId: healthModule.id,
      title: '健康需求评估',
      subtitle: '回答几个问题，先缩小推荐范围',
      sortOrder: 0,
      questions: [
        {
          key: 'focus',
          title: '你现在最想改善什么？',
          options: [
            { label: '睡眠质量', value: 'sleep', tags: ['睡眠改善', '健康养生'] },
            { label: '体重管理', value: 'weight', tags: ['体重管理', '运动健身'] },
            { label: '运动习惯', value: 'exercise', tags: ['运动健身', '生活方式'] },
            { label: '家庭健康', value: 'family', tags: ['家庭健康', '亲子育儿'] },
            { label: '饮食营养', value: 'nutrition', tags: ['营养咨询', '健康养生'] },
          ],
        },
        {
          key: 'level',
          title: '这个问题现在到什么程度？',
          options: [
            { label: '轻度关注', value: 'light', tags: ['先了解'] },
            { label: '已经影响生活', value: 'medium', tags: ['重点改善'] },
            { label: '希望尽快改善', value: 'urgent', tags: ['尽快改善'] },
          ],
        },
        {
          key: 'service',
          title: '你更偏好哪种服务方式？',
          options: [
            { label: '线上咨询', value: 'online', tags: ['线上咨询'] },
            { label: '到店体验', value: 'offline', tags: ['到店体验'] },
            { label: '社群陪伴', value: 'community', tags: ['社群陪伴'] },
            { label: '暂不确定', value: 'unknown', tags: ['先了解'] },
          ],
        },
      ],
    },
    {
      moduleId: beautyModule.id,
      title: '美学需求评估',
      subtitle: '先了解肤质、场景和体验偏好',
      sortOrder: 10,
      questions: [
        {
          key: 'focus',
          title: '你最想改善哪类问题？',
          options: [
            { label: '皮肤状态', value: 'skin', tags: ['皮肤管理', '免费评估'] },
            { label: '痘痘敏感', value: 'sensitive', tags: ['皮肤管理', '重点改善'] },
            { label: '形象风格', value: 'style', tags: ['形象提升', '先了解'] },
            { label: '重要场合', value: 'occasion', tags: ['形象提升', '职场进阶'] },
          ],
        },
        {
          key: 'service',
          title: '你更愿意选择哪种方式？',
          options: [
            { label: '线上咨询', value: 'online', tags: ['线上咨询'] },
            { label: '到店体验', value: 'offline', tags: ['到店体验'] },
            { label: '先看方案', value: 'browse', tags: ['先了解'] },
          ],
        },
      ],
    },
    {
      moduleId: familyModule.id,
      title: '家庭需求评估',
      subtitle: '先判断服务对象和家庭关注点',
      sortOrder: 20,
      questions: [
        {
          key: 'target',
          title: '你主要想为谁了解服务？',
          options: [
            { label: '父母长辈', value: 'elder', tags: ['长辈关怀', '家庭健康'] },
            { label: '孩子', value: 'child', tags: ['亲子育儿', '家庭健康'] },
            { label: '伴侣家庭', value: 'partner', tags: ['家庭健康', '关系沟通'] },
          ],
        },
        {
          key: 'focus',
          title: '当前更关注什么？',
          options: [
            { label: '健康管理', value: 'health', tags: ['家庭健康', '重点改善'] },
            { label: '陪伴沟通', value: 'company', tags: ['亲子育儿', '社群陪伴'] },
            { label: '长期跟进', value: 'follow', tags: ['长辈关怀', '社群陪伴'] },
          ],
        },
      ],
    },
    {
      moduleId: emotionModule.id,
      title: '情绪需求评估',
      subtitle: '仅用于需求梳理，不做诊断结论',
      sortOrder: 30,
      questions: [
        {
          key: 'focus',
          title: '你最近主要被什么困扰？',
          options: [
            { label: '压力疲惫', value: 'stress', tags: ['压力管理', '情绪支持'] },
            { label: '关系沟通', value: 'relation', tags: ['关系沟通', '情绪支持'] },
            { label: '睡眠受影响', value: 'sleep', tags: ['压力管理', '睡眠改善'] },
          ],
        },
        {
          key: 'support',
          title: '你希望获得哪类支持？',
          options: [
            { label: '免费初聊', value: 'free', tags: ['先了解'] },
            { label: '方法练习', value: 'practice', tags: ['关系沟通', '社群陪伴'] },
            { label: '尽快有人沟通', value: 'contact', tags: ['尽快改善', '线上咨询'] },
          ],
        },
      ],
    },
  ]

  for (const item of assessmentTemplates) {
    await upsertAssessmentTemplate(item)
  }

  type SeedProduct = {
    title: string
    productType?: 'service' | 'physical' | 'package'
    subtitle: string
    priceText: string
    coverUrl?: string
    summary: string
    detail: string
    targetUserText: string
    painPointText: string
    serviceProcess: string
    serviceMode?: 'online' | 'offline' | 'mixed' | ''
    serviceDuration?: string
    appointmentRequired?: boolean
    specText?: string
    deliveryText?: string
    afterSaleText?: string
    stockStatus?: 'available' | 'limited' | 'sold_out'
    tags: string[]
    priority: number
    sortOrder: number
  }

  async function upsertProduct(moduleId: bigint, item: SeedProduct) {
    const existing = await prisma.product.findFirst({
      where: { moduleId, title: item.title },
      select: { id: true },
    })
    const data = {
      moduleId,
      title: item.title,
      productType: item.productType ?? 'service',
      subtitle: item.subtitle,
      coverUrl: item.coverUrl ?? '',
      priceText: item.priceText,
      summary: item.summary,
      detail: item.detail,
      targetUserText: item.targetUserText,
      painPointText: item.painPointText,
      serviceProcess: item.serviceProcess,
      serviceMode: item.serviceMode ?? '',
      serviceDuration: item.serviceDuration ?? '',
      appointmentRequired: item.appointmentRequired ?? false,
      specText: item.specText ?? '',
      deliveryText: item.deliveryText ?? '',
      afterSaleText: item.afterSaleText ?? '',
      stockStatus: item.stockStatus ?? 'available',
      tags: item.tags,
      tagIds: await tagIdsByNames(item.tags, moduleId),
      primaryTagIds: await tagIdsByNames(item.tags.slice(0, 2), moduleId),
      secondaryTagIds: await tagIdsByNames(item.tags.slice(2), moduleId),
      excludeTagIds: [],
      priority: item.priority,
      sortOrder: item.sortOrder,
      status: 1,
      publishedAt: new Date(),
    }
    if (existing) await prisma.product.update({ where: { id: existing.id }, data })
    else await prisma.product.create({ data })
  }

  const sampleProducts: SeedProduct[] = [
    {
      title: '健康生活方式评估',
      subtitle: '根据你的生活习惯和健康关注点做初步匹配',
      priceText: '免费评估',
      coverUrl: uploadedCoverUrl('product-consult.jpg'),
      summary: '适合想改善睡眠、体重管理、运动习惯的用户，提交需求后由平台或服务伙伴跟进。',
      detail: '这是健康模块的首个 MVP 示例产品，用于验证产品展示、标签匹配和线索提交闭环。',
      targetUserText: '关注健康养生、运动健身、生活方式改善的人群。',
      painPointText: '不知道从哪里开始改善健康状态，面对很多服务难以选择。',
      serviceProcess: '填写需求标签 - 平台记录线索 - 运营人员或 B 端伙伴联系 - 推荐合适服务。',
      serviceMode: 'online',
      serviceDuration: '1 次基础评估，后续按需跟进',
      tags: ['健康养生', '运动健身', '生活方式'],
      priority: 20,
      sortOrder: 0,
    },
    {
      title: '睡眠质量改善计划',
      subtitle: '面向长期熬夜、浅睡和作息不规律人群',
      priceText: '299元起',
      coverUrl: uploadedCoverUrl('product-sleep.jpg'),
      summary: '通过睡眠习惯评估、作息建议和轻量跟踪，帮助用户建立更稳定的睡眠节奏。',
      detail: '该产品适合用来测试“睡眠改善”“健康养生”“职场进阶”等标签匹配。后续可扩展为问卷评估、服务包和专家咨询。',
      targetUserText: '睡眠浅、入睡慢、经常熬夜、白天精力不足的人群。',
      painPointText: '用户知道睡眠重要，但难以找到适合自己的调整路径。',
      serviceProcess: '填写睡眠状态 - 输出初步建议 - 匹配服务顾问 - 跟进 7 天改善反馈。',
      serviceMode: 'online',
      serviceDuration: '7 天轻跟进',
      tags: ['睡眠改善', '健康养生', '职场进阶'],
      priority: 35,
      sortOrder: 1,
    },
    {
      title: '轻体管理体验营',
      productType: 'package',
      subtitle: '饮食、运动、习惯三线结合',
      priceText: '399元起',
      coverUrl: uploadedCoverUrl('product-weight.jpg'),
      summary: '适合希望控制体重但不想极端节食的用户，强调可持续的生活方式调整。',
      detail: '该产品用于验证“体重管理”“运动健身”“美食探店”等标签对推荐排序的影响。',
      targetUserText: '希望减脂塑形、调整饮食结构、建立运动习惯的人群。',
      painPointText: '选择太多，执行太难，容易短期冲刺后反弹。',
      serviceProcess: '记录目标 - 建立饮食运动计划 - 每周复盘 - 根据反馈调整方案。',
      serviceMode: 'mixed',
      serviceDuration: '14 天体验方案',
      appointmentRequired: true,
      specText: '包含饮食记录模板、轻运动清单和营养补充建议。',
      deliveryText: '实物或资料由顾问确认后安排发放。',
      afterSaleText: '体验期内可根据反馈调整方案内容。',
      tags: ['体重管理', '运动健身', '美食探店'],
      priority: 30,
      sortOrder: 2,
    },
    {
      title: '家庭健康基础包',
      productType: 'package',
      subtitle: '为家庭成员做基础健康关注点梳理',
      priceText: '到店咨询',
      coverUrl: uploadedCoverUrl('product-family.jpg'),
      summary: '围绕父母、伴侣、孩子的日常健康需求，提供基础建议和服务匹配。',
      detail: '该产品用于验证“家庭健康”“亲子育儿”“健康养生”等家庭场景推荐。',
      targetUserText: '关注父母健康、儿童成长、家庭日常健康管理的人群。',
      painPointText: '家庭成员需求不同，用户不知道该优先关注哪些服务。',
      serviceProcess: '填写家庭成员情况 - 梳理健康关注点 - 推荐服务组合 - 后续跟进。',
      serviceMode: 'mixed',
      serviceDuration: '1 次家庭需求梳理',
      appointmentRequired: true,
      specText: '包含家庭健康关注清单和基础物料建议。',
      deliveryText: '根据家庭成员情况确认是否需要配送。',
      afterSaleText: '方案确认后支持一次跟进调整。',
      tags: ['家庭健康', '亲子育儿', '健康养生'],
      priority: 25,
      sortOrder: 3,
    },
    {
      title: '营养咨询入门课',
      productType: 'physical',
      subtitle: '从日常饮食开始优化身体状态',
      priceText: '99元起',
      coverUrl: uploadedCoverUrl('product-consult.jpg'),
      summary: '面向想调整饮食结构、改善精神状态和基础代谢的人群，可先咨询适合自己的营养产品。',
      detail: '该产品用于测试“健康养生”“美食探店”“生活方式”等实物产品推荐。',
      targetUserText: '经常外食、饮食不规律、想学习基础营养搭配的人群。',
      painPointText: '用户容易被碎片化健康信息影响，缺少可执行的饮食建议。',
      serviceProcess: '',
      specText: '基础营养补充建议包，具体规格由顾问根据需求确认。',
      deliveryText: '咨询后确认收货信息和配送方式。',
      afterSaleText: '未确认发货前可调整产品建议。',
      tags: ['健康养生', '美食探店', '生活方式'],
      priority: 18,
      sortOrder: 4,
    },
  ]

  for (const item of sampleProducts) {
    await upsertProduct(healthModule.id, item)
  }

  const richerProducts: Array<{ moduleId: bigint; items: SeedProduct[] }> = [
    {
      moduleId: healthModule.id,
      items: [
        {
          title: '职场压力恢复方案',
          productType: 'package',
          subtitle: '面向高压工作和长期疲惫人群',
          priceText: '199元体验',
          coverUrl: uploadedCoverUrl('product-emotion.jpg'),
          summary: '结合压力自评、作息建议和轻量运动计划，帮助用户先恢复精力和节奏。',
          detail: '适合用来观察“职场进阶”“重点改善”“生活方式”等标签对健康产品排序的影响。',
          targetUserText: '工作节奏快、睡眠差、容易疲惫、希望恢复精力的人群。',
          painPointText: '压力来源复杂，用户容易把健康问题拖成长期低效状态。',
          serviceProcess: '压力自评 - 顾问沟通 - 制定 7 天恢复计划 - 跟进反馈。',
          serviceMode: 'online',
          serviceDuration: '7 天恢复方案',
          specText: '包含压力记录表、作息建议清单和轻运动执行卡。',
          deliveryText: '资料包由顾问确认后线上发送。',
          afterSaleText: '体验期内支持一次方案调整。',
          tags: ['职场进阶', '重点改善', '生活方式', '线上咨询'],
          priority: 32,
          sortOrder: 5,
        },
        {
          title: '到店体态评估体验',
          subtitle: '肩颈、久坐、运动姿态基础评估',
          priceText: '到店99元',
          coverUrl: uploadedCoverUrl('product-weight.jpg'),
          summary: '适合久坐、肩颈不适和运动前想了解身体状态的用户。',
          detail: '该产品用于验证“到店体验”“运动健身”“尽快改善”等标签组合。',
          targetUserText: '久坐办公、肩颈不适、准备开始运动但担心动作不规范的人群。',
          painPointText: '用户想开始运动，但不知道身体限制和适合自己的切入点。',
          serviceProcess: '预约到店 - 体态评估 - 动作建议 - 后续训练或康复服务推荐。',
          serviceMode: 'offline',
          serviceDuration: '1 次到店评估',
          appointmentRequired: true,
          tags: ['到店体验', '运动健身', '尽快改善', '生活方式'],
          priority: 28,
          sortOrder: 6,
        },
        {
          title: '日常营养补充咨询包',
          productType: 'physical',
          subtitle: '围绕外食、熬夜和运动人群的基础补充建议',
          priceText: '129元起',
          coverUrl: uploadedCoverUrl('product-consult.jpg'),
          summary: '适合想先了解营养补充方向的用户，咨询后再确认具体产品建议。',
          detail: '用于验收健康模块下实物产品的展示、筛选和咨询购买入口。',
          targetUserText: '经常外食、熬夜、运动后恢复慢或希望改善日常状态的人群。',
          painPointText: '用户面对营养产品选择较多，难以判断自己是否适合。',
          serviceProcess: '',
          specText: '基础营养补充建议包，具体规格按用户需求确认。',
          deliveryText: '提交咨询后由顾问确认产品和配送方式。',
          afterSaleText: '未确认配送前可调整建议方案。',
          stockStatus: 'available',
          tags: ['健康养生', '生活方式', '营养咨询'],
          priority: 22,
          sortOrder: 7,
        },
      ],
    },
    {
      moduleId: beautyModule.id,
      items: [
        {
          title: '皮肤状态基础评估',
          subtitle: '先判断肤质、敏感和日常护理问题',
          priceText: '免费咨询',
          coverUrl: uploadedCoverUrl('product-beauty.jpg'),
          summary: '面向想改善皮肤状态但不知道从哪里开始的用户，适合作为美学模块首个咨询入口。',
          detail: '第一步只采集用户诉求和基础状态，后续可扩展为皮肤问卷、门店检测和方案推荐。',
          targetUserText: '关注皮肤状态、痘痘、敏感、暗沉和日常护肤的人群。',
          painPointText: '用户容易被大量产品和项目影响，缺少适合自己的基础判断。',
          serviceProcess: '提交皮肤关注点 - 顾问初筛 - 推荐护理路径 - 预约体验。',
          serviceMode: 'online',
          serviceDuration: '1 次基础沟通',
          tags: ['皮肤管理', '形象提升', '免费评估', '线上咨询'],
          priority: 30,
          sortOrder: 0,
        },
        {
          title: '形象提升轻咨询',
          subtitle: '妆发、穿搭和场景形象建议',
          priceText: '199元起',
          coverUrl: uploadedCoverUrl('product-beauty.jpg'),
          summary: '帮助用户围绕职场、约会、社交等场景做轻量形象提升。',
          detail: '适合测试“职场进阶”“形象提升”“先了解”等标签。',
          targetUserText: '希望提升外在表达、准备重要场合或想改变风格的人群。',
          painPointText: '用户知道想改变，但不知道适合自己的风格和投入优先级。',
          serviceProcess: '上传诉求 - 顾问沟通 - 给出风格建议 - 推荐后续服务。',
          tags: ['形象提升', '职场进阶', '先了解', '线上咨询'],
          priority: 24,
          sortOrder: 1,
        },
        {
          title: '到店焕肤体验',
          subtitle: '适合初次体验皮肤管理服务',
          priceText: '299元体验',
          coverUrl: uploadedCoverUrl('product-beauty.jpg'),
          summary: '适合对到店护理感兴趣，希望先低成本体验服务流程的用户。',
          detail: '用于验证“到店体验”“低价体验”“皮肤管理”等标签。',
          targetUserText: '想体验皮肤管理、关注暗沉和基础清洁护理的人群。',
          painPointText: '用户担心项目复杂和价格不透明，需要一个低门槛体验入口。',
          serviceProcess: '选择门店 - 到店评估 - 完成体验 - 记录反馈。',
          serviceMode: 'offline',
          serviceDuration: '1 次到店体验',
          appointmentRequired: true,
          tags: ['皮肤管理', '到店体验', '低价体验'],
          priority: 26,
          sortOrder: 2,
        },
        {
          title: '敏感肌基础护理套装',
          productType: 'physical',
          subtitle: '适合想先从日常护理入手的用户',
          priceText: '189元起',
          coverUrl: uploadedCoverUrl('product-beauty.jpg'),
          summary: '围绕清洁、保湿和屏障修护做基础护理建议，先咨询再确认适用产品。',
          detail: '用于验收美学模块下实物产品在后台维护、小程序展示和咨询购买入口的效果。',
          targetUserText: '皮肤易敏、泛红、换季不稳定、想降低护理试错成本的人群。',
          painPointText: '用户容易被大量护肤产品影响，缺少适合自己肤况的基础判断。',
          serviceProcess: '',
          specText: '基础护理套装，包含清洁、保湿和修护建议，实际规格由顾问确认。',
          deliveryText: '顾问确认适用性后安排配送。',
          afterSaleText: '未拆封产品可沟通售后处理。',
          stockStatus: 'limited',
          tags: ['皮肤管理', '形象提升', '先了解'],
          priority: 25,
          sortOrder: 3,
        },
        {
          title: '焕肤体验组合方案',
          productType: 'package',
          subtitle: '到店体验 + 居家护理建议',
          priceText: '499元起',
          coverUrl: uploadedCoverUrl('product-beauty.jpg'),
          summary: '适合想先体验服务，同时获得后续居家护理建议的用户。',
          detail: '用于验收组合方案同时展示服务信息和实物信息。',
          targetUserText: '关注暗沉、肤质粗糙，且希望体验到店服务的人群。',
          painPointText: '单买产品或单次服务都难以形成持续改善路径。',
          serviceProcess: '到店评估 - 完成基础护理 - 顾问给出居家护理建议 - 7 天反馈。',
          serviceMode: 'mixed',
          serviceDuration: '1 次到店 + 7 天居家建议',
          appointmentRequired: true,
          specText: '包含到店护理体验和居家护理建议清单。',
          deliveryText: '如需护理产品，由顾问确认后安排配送。',
          afterSaleText: '体验后可根据肤况调整居家建议。',
          stockStatus: 'available',
          tags: ['皮肤管理', '到店体验', '低价体验'],
          priority: 29,
          sortOrder: 4,
        },
      ],
    },
    {
      moduleId: familyModule.id,
      items: [
        {
          title: '长辈健康关怀计划',
          productType: 'package',
          subtitle: '给父母做一次基础健康关注点梳理',
          priceText: '顾问定制',
          coverUrl: uploadedCoverUrl('product-family.jpg'),
          summary: '围绕长辈饮食、睡眠、运动和基础慢病关注点，帮助家庭先建立健康档案。',
          detail: '用于验证家庭类服务中“家庭健康”“长辈关怀”“重点改善”等标签。',
          targetUserText: '关注父母健康，但不知道从哪里开始安排服务的子女。',
          painPointText: '长辈健康需求分散，家庭成员难以长期跟进。',
          serviceProcess: '填写家庭情况 - 顾问沟通 - 建立关注清单 - 推荐服务组合。',
          serviceMode: 'mixed',
          serviceDuration: '1 次沟通 + 1 份家庭清单',
          appointmentRequired: true,
          specText: '包含家庭健康关注清单和基础物料建议。',
          deliveryText: '根据家庭成员情况确认是否需要配送。',
          afterSaleText: '方案确认后支持一次跟进调整。',
          tags: ['家庭健康', '长辈关怀', '重点改善', '线上咨询'],
          priority: 31,
          sortOrder: 0,
        },
        {
          title: '亲子成长陪伴营',
          subtitle: '亲子沟通、习惯培养和家庭陪伴',
          priceText: '399元起',
          coverUrl: uploadedCoverUrl('product-family.jpg'),
          summary: '适合想改善亲子沟通和孩子习惯培养的家庭。',
          detail: '用于观察“亲子育儿”“家庭健康”“社群陪伴”等标签。',
          targetUserText: '关注孩子成长、亲子沟通和家庭陪伴质量的家长。',
          painPointText: '家长知道需要陪伴，但很难形成稳定方法和外部支持。',
          serviceProcess: '填写亲子状态 - 匹配陪伴主题 - 进入社群 - 每周反馈。',
          serviceMode: 'online',
          serviceDuration: '14 天陪伴体验',
          tags: ['亲子育儿', '家庭健康', '社群陪伴'],
          priority: 27,
          sortOrder: 1,
        },
        {
          title: '长辈日常关怀物料包',
          productType: 'physical',
          subtitle: '围绕长辈日常记录和家庭协作的基础物料',
          priceText: '99元起',
          coverUrl: uploadedCoverUrl('product-family.jpg'),
          summary: '帮助家庭成员记录长辈饮食、睡眠、运动和用药提醒，先建立可跟进的信息基础。',
          detail: '用于验收家庭模块下实物产品的咨询购买和详情展示。',
          targetUserText: '想持续关注父母日常状态，但缺少记录工具和协作方式的家庭。',
          painPointText: '家庭成员之间信息分散，长辈状态变化难以及时复盘。',
          serviceProcess: '',
          specText: '包含日常记录卡、家庭关注清单和沟通模板。',
          deliveryText: '提交咨询后确认配送地址。',
          afterSaleText: '物料未寄出前可调整收件信息。',
          stockStatus: 'available',
          tags: ['家庭健康', '长辈关怀', '生活方式'],
          priority: 24,
          sortOrder: 2,
        },
        {
          title: '亲子习惯建立组合包',
          productType: 'package',
          subtitle: '陪伴服务 + 家庭执行工具',
          priceText: '599元起',
          coverUrl: uploadedCoverUrl('product-family.jpg'),
          summary: '把亲子沟通建议和家庭执行工具结合，帮助家长形成更稳定的陪伴节奏。',
          detail: '用于验收家庭模块组合方案在推荐和详情页的展示。',
          targetUserText: '希望改善亲子沟通、培养孩子日常习惯的家庭。',
          painPointText: '家长知道要陪伴，但缺少持续执行的结构和反馈。',
          serviceProcess: '亲子状态梳理 - 确定家庭目标 - 发放执行工具 - 每周反馈。',
          serviceMode: 'online',
          serviceDuration: '21 天陪伴方案',
          appointmentRequired: true,
          specText: '包含习惯打卡表、家庭沟通卡和陪伴任务清单。',
          deliveryText: '工具包按确认地址配送。',
          afterSaleText: '方案期内支持一次目标调整。',
          stockStatus: 'available',
          tags: ['亲子育儿', '家庭健康', '社群陪伴'],
          priority: 30,
          sortOrder: 3,
        },
      ],
    },
    {
      moduleId: emotionModule.id,
      items: [
        {
          title: '压力情绪梳理咨询',
          subtitle: '先把压力来源和情绪状态说清楚',
          priceText: '免费初聊',
          coverUrl: uploadedCoverUrl('product-emotion.jpg'),
          summary: '适合近期压力大、情绪波动明显但还不确定是否需要长期服务的用户。',
          detail: '当前作为情绪模块 MVP 咨询入口，后续可扩展为量表评估和咨询师匹配。',
          targetUserText: '高压、焦虑、睡不好、关系沟通困难的人群。',
          painPointText: '用户不知道自己的问题属于短期压力还是需要持续支持。',
          serviceProcess: '提交状态 - 初步沟通 - 判断支持方式 - 推荐后续服务。',
          serviceMode: 'online',
          serviceDuration: '1 次初聊',
          tags: ['压力管理', '情绪支持', '先了解', '线上咨询'],
          priority: 34,
          sortOrder: 0,
        },
        {
          title: '关系沟通成长课',
          subtitle: '伴侣、家庭和职场沟通场景练习',
          priceText: '199元体验',
          coverUrl: uploadedCoverUrl('product-emotion.jpg'),
          summary: '帮助用户学习更清晰地表达需求和处理冲突。',
          detail: '用于验证“关系沟通”“职场进阶”“社群陪伴”等标签。',
          targetUserText: '在人际关系、伴侣关系或职场沟通中经常感到消耗的人群。',
          painPointText: '用户不是没有意愿沟通，而是缺少可练习的方法。',
          serviceProcess: '选择沟通场景 - 学习表达框架 - 练习反馈 - 后续跟进。',
          serviceMode: 'online',
          serviceDuration: '7 天练习体验',
          tags: ['关系沟通', '职场进阶', '社群陪伴'],
          priority: 23,
          sortOrder: 1,
        },
        {
          title: '情绪记录工具包',
          productType: 'physical',
          subtitle: '帮助用户把压力、睡眠和情绪变化记录下来',
          priceText: '79元起',
          coverUrl: uploadedCoverUrl('product-emotion.jpg'),
          summary: '适合想先自我观察情绪变化的用户，咨询后可选择是否进入进一步服务。',
          detail: '用于验收情绪模块实物产品在小程序中的展示和咨询购买入口。',
          targetUserText: '近期压力大、情绪起伏明显，希望先自我记录和观察的人群。',
          painPointText: '用户经常说不清状态变化，沟通时缺少可复盘的记录。',
          serviceProcess: '',
          specText: '包含情绪记录卡、睡眠记录表和压力来源梳理模板。',
          deliveryText: '提交咨询后确认是否需要纸质版配送。',
          afterSaleText: '未配送前可调整收件信息。',
          stockStatus: 'available',
          tags: ['压力管理', '情绪支持', '先了解'],
          priority: 21,
          sortOrder: 2,
        },
        {
          title: '压力恢复陪伴组合',
          productType: 'package',
          subtitle: '初聊咨询 + 情绪记录工具',
          priceText: '299元起',
          coverUrl: uploadedCoverUrl('product-emotion.jpg'),
          summary: '适合希望有人陪伴梳理压力，同时借助工具持续记录的用户。',
          detail: '用于验收情绪模块组合方案同时展示服务和实物信息。',
          targetUserText: '压力较高、睡眠受影响，希望获得轻量支持的人群。',
          painPointText: '只靠一次沟通难以持续观察，只靠工具又缺少反馈。',
          serviceProcess: '初聊沟通 - 确定记录重点 - 使用工具包 - 7 天反馈。',
          serviceMode: 'online',
          serviceDuration: '7 天陪伴方案',
          appointmentRequired: true,
          specText: '包含情绪记录工具包和 1 次反馈沟通。',
          deliveryText: '工具包可选择线上资料或纸质配送。',
          afterSaleText: '方案期内可调整记录重点。',
          stockStatus: 'available',
          tags: ['压力管理', '情绪支持', '社群陪伴'],
          priority: 28,
          sortOrder: 3,
        },
      ],
    },
  ]

  for (const group of richerProducts) {
    for (const item of group.items) {
      await upsertProduct(group.moduleId, item)
    }
  }

  async function productIdByTitle(moduleId: bigint, title: string) {
    const product = await prisma.product.findFirst({
      where: { moduleId, title },
      select: { id: true },
    })
    return product?.id
  }

  async function upsertRecommendationRule(item: {
    moduleId: bigint
    productId: bigint
    name: string
    conditionTags: string[]
    scoreBoost: number
    reason: string
    sortOrder: number
  }) {
    const existing = await prisma.assessmentRecommendationRule.findFirst({
      where: { moduleId: item.moduleId, productId: item.productId, name: item.name, deletedAt: null },
      select: { id: true },
    })
    const data = {
      moduleId: item.moduleId,
      productId: item.productId,
      name: item.name,
      conditionTags: item.conditionTags,
      conditionTagIds: await tagIdsByNames(item.conditionTags, item.moduleId),
      scoreBoost: item.scoreBoost,
      reason: item.reason,
      sortOrder: item.sortOrder,
      status: 1,
    }
    if (existing) await prisma.assessmentRecommendationRule.update({ where: { id: existing.id }, data })
    else await prisma.assessmentRecommendationRule.create({ data })
  }

  const sleepProductId = await productIdByTitle(healthModule.id, '睡眠质量改善计划')
  if (sleepProductId) {
    await upsertRecommendationRule({
      moduleId: healthModule.id,
      productId: sleepProductId,
      name: '睡眠重点改善推荐',
      conditionTags: ['睡眠改善', '重点改善'],
      scoreBoost: 80,
      reason: '你提到睡眠已经影响生活，建议优先了解睡眠质量改善计划。',
      sortOrder: 0,
    })
  }
  const weightProductId = await productIdByTitle(healthModule.id, '轻体管理体验营')
  if (weightProductId) {
    await upsertRecommendationRule({
      moduleId: healthModule.id,
      productId: weightProductId,
      name: '体重管理体验推荐',
      conditionTags: ['体重管理'],
      scoreBoost: 55,
      reason: '你关注体重管理，可以先从饮食和运动结合的体验营开始。',
      sortOrder: 10,
    })
  }
  const beautyProductId = await productIdByTitle(beautyModule.id, '皮肤状态基础评估')
  if (beautyProductId) {
    await upsertRecommendationRule({
      moduleId: beautyModule.id,
      productId: beautyProductId,
      name: '皮肤管理初筛推荐',
      conditionTags: ['皮肤管理'],
      scoreBoost: 60,
      reason: '你关注皮肤状态，建议先做一次基础评估再选择服务。',
      sortOrder: 20,
    })
  }
  const emotionProductId = await productIdByTitle(emotionModule.id, '压力情绪梳理咨询')
  if (emotionProductId) {
    await upsertRecommendationRule({
      moduleId: emotionModule.id,
      productId: emotionProductId,
      name: '压力情绪优先沟通',
      conditionTags: ['压力管理', '线上咨询'],
      scoreBoost: 70,
      reason: '你希望尽快有人沟通，建议先预约压力情绪梳理咨询。',
      sortOrder: 30,
    })
  }

  const demoPhone = '13800001111'
  const demoUser = await prisma.user.upsert({
    where: { phoneHash: hmac(demoPhone, process.env.JWT_ACCESS_SECRET || 'dev-secret') },
    update: {
      nickname: '演示咨询用户',
      tags: ['睡眠改善', '重点改善', '线上咨询'],
      status: 1,
    },
    create: {
      phoneCiphertext: Buffer.from(demoPhone),
      phoneHash: hmac(demoPhone, process.env.JWT_ACCESS_SECRET || 'dev-secret'),
      phoneMasked: '138****1111',
      nickname: '演示咨询用户',
      tags: ['睡眠改善', '重点改善', '线上咨询'],
      status: 1,
    },
  })
  await prisma.userAssessment.upsert({
    where: { userId_moduleCode: { userId: demoUser.id, moduleCode: 'health' } },
    update: {
      assessmentType: 'health',
      tags: ['睡眠改善', '重点改善', '线上咨询'],
      tagIds: await tagIdsByNames(['睡眠改善', '重点改善', '线上咨询'], healthModule.id),
      tagWeights: Object.fromEntries((await tagIdsByNames(['睡眠改善', '重点改善', '线上咨询'], healthModule.id)).map((id) => [String(id), 1])),
      summary: '你现在最想改善什么：睡眠质量；这个问题现在到什么程度：已经影响生活；你更偏好哪种服务方式：线上咨询',
      answers: { focus: 'sleep', level: 'medium', service: 'online' },
    },
    create: {
      userId: demoUser.id,
      moduleCode: 'health',
      assessmentType: 'health',
      tags: ['睡眠改善', '重点改善', '线上咨询'],
      tagIds: await tagIdsByNames(['睡眠改善', '重点改善', '线上咨询'], healthModule.id),
      tagWeights: Object.fromEntries((await tagIdsByNames(['睡眠改善', '重点改善', '线上咨询'], healthModule.id)).map((id) => [String(id), 1])),
      summary: '你现在最想改善什么：睡眠质量；这个问题现在到什么程度：已经影响生活；你更偏好哪种服务方式：线上咨询',
      answers: { focus: 'sleep', level: 'medium', service: 'online' },
    },
  })
  const demoProduct = await prisma.product.findFirst({
    where: { moduleId: healthModule.id, title: '睡眠质量改善计划' },
    select: { id: true },
  })
  if (demoProduct) {
    const existingLead = await prisma.productLead.findFirst({
      where: { productId: demoProduct.id, userId: demoUser.id },
      select: { id: true },
    })
    const leadData = {
      productId: demoProduct.id,
      userId: demoUser.id,
      partnerId: null,
      sourceScene: 'seed_demo',
      needTags: ['睡眠改善', '重点改善', '线上咨询'],
      message: '最近入睡慢，白天精力不足，希望先线上了解。\n需求评估：你现在最想改善什么：睡眠质量；这个问题现在到什么程度：已经影响生活；你更偏好哪种服务方式：线上咨询',
      status: 'contacted',
      followUpNote: '已电话沟通，用户希望先拿到 7 天作息建议。',
      nextFollowAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    }
    const demoLead = existingLead
      ? await prisma.productLead.update({ where: { id: existingLead.id }, data: leadData })
      : await prisma.productLead.create({ data: leadData })
    await prisma.productLeadFollowUp.deleteMany({ where: { leadId: demoLead.id } })
    await prisma.productLeadFollowUp.createMany({
      data: [
        {
          leadId: demoLead.id,
          operatorType: 'system',
          fromStatus: 'created',
          toStatus: 'new',
          note: '线索创建',
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        },
        {
          leadId: demoLead.id,
          operatorId: admin.id,
          operatorType: 'admin',
          fromStatus: 'new',
          toStatus: 'contacted',
          note: '已电话沟通，用户希望先拿到 7 天作息建议。',
          nextFollowAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          createdAt: new Date(Date.now() - 60 * 60 * 1000),
        },
      ],
    })
  }
  async function upsertVenue() {
    const facilityNames = ['投影', '茶水', '咨询室', '停车位']
    const existing = await prisma.venue.findFirst({
      where: { name: '杭州线下体验点', deletedAt: null },
      select: { id: true },
    })
    const data = {
      name: '杭州线下体验点',
      subtitle: '适合小型沙龙、体验课和一对多咨询',
      coverUrl: uploadedCoverUrl('product-family.jpg'),
      address: '杭州市西湖区示例路 88 号',
      city: '杭州',
      district: '西湖区',
      capacity: 40,
      description: '用于本地验收的默认线下场地，可承接健康、美学和家庭类小型活动。',
      contactName: '运营值班',
      contactPhoneMasked: '0571****8888',
      status: 1,
      sortOrder: 0,
    }
    const venue = existing
      ? await prisma.venue.update({ where: { id: existing.id }, data })
      : await prisma.venue.create({ data })
    const facilities = await Promise.all(
      facilityNames.map((name, index) =>
        prisma.venueFacility.upsert({
          where: { name },
          update: { status: 1, sortOrder: index },
          create: { name, status: 1, sortOrder: index },
        })
      )
    )
    await prisma.venueFacilityOnVenue.deleteMany({ where: { venueId: venue.id } })
    await prisma.venueFacilityOnVenue.createMany({
      data: facilities.map((facility, index) => ({ venueId: venue.id, facilityId: facility.id, sortOrder: index })),
      skipDuplicates: true,
    })
    await prisma.venueImage.deleteMany({ where: { venueId: venue.id } })
    await prisma.venueImage.createMany({
      data: [
        { venueId: venue.id, imageUrl: uploadedCoverUrl('product-family.jpg'), sortOrder: 0 },
        { venueId: venue.id, imageUrl: uploadedCoverUrl('product-consult.jpg'), sortOrder: 1 },
      ],
    })
    await prisma.venueAvailability.deleteMany({ where: { venueId: venue.id } })
    await prisma.venueAvailability.createMany({
      data: [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({
        venueId: venue.id,
        weekday,
        startTime: '09:00',
        endTime: '21:00',
        status: 1,
      })),
    })
    await prisma.venueBlockedSlot.deleteMany({ where: { venueId: venue.id } })
    return venue
  }

  const demoVenue = await upsertVenue()
  const demoVenueFacilities = ['投影', '茶水', '咨询室', '停车位']

  async function upsertActivity(item: {
    moduleId: bigint
    title: string
    subtitle: string
    coverUrl: string
    activityType: string
    startOffsetDays: number
    durationHours: number
    registrationStartOffsetDays?: number
    registrationEndOffsetDays: number
    locationText: string
    capacity?: number
    targetUserText: string
    highlights: string[]
    detail: string
    tags: string[]
    relatedProductTitles: string[]
    venueId?: bigint
    priority: number
    sortOrder: number
  }) {
    const relatedProducts = await prisma.product.findMany({
      where: {
        moduleId: item.moduleId,
        title: { in: item.relatedProductTitles },
        deletedAt: null,
      },
      select: { id: true },
    })
    const startAt = new Date(Date.now() + item.startOffsetDays * 24 * 60 * 60 * 1000)
    const endAt = new Date(startAt.getTime() + item.durationHours * 60 * 60 * 1000)
    const registrationStartAt = item.registrationStartOffsetDays === undefined
      ? null
      : new Date(Date.now() + item.registrationStartOffsetDays * 24 * 60 * 60 * 1000)
    const registrationEndAt = new Date(Date.now() + item.registrationEndOffsetDays * 24 * 60 * 60 * 1000)
    const existing = await prisma.activity.findFirst({
      where: { moduleId: item.moduleId, title: item.title, deletedAt: null },
      select: { id: true },
    })
    const data = {
      moduleId: item.moduleId,
      title: item.title,
      subtitle: item.subtitle,
      coverUrl: item.coverUrl,
      activityType: item.activityType,
      startAt,
      endAt,
      registrationStartAt,
      registrationEndAt,
      locationText: item.locationText,
      venueId: item.venueId ?? null,
      venueSnapshot: item.venueId
        ? {
            id: Number(demoVenue.id),
            name: demoVenue.name,
            subtitle: demoVenue.subtitle,
            coverUrl: demoVenue.coverUrl,
            address: demoVenue.address,
            city: demoVenue.city,
            district: demoVenue.district,
            capacity: demoVenue.capacity,
            facilities: demoVenueFacilities,
          }
        : {},
      capacity: item.capacity ?? null,
      targetUserText: item.targetUserText,
      highlights: item.highlights,
      detail: item.detail,
      tags: item.tags,
      tagIds: await tagIdsByNames(item.tags, item.moduleId),
      relatedProductIds: relatedProducts.map((product) => product.id),
      priority: item.priority,
      sortOrder: item.sortOrder,
      status: 1,
      publishedAt: new Date(),
    }
    if (existing) await prisma.activity.update({ where: { id: existing.id }, data })
    else await prisma.activity.create({ data })
  }

  const activitySeeds = [
    {
      moduleId: healthModule.id,
      title: '睡眠改善公开课',
      subtitle: '从作息、压力和饮食三个角度找到可执行入口',
      coverUrl: uploadedCoverUrl('product-sleep.jpg'),
      activityType: 'online',
      startOffsetDays: 3,
      durationHours: 1.5,
      registrationEndOffsetDays: 2,
      locationText: '线上直播间，报名后通知',
      capacity: 80,
      targetUserText: '入睡慢、浅睡、早醒或长期熬夜的人群。',
      highlights: ['睡眠自查', '作息建议', '线上答疑'],
      detail: '本活动用于帮助用户低门槛了解睡眠改善方法，适合和睡眠质量改善计划、职场压力恢复方案联动。',
      tags: ['睡眠改善', '健康养生', '线上咨询'],
      relatedProductTitles: ['睡眠质量改善计划', '职场压力恢复方案'],
      priority: 80,
      sortOrder: 0,
    },
    {
      moduleId: healthModule.id,
      title: '轻体管理体验说明会',
      subtitle: '了解饮食记录、运动计划和习惯复盘怎么组合',
      coverUrl: uploadedCoverUrl('product-weight.jpg'),
      activityType: 'mixed',
      startOffsetDays: 7,
      durationHours: 2,
      registrationEndOffsetDays: 6,
      locationText: '线上说明 + 到店体验名额',
      venueId: demoVenue.id,
      capacity: 30,
      targetUserText: '关注体重管理、饮食结构和运动习惯的人群。',
      highlights: ['方案拆解', '体验名额', '顾问答疑'],
      detail: '活动重点解释轻体管理体验营适合什么用户、需要投入多少时间，以及如何做后续咨询。',
      tags: ['体重管理', '运动健身', '低价体验'],
      relatedProductTitles: ['轻体管理体验营', '营养咨询入门课'],
      priority: 70,
      sortOrder: 1,
    },
    {
      moduleId: beautyModule.id,
      title: '皮肤状态初筛日',
      subtitle: '先判断肤质和基础护理方向，再选择服务',
      coverUrl: uploadedCoverUrl('product-beauty.jpg'),
      activityType: 'offline',
      startOffsetDays: 10,
      durationHours: 4,
      registrationEndOffsetDays: 9,
      locationText: '杭州线下体验点',
      venueId: demoVenue.id,
      capacity: 20,
      targetUserText: '想改善皮肤状态但不确定服务选择的人群。',
      highlights: ['肤质初筛', '护理建议', '到店体验'],
      detail: '美学模块活动用于承接皮肤管理标签用户，报名后由运营确认到店时间。',
      tags: ['皮肤管理', '到店体验', '免费评估'],
      relatedProductTitles: ['皮肤状态基础评估'],
      priority: 60,
      sortOrder: 2,
    },
    {
      moduleId: emotionModule.id,
      title: '压力情绪轻量练习营',
      subtitle: '用一周时间观察压力来源和恢复动作',
      coverUrl: uploadedCoverUrl('product-emotion.jpg'),
      activityType: 'online',
      startOffsetDays: -10,
      durationHours: 2,
      registrationEndOffsetDays: -11,
      locationText: '线上回放已结束',
      targetUserText: '压力较高、睡眠受影响、希望先轻量了解的人群。',
      highlights: ['压力记录', '练习方法', '回放复盘'],
      detail: '已结束活动用于验证小程序已结束筛选和后台历史活动状态。',
      tags: ['压力管理', '情绪支持', '社群陪伴'],
      relatedProductTitles: ['压力情绪梳理咨询', '压力恢复陪伴组合'],
      priority: 20,
      sortOrder: 3,
    },
  ]
  for (const item of activitySeeds) {
    await upsertActivity(item)
  }

  console.log('产品推荐示例数据已就绪')
  console.log('活动报名示例数据已就绪')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

// 辅助：HMAC（与 service 一致，便于测试数据）
export function hmac(input: string, secret: string): string {
  return createHmac('sha256', secret).update(input).digest('hex')
}
