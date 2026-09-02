/**
 * 性能监控工具类
 * 用于追踪页面加载、API 响应和组件渲染时间
 */

interface PerformanceMetric {
  name: string
  startTime: number
  duration?: number
  metadata?: Record<string, any>
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map()
  private thresholds = {
    apiResponse: 1000, // API 响应时间阈值 (ms)
    pageLoad: 3000, // 页面加载时间阈值 (ms)
    componentRender: 500, // 组件渲染时间阈值 (ms)
  }

  /**
   * 开始测量
   */
  startMeasure(name: string, metadata?: Record<string, any>): void {
    this.metrics.set(name, {
      name,
      startTime: performance.now(),
      metadata,
    })
  }

  /**
   * 结束测量并记录
   */
  endMeasure(name: string): PerformanceMetric | null {
    const metric = this.metrics.get(name)
    if (!metric) {
      console.warn(`[Performance] 未找到测量 "${name}"`)
      return null
    }

    const duration = performance.now() - metric.startTime
    metric.duration = duration

    this.logMetric(metric)
    this.metrics.delete(name)

    return metric
  }

  /**
   * 记录指标并检查阈值
   */
  private logMetric(metric: PerformanceMetric): void {
    const { name, duration, metadata } = metric

    if (!duration) return

    const isDev = import.meta.env.DEV
    const isSlow = this.isSlowMetric(name, duration)

    if (isDev || isSlow) {
      const level = isSlow ? 'warn' : 'log'
      const message = `[Performance] ${name}: ${duration.toFixed(2)}ms`
      const extra = metadata ? { metadata } : {}

      console.group(message)
      console[level](message)
      if (metadata) console.table(metadata)
      console.groupEnd()
    }

    // 发送到监控服务（生产环境）
    if (import.meta.env.PROD) {
      this.sendToMonitoring(metric)
    }
  }

  /**
   * 判断指标是否超过阈值
   */
  private isSlowMetric(name: string, duration: number): boolean {
    if (name.includes('api')) {
      return duration > this.thresholds.apiResponse
    }
    if (name.includes('page')) {
      return duration > this.thresholds.pageLoad
    }
    if (name.includes('render')) {
      return duration > this.thresholds.componentRender
    }
    return false
  }

  /**
   * 发送指标到监控服务
   */
  private sendToMonitoring(metric: PerformanceMetric): void {
    // TODO: 实现监控服务集成
    // fetch('/api/metrics', {
    //   method: 'POST',
    //   body: JSON.stringify(metric),
    // }).catch(err => console.error('[Performance] 上报失败:', err))
  }

  /**
   * 获取页面 Web Vitals
   */
  getWebVitals(): Record<string, number | null> {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming

    if (!navigation) {
      return {
        fcp: null, // First Contentful Paint
        lcp: null, // Largest Contentful Paint
        fid: null, // First Input Delay
        cls: null, // Cumulative Layout Shift
      }
    }

    return {
      fcp: navigation.responseStart - navigation.fetchStart,
      lcp: navigation.loadEventEnd - navigation.fetchStart,
      fid: navigation.domInteractive - navigation.fetchStart,
      cls: 0, // CLS 需要通过 PerformanceObserver 单独计算
    }
  }

  /**
   * 设置新的阈值
   */
  setThreshold(key: keyof typeof this.thresholds, value: number): void {
    this.thresholds[key] = value
  }

  /**
   * 清空所有测量
   */
  clear(): void {
    this.metrics.clear()
  }
}

export const performanceMonitor = new PerformanceMonitor()

/**
 * 装饰器：自动测量函数执行时间
 */
export function measurePerformance(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value

  descriptor.value = async function (...args: any[]) {
    const name = `${target.constructor.name}.${propertyKey}`
    performanceMonitor.startMeasure(name)

    try {
      const result = await originalMethod.apply(this, args)
      performanceMonitor.endMeasure(name)
      return result
    } catch (error) {
      performanceMonitor.endMeasure(name)
      throw error
    }
  }

  return descriptor
}
