/**
 * 中文简体（简体中文）翻译资源
 */

export default {
  // 通用
  common: {
    confirm: '确认',
    cancel: '取消',
    delete: '删除',
    edit: '编辑',
    add: '新增',
    search: '搜索',
    reset: '重置',
    submit: '提交',
    back: '返回',
    loading: '加载中...',
    noData: '暂无数据',
    success: '成功',
    error: '错误',
    warning: '警告',
    info: '信息',
  },

  // 导航和布局
  nav: {
    dashboard: '数据看板',
    user: '用户管理',
    product: '产品管理',
    banner: '焦点图管理',
    activity: '活动管理',
    invitation: '邀请管理',
    partner: '合作伙伴',
    venue: '场地管理',
    admin: '管理员管理',
    agreement: '协议管理',
    logout: '退出登录',
    admin_panel: '管理后台',
  },

  // 仪表盘
  dashboard: {
    title: '数据看板',
    description: '关注用户增长、活跃状态和账号风险，帮助判断当前运营质量',
    totalUsers: '总用户数',
    activeUsers: '活跃用户',
    todayNewUsers: '今日新增',
    disabledUsers: '已禁用',
    registrationTrend: '注册趋势',
    registrationTrendDesc: '近 30 天用户增长曲线',
    userDistribution: '用户分布',
    userDistributionDesc: '活跃 vs 禁用用户占比',
    funnelAnalysis: '用户转漏分析',
    invitationSuccess: '邀请成功',
    userRegistration: '用户注册',
    completedAuth: '完成认证',
    completedAssessment: '完成评估',
    autoRefresh: '启用自动刷新',
    autoRefreshing: '自动刷新中...',
    refreshData: '刷新数据',
  },

  // 用户管理
  user: {
    title: '用户管理',
    nickname: '昵称',
    phone: '手机号',
    gender: '性别',
    registeredTime: '注册时间',
    status: '状态',
    action: '操作',
    view: '查看',
    enable: '启用',
    disable: '禁用',
    batchOperation: '批量操作',
    batchDisable: '批量禁用',
    batchEnable: '批量启用',
    clearSelection: '取消选择',
    male: '男',
    female: '女',
    secret: '保密',
    active: '正常',
    inactive: '禁用',
  },

  // 产品管理
  product: {
    title: '产品管理',
    description: '维护服务模块、产品标签、推荐优先级和上下架状态',
    addProduct: '新增产品',
    addModule: '新增模块',
    productList: '产品列表',
    moduleList: '产品模块',
    productInfo: '产品',
    module: '模块',
    type: '类型',
    price: '价格',
    tags: '标签',
    status: '状态',
    action: '操作',
    draft: '草稿',
    published: '已上架',
    unpublished: '已下架',
    search: '搜索产品标题...',
  },

  // 消息提示
  message: {
    confirmDelete: '确定删除吗？此操作无法撤销',
    confirmDisable: '确定禁用吗？',
    confirmEnable: '确定启用吗？',
    operationSuccess: '操作成功',
    operationFailed: '操作失败',
    saveSuccess: '保存成功',
    saveFailed: '保存失败',
    deleteSuccess: '删除成功',
    deleteFailed: '删除失败',
    networkError: '网络错误，请稍后重试',
    unauthorized: '未登录，请重新登录',
    forbidden: '没有权限执行此操作',
    notFound: '请求的资源不存在',
    loginExpired: '登录已过期，请重新登录',
  },

  // 表单和验证
  form: {
    required: '此项为必填项',
    invalidEmail: '邮箱格式不正确',
    invalidPhone: '手机号格式不正确',
    passwordMismatch: '两次输入的密码不一致',
    minLength: '最少输入 {min} 个字符',
    maxLength: '最多输入 {max} 个字符',
  },

  // 时间和日期
  time: {
    now: '现在',
    today: '今天',
    yesterday: '昨天',
    thisWeek: '本周',
    thisMonth: '本月',
    thisYear: '今年',
    custom: '自定义',
  },
}
