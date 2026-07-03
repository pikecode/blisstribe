<template>
  <div class="dashboard">
    <!-- 顶部统计卡片 -->
    <el-row :gutter="16" class="dashboard__stats">
      <el-col :span="9">
        <div class="stat-card stat-card--primary" :style="{ '--accent': statCards[0].color }">
          <div class="stat-card__bar" />
          <div class="stat-card__meta">
            <div class="stat-card__value">{{ statCards[0].value.toLocaleString('zh-CN') }}</div>
            <div class="stat-card__label">{{ statCards[0].label }}</div>
          </div>
          <el-icon class="stat-card__glyph"><component :is="statCards[0].icon" /></el-icon>
        </div>
      </el-col>
      <el-col :span="5" v-for="card in statCards.slice(1)" :key="card.label">
        <div class="stat-card" :style="{ '--accent': card.color }">
          <div class="stat-card__bar" />
          <div class="stat-card__meta">
            <div class="stat-card__value">{{ card.value.toLocaleString('zh-CN') }}</div>
            <div class="stat-card__label">{{ card.label }}</div>
          </div>
          <el-icon class="stat-card__glyph"><component :is="card.icon" /></el-icon>
        </div>
      </el-col>
    </el-row>

    <!-- 折线图 -->
    <div class="dashboard__chart-card">
      <div class="dashboard__chart-header">
        <div>
          <div class="dashboard__chart-title">注册趋势</div>
          <div class="dashboard__chart-sub">近 30 天用户增长曲线</div>
        </div>
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
  { label: '总用户数', value: 0, icon: 'User', color: '#d97706' },
  { label: '活跃用户', value: 0, icon: 'CircleCheck', color: '#16a34a' },
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
    tooltip: { trigger: 'axis', backgroundColor: '#fff', borderColor: '#e7e5e4', textStyle: { color: '#1c1917' } },
    grid: { top: 20, right: 20, bottom: 30, left: 50 },
    xAxis: { type: 'category', data: data.map(d => d.date), axisLine: { lineStyle: { color: '#e7e5e4' } }, axisLabel: { color: '#a8a29e', fontSize: 12 } },
    yAxis: { type: 'value', axisLine: { show: false }, splitLine: { lineStyle: { color: '#f0ece6', type: 'dashed' } }, axisLabel: { color: '#a8a29e', fontSize: 12 } },
    series: [{
      data: data.map(d => d.count), type: 'line', smooth: true,
      symbol: 'circle', symbolSize: 6,
      lineStyle: { color: '#d97706', width: 2 },
      itemStyle: { color: '#d97706' },
      areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(217,119,6,0.15)' }, { offset: 1, color: 'rgba(217,119,6,0)' }]) },
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
    padding: 28px 24px 20px;
    border: 1px solid #ede9e4;
  }

  &__chart-header {
    margin-bottom: 20px;
  }

  &__chart-title {
    font-size: 15px;
    font-weight: 700;
    color: #1c1917;
    letter-spacing: 0.01em;
  }

  &__chart-sub {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #a8a29e;
    margin-top: 2px;
  }

  &__chart-canvas { height: 340px; }
}

.stat-card {
  background: #fffdf9;
  border-radius: 10px;
  padding: 20px 20px 20px 24px;
  border: 1px solid #ede9e4;
  display: flex;
  align-items: center;
  gap: 12px;
  position: relative;
  overflow: hidden;
  transition: box-shadow 0.2s, border-color 0.2s;
  height: 100%;

  &:hover {
    box-shadow: 0 4px 20px rgba(217, 119, 6, 0.1);
    border-color: color-mix(in srgb, var(--accent) 40%, #ede9e4);
  }

  &__bar {
    position: absolute;
    left: 0;
    top: 12px;
    bottom: 12px;
    width: 3px;
    background: var(--accent);
    border-radius: 0 2px 2px 0;
  }

  &__meta {
    flex: 1;
    min-width: 0;
  }

  &__value {
    font-size: 32px;
    font-weight: 800;
    color: #1c1917;
    line-height: 1;
    margin-bottom: 6px;
    font-variant-numeric: tabular-nums;
  }

  &__label {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #a8a29e;
  }

  &__glyph {
    font-size: 36px;
    color: var(--accent);
    opacity: 0.12;
    flex-shrink: 0;
    transition: opacity 0.2s;
  }

  &:hover &__glyph { opacity: 0.22; }

  &--primary &__value {
    font-size: 40px;
  }

  &--primary &__glyph {
    font-size: 48px;
  }
}
</style>
