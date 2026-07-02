// 统一本地存储封装：key 前缀 + 过期时间 + 清理
// 不提供强加密；敏感数据不放本地，靠服务端短有效期 Token + 可吊销保障安全

const PREFIX = 'blisstribe_'

interface StorageMeta<T> {
  value: T
  expireAt?: number // 时间戳(ms)，undefined 表示永不过期
}

export const storage = {
  set<T>(key: string, value: T, opts?: { expireSeconds?: number }): void {
    const meta: StorageMeta<T> = { value }
    if (opts?.expireSeconds) {
      meta.expireAt = Date.now() + opts.expireSeconds * 1000
    }
    uni.setStorageSync(PREFIX + key, JSON.stringify(meta))
  },

  get<T>(key: string): T | null {
    const raw = uni.getStorageSync(PREFIX + key)
    if (!raw) return null
    try {
      const meta = JSON.parse(raw) as StorageMeta<T>
      if (meta.expireAt && meta.expireAt < Date.now()) {
        uni.removeStorageSync(PREFIX + key)
        return null
      }
      return meta.value
    } catch {
      return null
    }
  },

  remove(key: string): void {
    uni.removeStorageSync(PREFIX + key)
  },

  clear(): void {
    // 只清除带本项目前缀的 key
    const info = uni.getStorageInfoSync()
    info.keys.forEach((k) => {
      if (k.startsWith(PREFIX)) uni.removeStorageSync(k)
    })
  },
}
