<template>
  <div class="dashboard">
    <!-- 顶部统计卡片 -->
    <div class="dashboard__stats">
      <div
        v-for="(card, index) in statCards"
        :key="card.label"
        class="stat-card"
        :class="{ 'stat-card--primary': index === 0 }"
        :style="{ '--accent': card.color }"
      >
        <div class="stat-card__left">
          <el-skeleton v-if="loading" :rows="2" animated />
          <template v-else>
            <div class="stat-card__value">{{ card.value.toLocaleString('zh-CN') }}</div>
            <div class="stat-card__label">{{ card.label }}</div>
            <div v-if="card.trend" class="stat-card__trend" :class="{ 'stat-card__trend--up': card.trend > 0 }">
              <span v-if="card.trend > 0">↑</span><span v-else>↓</span>
              {{ Math.abs(card.trend) }}%
            </div>
          </template>
        </div>
        <div class="stat-card__right">
          <el-skeleton v-if="loading" variant="circle" :size="48" />
          <el-icon v-else class="stat-card__icon"><component :is="card.icon" /></el-icon>
        </div>
      </div>
    </div>

    <!-- 转漏指标 -->
    <div class="funnel-section">
      <div class="chart-card">
        <div class="chart-card__header">
          <h3 class="chart-card__title">用户转漏分析</h3>
          <p class="chart-card__desc">邀请 → 注册 → 认证 → 完成评估</p>
        </div>
        <div class="funnel-metrics">
          <div v-for="(metric, i) in funnelMetrics" :key="i" class="funnel-item">
            <div class="funnel-item__stage">{{ metric.stage }}</div>
            <div class="funnel-item__bar-wrapper">
              <div
                class="funnel-item__bar"
                :style="{ width: metric.percentage + '%', '--color': metric.color }"
              />
            </div>
            <div class="funnel-item__stats">
              <span class="funnel-item__count">{{ metric.count.toLocaleString('zh-CN') }}</span>
              <span class="funnel-item__percentage">{{ metric.percentage }}%</span>
              <span class="funnel-item__conversion">↓ {{ metric.conversion }}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 图表网格 -->
    <div class="dashboard__charts">
      <!-- 注册趋势 -->
      <div class="chart-card">
        <div class="chart-card__header">
          <h3 class="chart-card__title">注册趋势</h3>
          <p class="chart-card__desc">近 30 天用户增长曲线</p>
        </div>
        <el-skeleton v-if="loading" :rows="5" animated />
        <div v-else ref="chartRef" class="chart-card__canvas" />
      </div>

      <!-- 用户分布 -->
      <div class="chart-card">
        <div class="chart-card__header">
          <h3 class="chart-card__title">用户分布</h3>
          <p class="chart-card__desc">活跃 vs 禁用用户占比</p>
        </div>
        <el-skeleton v-if="loading" :rows="5" animated />
        <div v-else ref="distributionChartRef" class="chart-card__canvas" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import * as echarts from 'echarts'
import { statsApi } from '@/api'
import { CircleCheck, Remove, TrendCharts, User } from '@element-plus/icons-vue'

const chartRef = ref<HTMLDivElement>()
const distributionChartRef = ref<HTMLDivElement>()
let chart: echarts.ECharts | null = null
let distributionChart: echarts.ECharts | null = null
let refreshTimer: ReturnType<typeof setInterval> | null = null

const loading = ref(true)
const autoRefresh = ref(false)

const statCards = ref([
  { label: '总用户数', value: 0, icon: User, color: '#0f766e', trend: 12 },
  { label: '活跃用户', value: 0, icon: CircleCheck, color: '#039855', trend: 8 },
  { label: '今日新增', value: 0, icon: TrendCharts, color: '#2563eb', trend: -3 },
  { label: '已禁用', value: 0, icon: Remove, color: '#d92d20', trend: 0 },
])

const funnelMetrics = ref([
  { stage: '邀请成功', count: 10000, percentage: 100, conversion: 0, color: '#0f766e' },
  { stage: '用户注册', count: 8500, percentage: 85, conversion: 15, color: '#14b8a6' },
  { stage: '完成认证', count: 6200, percentage: 62, conversion: 27, color: '#67e8f9' },
  { stage: '完成评估', count: 3100, percentage: 31, conversion: 50, color: '#a5f3fc' },
])

const refreshData = async () => {
  loading.value = true
  try {
    await Promise.all([loadOverview(), loadTrend(), loadDistribution()])
  } finally {
    loading.value = false
  }
}

const toggleRefresh = (): void => {
  autoRefresh.value = !autoRefresh.value
  if (autoRefresh.value) {
    // 每30秒自动刷新一次
    refreshTimer = setInterval(() => {
      refreshData()
    }, 30000)
  } else if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
}

const loadOverview = async () => {
  const data = await statsApi.overview()
  statCards.value[0].value = data.totalUsers
  statCards.value[1].value = data.activeUsers
  statCards.value[2].value = data.todayNewUsers
  statCards.value[3].value = data.disabledUsers
}

const loadTrend = async () => {
  const data = await statsApi.registerTrend()
  if (!chartRef.value) return
  chart = echarts.init(chartRef.value)
  chart.setOption({
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#fff',
      borderColor: '#e5e7eb',
      textStyle: { color: '#111827' },
      extraCssText: 'box-shadow: 0 4px 12px rgba(17, 24, 39, 0.15); border-radius: 8px; padding: 12px 16px;'
    },
    grid: { top: 12, right: 16, bottom: 32, left: 50 },
    xAxis: {
      type: 'category',
      data: data.map(d => d.date),
      axisTick: { show: false },
      axisLine: { lineStyle: { color: '#e5e7eb' } },
      axisLabel: { color: '#8a94a6', fontSize: 12 }
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      splitLine: { lineStyle: { color: '#edf2f7', type: 'dashed' } },
      axisLabel: { color: '#8a94a6', fontSize: 12 }
    },
    series: [{
      data: data.map(d => d.count),
      type: 'line',
      smooth: true,
      symbol: 'circle',
      symbolSize: 6,
      lineStyle: { color: '#0f766e', width: 2.5 },
      itemStyle: { color: '#0f766e', borderColor: '#fff', borderWidth: 2 },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(15, 118, 110, 0.2)' },
          { offset: 1, color: 'rgba(15, 118, 110, 0)' }
        ])
      }
    }]
  })
}

const loadDistribution = async () => {
  const data = await statsApi.overview()
  if (!distributionChartRef.value) return
  distributionChart = echarts.init(distributionChartRef.value)
  distributionChart.setOption({
    tooltip: {
      trigger: 'item',
      backgroundColor: '#fff',
      borderColor: '#e5e7eb',
      textStyle: { color: '#111827' },
      extraCssText: 'box-shadow: 0 4px 12px rgba(17, 24, 39, 0.15); border-radius: 8px; padding: 12px 16px;',
      formatter: '{b}: {c} ({d}%)'
    },
    legend: {
      orient: 'vertical',
      right: 20,
      textStyle: { color: '#8a94a6', fontSize: 12 }
    },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      center: ['40%', '50%'],
      data: [
        { value: data.activeUsers, name: '活跃用户', itemStyle: { color: '#039855' } },
        { value: data.disabledUsers, name: '禁用用户', itemStyle: { color: '#d92d20' } }
      ],
      emphasis: {
        itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0, 0, 0, 0.5)' }
      }
    }]
  })
}

const handleResize = () => {
  chart?.resize()
  distributionChart?.resize()
}

onMounted(async () => {
  loading.value = true
  try {
    await Promise.all([loadOverview(), loadTrend(), loadDistribution()])
  } finally {
    loading.value = false
  }
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  if (refreshTimer) clearInterval(refreshTimer)
  chart?.dispose()
  distributionChart?.dispose()
})
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;

.dashboard {
  &__head {
    margin-bottom: $space-24;
  }

  &__title {
    margin: 0;
    font-size: $font-size-xl;
    font-weight: 800;
    color: $color-text;
    line-height: 1.2;
  }

  &__desc {
    margin: $space-8 0 0;
    color: $color-text-tertiary;
    font-size: $font-size-xs;
    line-height: 1.5;
  }

  &__stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: $space-16;
    margin-bottom: $space-24;
  }

  &__charts {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
    gap: $space-16;
  }
}

.funnel-section {
  margin-bottom: $space-24;
}

.funnel-metrics {
  display: flex;
  flex-direction: column;
  gap: $space-16;
}

.funnel-item {
  display: flex;
  align-items: center;
  gap: $space-16;

  &__stage {
    width: 100px;
    font-size: $font-size-sm;
    font-weight: 600;
    color: $color-text;
    flex-shrink: 0;
  }

  &__bar-wrapper {
    flex: 1;
    height: 32px;
    background: $color-surface-soft;
    border-radius: $radius-md;
    overflow: hidden;
    position: relative;
  }

  &__bar {
    height: 100%;
    background: var(--color);
    border-radius: $radius-md;
    transition: width $transition-base;
    animation: funnelBar 0.8s ease-out;

    @keyframes funnelBar {
      from { width: 0 !important; }
      to { width: var(--width); }
    }
  }

  &__stats {
    display: flex;
    align-items: center;
    gap: $space-12;
    width: 180px;
    flex-shrink: 0;
  }

  &__count {
    font-size: $font-size-sm;
    font-weight: 700;
    color: $color-text;
    min-width: 60px;
  }

  &__percentage {
    font-size: $font-size-xs;
    color: $color-text-tertiary;
    font-weight: 600;
    min-width: 40px;
  }

  &__conversion {
    font-size: $font-size-xs;
    color: $color-danger;
    font-weight: 600;
  }
}

.stat-card {
  background: $color-bg-white;
  border: 1px solid $color-border;
  border-radius: $radius-lg;
  padding: $space-20;
  display: flex;
  align-items: center;
  justify-content: space-between;
  transition: all $transition-base;
  cursor: pointer;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, rgba(255,255,255,0), rgba(255,255,255,0.1));
    pointer-events: none;
  }

  &:hover {
    border-color: var(--accent);
    box-shadow: $shadow-lg;
    transform: translateY(-2px);

    #{&}__icon {
      opacity: 0.2;
      animation: cardFloat 0.6s ease-in-out;
    }
  }

  &__left {
    flex: 1;
    min-width: 0;
    z-index: 1;
  }

  &__value {
    font-size: 32px;
    font-weight: 800;
    color: $color-text;
    line-height: 1;
    margin-bottom: $space-8;
    font-variant-numeric: tabular-nums;
  }

  &__label {
    font-size: $font-size-xs;
    font-weight: 600;
    color: $color-text-tertiary;
    line-height: 1.4;
  }

  &__trend {
    margin-top: $space-8;
    font-size: $font-size-xs;
    font-weight: 600;
    color: $color-danger;
    display: inline-flex;
    align-items: center;
    gap: $space-4;
    animation: slideInLeft 0.4s ease-out;

    &--up {
      color: $color-success;
    }
  }

  &__right {
    margin-left: $space-16;
    flex-shrink: 0;
    z-index: 1;
  }

  &__icon {
    font-size: 48px;
    color: var(--accent);
    opacity: 0.12;
    transition: opacity $transition-base;
  }

  &--primary {
    border-color: color-mix(in srgb, var(--accent) 20%, $color-border);
    background: color-mix(in srgb, var(--accent) 3%, $color-bg-white);

    #{&}__value {
      font-size: 40px;
    }

    #{&}__icon {
      font-size: 56px;
    }
  }

  @keyframes cardFloat {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-2px); }
  }

  @keyframes slideInLeft {
    from {
      opacity: 0;
      transform: translateX(-4px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
}

.chart-card {
  background: $color-bg-white;
  border: 1px solid $color-border;
  border-radius: $radius-lg;
  padding: $space-24;
  transition: all $transition-base;

  &:hover {
    border-color: $color-primary;
    box-shadow: $shadow-md;
  }

  &__header {
    margin-bottom: $space-20;
  }

  &__title {
    margin: 0;
    font-size: $font-size-md;
    font-weight: 700;
    color: $color-text;
    line-height: 1.2;
  }

  &__desc {
    margin: $space-6 0 0;
    font-size: $font-size-xs;
    color: $color-text-tertiary;
    line-height: 1.4;
  }

  &__canvas {
    height: 320px;
    animation: fadeInUp 0.6s ease-out;
  }

  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
}

/* ── 平板端 ── */
@media (max-width: 1200px) {
  .dashboard {
    &__stats {
      grid-template-columns: repeat(2, 1fr);
    }

    &__charts {
      grid-template-columns: 1fr;
    }
  }
}

/* ── 移动端 ── */
@media (max-width: 767px) {
  .dashboard {
    &__stats {
      grid-template-columns: 1fr;
      gap: $space-12;
    }

    &__charts {
      gap: $space-12;
    }
  }

  .stat-card {
    padding: $space-16;

    &__value {
      font-size: 28px;
    }

    &__icon {
      font-size: 40px;
    }

    &--primary &__value {
      font-size: 32px;
    }

    &--primary &__icon {
      font-size: 48px;
    }
  }

  .chart-card {
    padding: $space-16;

    &__canvas {
      height: 260px;
    }
  }

  .funnel-metrics {
    gap: $space-8 !important;
  }

  .funnel-item {
    &__stage {
      font-size: $font-size-xs;
    }

    &__count {
      font-size: 12px;
    }
  }
}
</style>
