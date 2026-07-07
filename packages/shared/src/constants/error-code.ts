// 业务错误码（对齐 docs/API.md）

export const ErrorCode = {
  // 认证错误 4xx
  WECHAT_AUTH_FAILED: 400001,
  GET_PHONE_FAILED: 400002,
  NICKNAME_FORMAT_ERROR: 400003,
  NICKNAME_SENSITIVE: 400004,
  AVATAR_UPLOAD_FAILED: 400005,
  AGREEMENT_NOT_ACCEPTED: 400006,
  PHONE_ALREADY_REGISTERED: 400007,
  PASSWORD_WEAK: 400008,
  TEMP_TOKEN_INVALID: 400009,
  PARAMS_INVALID: 400010,
  PASSWORD_WRONG: 400011,
  TOKEN_INVALID: 401001,
  TOKEN_EXPIRED: 401002,
  NOT_LOGIN: 401003,
  FORBIDDEN: 403001,
  USER_NOT_FOUND: 404001,
  RESOURCE_NOT_FOUND: 404002,
  RATE_LIMITED: 429001,

  // 系统错误 5xx
  WECHAT_SERVICE_ERROR: 500001,
  FILE_UPLOAD_ERROR: 500002,
  DB_ERROR: 500003,
  CACHE_ERROR: 500004,
  INTERNAL_ERROR: 500005,
} as const

export type ErrorCodeValue = (typeof ErrorCode)[keyof typeof ErrorCode]

export const ErrorMessage: Record<number, string> = {
  [ErrorCode.WECHAT_AUTH_FAILED]: '微信授权失败',
  [ErrorCode.GET_PHONE_FAILED]: '获取手机号失败',
  [ErrorCode.NICKNAME_FORMAT_ERROR]: '昵称格式错误',
  [ErrorCode.NICKNAME_SENSITIVE]: '昵称包含敏感词',
  [ErrorCode.AVATAR_UPLOAD_FAILED]: '头像上传失败',
  [ErrorCode.AGREEMENT_NOT_ACCEPTED]: '未同意用户协议',
  [ErrorCode.PHONE_ALREADY_REGISTERED]: '手机号已注册',
  [ErrorCode.PASSWORD_WEAK]: '密码强度不足',
  [ErrorCode.TEMP_TOKEN_INVALID]: '临时令牌无效或过期',
  [ErrorCode.PARAMS_INVALID]: '参数校验失败',
  [ErrorCode.PASSWORD_WRONG]: '密码错误',
  [ErrorCode.TOKEN_INVALID]: 'Token 无效',
  [ErrorCode.TOKEN_EXPIRED]: 'Token 已过期',
  [ErrorCode.NOT_LOGIN]: '未登录',
  [ErrorCode.FORBIDDEN]: '权限不足',
  [ErrorCode.USER_NOT_FOUND]: '用户不存在',
  [ErrorCode.RESOURCE_NOT_FOUND]: '资源不存在',
  [ErrorCode.RATE_LIMITED]: '请求过于频繁',
  [ErrorCode.WECHAT_SERVICE_ERROR]: '微信服务异常',
  [ErrorCode.FILE_UPLOAD_ERROR]: '文件上传失败',
  [ErrorCode.DB_ERROR]: '数据库错误',
  [ErrorCode.CACHE_ERROR]: '缓存错误',
  [ErrorCode.INTERNAL_ERROR]: '系统内部错误',
}
