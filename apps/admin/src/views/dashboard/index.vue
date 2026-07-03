<template>
  <div class="dashboard">
    <!-- 顶部统计卡片 -->
    <el-row :gutter="16" class="dashboard__stats">
      <el-col :span="6" v-for="card in statCards" :key="card.label">
        <div class="stat-card" :style="{ '--accent': card.color }">
          <div class="stat-card__icon">
            <el-icon><component :is="card.icon" /></el-icon>
          </div>
          <div class="stat-card__body">
            <div class="stat-card__value">{{ card.value }}</div>
            <div class="stat-card__label">{{ card.label }}</div>
          </div>
          <div class="stat-card__bg" />
        </div>
      </el-col>
    </el-row>

    <!-- 折线图 -->
    <div class="dashboard__chart-card">
      <div class="dashboard__chart-header">
        <span class="dashboard__chart-title">近 30 天注册趋势</span>
        <span class="dashboard__chart-sub">用户增长曲线</span>
      </div>
      <div ref="chartRef" class="dashboard__chart-canvas" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import * as echarts from 'echarts'
import { statsApi } from '@/api'

const chartRef = ref<HTMLDivElement>()
let chart: echarts.ECharts | null = null

const statCards = ref([
  { label: '总用户数', value: 0, icon: 'User', color: '#5b5bd6' },
  { label: '活跃用户', value: 0, icon: 'CircleCheck', color: '#07c160' },
  { label: '今日新增', value: 0, icon: 'TrendCharts', color: '#f59e0b' },
  { label: '已禁用', value: 0, icon: 'Remove', color: '#ef4444' },
])

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
    tooltip: { trigger: 'axis', backgroundColor: '#fff', borderColor: '#e5e7eb', textStyle: { color: '#374151' } },
    grid: { top: 20, right: 20, bottom: 30, left: 50 },
    xAxis: { type: 'category', data: data.map(d => d.date), axisLine: { lineStyle: { color: '#e5e7eb' } }, axisLabel: { color: '#9ca3af', fontSize: 12 } },
    yAxis: { type: 'value', axisLine: { show: false }, splitLine: { lineStyle: { color: '#f3f4f6', type: 'dashed' } }, axisLabel: { color: '#9ca3af', fontSize: 12 } },
    series: [{
      data: data.map(d => d.count), type: 'line', smooth: true,
      symbol: 'circle', symbolSize: 6,
      lineStyle: { color: '#5b5bd6', width: 2 },
      itemStyle: { color: '#5b5bd6' },
      areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(91,91,214,0.15)' }, { offset: 1, color: 'rgba(91,91,214,0)' }]) },
    }],
  })
}

const handleResize = () => chart?.resize()

onMounted(async () => {
  await Promise.all([loadOverview(), loadTrend()])
  window.addEventListener('resize', handleResize)
})
onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  chart?.dispose()
})
</script>

<style lang="scss" scoped>
.dashboard {
  &__stats { margin-bottom: 20px; }

  &__chart-card {
    background: #fff;
    border-radius: 12px;
    padding: 24px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  }

  &__chart-header {
    display: flex;
    align-items: baseline;
    gap: 10px;
    margin-bottom: 20px;
  }

  &__chart-title { font-size: 15px; font-weight: 600; color: #1a1a1a; }
  &__chart-sub   { font-size: 13px; color: #9ca3af; }
  &__chart-canvas { height: 340px; }
}

.stat-card {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  display: flex;
  align-items: center;
  gap: 16px;
  position: relative;
  overflow: hidden;
  transition: box-shadow 0.2s;

  &:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.1); }

  &__icon {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    background: color-mix(in srgb, var(--accent) 12%, transparent);
    color: var(--accent);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 22px;
    flex-shrink: 0;
  }

  &__value {
    font-size: 28px;
    font-weight: 700;
    color: #1a1a1a;
    line-height: 1;
    margin-bottom: 4px;
  }

  &__label {
    font-size: 13px;
    color: #6b7280;
  }

  &__bg {
    position: absolute;
    right: -10px;
    bottom: -10px;
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: color-mix(in srgb, var(--accent) 6%, transparent);
    pointer-events: none;
  }
}
</style>
