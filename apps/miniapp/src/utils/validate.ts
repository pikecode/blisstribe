// 校验工具

export function isValidPhone(phone: string): boolean {
  return /^1[3-9]\d{9}$/.test(phone)
}

export function isValidNickname(nickname: string): boolean {
  const trimmed = nickname.trim()
  return trimmed.length >= 2 && trimmed.length <= 20
}

export function isValidPassword(password: string): boolean {
  return /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,20}$/.test(password)
}

export function isSensitiveWord(word: string): boolean {
  // 敏感词检测（可对接敏感词服务）
  const sensitiveWords = ['敏感词1', '敏感词2']
  return sensitiveWords.some((w) => word.includes(w))
}
