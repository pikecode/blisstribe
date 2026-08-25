import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'
import { createHmac } from 'crypto'

const prisma = new PrismaClient()

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
    subtitle: string
    priceText: string
    coverUrl?: string
    summary: string
    detail: string
    targetUserText: string
    painPointText: string
    serviceProcess: string
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
      subtitle: item.subtitle,
      coverUrl: item.coverUrl ?? '',
      priceText: item.priceText,
      summary: item.summary,
      detail: item.detail,
      targetUserText: item.targetUserText,
      painPointText: item.painPointText,
      serviceProcess: item.serviceProcess,
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

  const sampleProducts = [
    {
      title: '健康生活方式评估',
      subtitle: '根据你的生活习惯和健康关注点做初步匹配',
      priceText: '免费评估',
      coverUrl: '/static/images/covers/product-consult.svg',
      summary: '适合想改善睡眠、体重管理、运动习惯的用户，提交需求后由平台或服务伙伴跟进。',
      detail: '这是健康模块的首个 MVP 示例产品，用于验证产品展示、标签匹配和线索提交闭环。',
      targetUserText: '关注健康养生、运动健身、生活方式改善的人群。',
      painPointText: '不知道从哪里开始改善健康状态，面对很多服务难以选择。',
      serviceProcess: '填写需求标签 - 平台记录线索 - 运营人员或 B 端伙伴联系 - 推荐合适服务。',
      tags: ['健康养生', '运动健身', '生活方式'],
      priority: 20,
      sortOrder: 0,
    },
    {
      title: '睡眠质量改善计划',
      subtitle: '面向长期熬夜、浅睡和作息不规律人群',
      priceText: '299元起',
      coverUrl: '/static/images/covers/product-sleep.svg',
      summary: '通过睡眠习惯评估、作息建议和轻量跟踪，帮助用户建立更稳定的睡眠节奏。',
      detail: '该产品适合用来测试“睡眠改善”“健康养生”“职场进阶”等标签匹配。后续可扩展为问卷评估、服务包和专家咨询。',
      targetUserText: '睡眠浅、入睡慢、经常熬夜、白天精力不足的人群。',
      painPointText: '用户知道睡眠重要，但难以找到适合自己的调整路径。',
      serviceProcess: '填写睡眠状态 - 输出初步建议 - 匹配服务顾问 - 跟进 7 天改善反馈。',
      tags: ['睡眠改善', '健康养生', '职场进阶'],
      priority: 35,
      sortOrder: 1,
    },
    {
      title: '轻体管理体验营',
      subtitle: '饮食、运动、习惯三线结合',
      priceText: '399元起',
      coverUrl: '/static/images/covers/product-weight.svg',
      summary: '适合希望控制体重但不想极端节食的用户，强调可持续的生活方式调整。',
      detail: '该产品用于验证“体重管理”“运动健身”“美食探店”等标签对推荐排序的影响。',
      targetUserText: '希望减脂塑形、调整饮食结构、建立运动习惯的人群。',
      painPointText: '选择太多，执行太难，容易短期冲刺后反弹。',
      serviceProcess: '记录目标 - 建立饮食运动计划 - 每周复盘 - 根据反馈调整方案。',
      tags: ['体重管理', '运动健身', '美食探店'],
      priority: 30,
      sortOrder: 2,
    },
    {
      title: '家庭健康基础包',
      subtitle: '为家庭成员做基础健康关注点梳理',
      priceText: '到店咨询',
      coverUrl: '/static/images/covers/product-family.svg',
      summary: '围绕父母、伴侣、孩子的日常健康需求，提供基础建议和服务匹配。',
      detail: '该产品用于验证“家庭健康”“亲子育儿”“健康养生”等家庭场景推荐。',
      targetUserText: '关注父母健康、儿童成长、家庭日常健康管理的人群。',
      painPointText: '家庭成员需求不同，用户不知道该优先关注哪些服务。',
      serviceProcess: '填写家庭成员情况 - 梳理健康关注点 - 推荐服务组合 - 后续跟进。',
      tags: ['家庭健康', '亲子育儿', '健康养生'],
      priority: 25,
      sortOrder: 3,
    },
    {
      title: '营养咨询入门课',
      subtitle: '从日常饮食开始优化身体状态',
      priceText: '99元体验',
      coverUrl: '/static/images/covers/product-consult.svg',
      summary: '面向想调整饮食结构、改善精神状态和基础代谢的人群。',
      detail: '该产品用于测试“健康养生”“美食探店”“生活方式”等轻咨询类产品推荐。',
      targetUserText: '经常外食、饮食不规律、想学习基础营养搭配的人群。',
      painPointText: '用户容易被碎片化健康信息影响，缺少可执行的饮食建议。',
      serviceProcess: '提交饮食习惯 - 初步营养建议 - 推荐可执行清单 - 复盘调整。',
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
          subtitle: '面向高压工作和长期疲惫人群',
          priceText: '199元体验',
          coverUrl: '/static/images/covers/product-emotion.svg',
          summary: '结合压力自评、作息建议和轻量运动计划，帮助用户先恢复精力和节奏。',
          detail: '适合用来观察“职场进阶”“重点改善”“生活方式”等标签对健康产品排序的影响。',
          targetUserText: '工作节奏快、睡眠差、容易疲惫、希望恢复精力的人群。',
          painPointText: '压力来源复杂，用户容易把健康问题拖成长期低效状态。',
          serviceProcess: '压力自评 - 顾问沟通 - 制定 7 天恢复计划 - 跟进反馈。',
          tags: ['职场进阶', '重点改善', '生活方式', '线上咨询'],
          priority: 32,
          sortOrder: 5,
        },
        {
          title: '到店体态评估体验',
          subtitle: '肩颈、久坐、运动姿态基础评估',
          priceText: '到店99元',
          coverUrl: '/static/images/covers/product-weight.svg',
          summary: '适合久坐、肩颈不适和运动前想了解身体状态的用户。',
          detail: '该产品用于验证“到店体验”“运动健身”“尽快改善”等标签组合。',
          targetUserText: '久坐办公、肩颈不适、准备开始运动但担心动作不规范的人群。',
          painPointText: '用户想开始运动，但不知道身体限制和适合自己的切入点。',
          serviceProcess: '预约到店 - 体态评估 - 动作建议 - 后续训练或康复服务推荐。',
          tags: ['到店体验', '运动健身', '尽快改善', '生活方式'],
          priority: 28,
          sortOrder: 6,
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
          coverUrl: '/static/images/covers/product-beauty.svg',
          summary: '面向想改善皮肤状态但不知道从哪里开始的用户，适合作为美学模块首个咨询入口。',
          detail: '第一步只采集用户诉求和基础状态，后续可扩展为皮肤问卷、门店检测和方案推荐。',
          targetUserText: '关注皮肤状态、痘痘、敏感、暗沉和日常护肤的人群。',
          painPointText: '用户容易被大量产品和项目影响，缺少适合自己的基础判断。',
          serviceProcess: '提交皮肤关注点 - 顾问初筛 - 推荐护理路径 - 预约体验。',
          tags: ['皮肤管理', '形象提升', '免费评估', '线上咨询'],
          priority: 30,
          sortOrder: 0,
        },
        {
          title: '形象提升轻咨询',
          subtitle: '妆发、穿搭和场景形象建议',
          priceText: '199元起',
          coverUrl: '/static/images/covers/product-beauty.svg',
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
          coverUrl: '/static/images/covers/product-beauty.svg',
          summary: '适合对到店护理感兴趣，希望先低成本体验服务流程的用户。',
          detail: '用于验证“到店体验”“低价体验”“皮肤管理”等标签。',
          targetUserText: '想体验皮肤管理、关注暗沉和基础清洁护理的人群。',
          painPointText: '用户担心项目复杂和价格不透明，需要一个低门槛体验入口。',
          serviceProcess: '选择门店 - 到店评估 - 完成体验 - 记录反馈。',
          tags: ['皮肤管理', '到店体验', '低价体验'],
          priority: 26,
          sortOrder: 2,
        },
      ],
    },
    {
      moduleId: familyModule.id,
      items: [
        {
          title: '长辈健康关怀计划',
          subtitle: '给父母做一次基础健康关注点梳理',
          priceText: '顾问定制',
          coverUrl: '/static/images/covers/product-family.svg',
          summary: '围绕长辈饮食、睡眠、运动和基础慢病关注点，帮助家庭先建立健康档案。',
          detail: '用于验证家庭类服务中“家庭健康”“长辈关怀”“重点改善”等标签。',
          targetUserText: '关注父母健康，但不知道从哪里开始安排服务的子女。',
          painPointText: '长辈健康需求分散，家庭成员难以长期跟进。',
          serviceProcess: '填写家庭情况 - 顾问沟通 - 建立关注清单 - 推荐服务组合。',
          tags: ['家庭健康', '长辈关怀', '重点改善', '线上咨询'],
          priority: 31,
          sortOrder: 0,
        },
        {
          title: '亲子成长陪伴营',
          subtitle: '亲子沟通、习惯培养和家庭陪伴',
          priceText: '399元起',
          coverUrl: '/static/images/covers/product-family.svg',
          summary: '适合想改善亲子沟通和孩子习惯培养的家庭。',
          detail: '用于观察“亲子育儿”“家庭健康”“社群陪伴”等标签。',
          targetUserText: '关注孩子成长、亲子沟通和家庭陪伴质量的家长。',
          painPointText: '家长知道需要陪伴，但很难形成稳定方法和外部支持。',
          serviceProcess: '填写亲子状态 - 匹配陪伴主题 - 进入社群 - 每周反馈。',
          tags: ['亲子育儿', '家庭健康', '社群陪伴'],
          priority: 27,
          sortOrder: 1,
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
          coverUrl: '/static/images/covers/product-emotion.svg',
          summary: '适合近期压力大、情绪波动明显但还不确定是否需要长期服务的用户。',
          detail: '当前作为情绪模块 MVP 咨询入口，后续可扩展为量表评估和咨询师匹配。',
          targetUserText: '高压、焦虑、睡不好、关系沟通困难的人群。',
          painPointText: '用户不知道自己的问题属于短期压力还是需要持续支持。',
          serviceProcess: '提交状态 - 初步沟通 - 判断支持方式 - 推荐后续服务。',
          tags: ['压力管理', '情绪支持', '先了解', '线上咨询'],
          priority: 34,
          sortOrder: 0,
        },
        {
          title: '关系沟通成长课',
          subtitle: '伴侣、家庭和职场沟通场景练习',
          priceText: '199元体验',
          coverUrl: '/static/images/covers/product-emotion.svg',
          summary: '帮助用户学习更清晰地表达需求和处理冲突。',
          detail: '用于验证“关系沟通”“职场进阶”“社群陪伴”等标签。',
          targetUserText: '在人际关系、伴侣关系或职场沟通中经常感到消耗的人群。',
          painPointText: '用户不是没有意愿沟通，而是缺少可练习的方法。',
          serviceProcess: '选择沟通场景 - 学习表达框架 - 练习反馈 - 后续跟进。',
          tags: ['关系沟通', '职场进阶', '社群陪伴'],
          priority: 23,
          sortOrder: 1,
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
  console.log('产品推荐示例数据已就绪')
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
