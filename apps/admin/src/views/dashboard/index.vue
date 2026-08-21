<template>
  <div class="dashboard">
    <div class="dashboard__section-head">
      <div>
        <div class="dashboard__eyebrow">OVERVIEW</div>
        <h2 class="dashboard__title">核心运营指标</h2>
      </div>
    </div>

    <!-- 顶部统计卡片 -->
    <div class="dashboard__stats">
      <div
        v-for="(card, index) in statCards"
        :key="card.label"
        class="stat-card"
        :class="{ 'stat-card--primary': index === 0 }"
        :style="{ '--accent': card.color }"
      >
        <div class="stat-card__bar" />
        <div class="stat-card__meta">
          <div class="stat-card__value">{{ card.value.toLocaleString('zh-CN') }}</div>
          <div class="stat-card__label">{{ card.label }}</div>
        </div>
        <el-icon class="stat-card__glyph"><component :is="card.icon" /></el-icon>
      </div>
    </div>

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
import { CircleCheck, Remove, TrendCharts, User } from '@element-plus/icons-vue'

const chartRef = ref<HTMLDivElement>()
let chart: echarts.ECharts | null = null

const statCards = ref([
  { label: '总用户数', value: 0, icon: User, color: '#c26a11' },
  { label: '活跃用户', value: 0, icon: CircleCheck, color: '#039855' },
  { label: '今日新增', value: 0, icon: TrendCharts, color: '#1570ef' },
  { label: '已禁用', value: 0, icon: Remove, color: '#d92d20' },
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
    tooltip: { trigger: 'axis', backgroundColor: '#fff', borderColor: '#e4dfd8', textStyle: { color: '#171412' }, extraCssText: 'box-shadow: 0 8px 30px rgba(23,20,18,.12); border-radius: 8px;' },
    grid: { top: 20, right: 20, bottom: 30, left: 48 },
    xAxis: { type: 'category', data: data.map(d => d.date), axisTick: { show: false }, axisLine: { lineStyle: { color: '#e4dfd8' } }, axisLabel: { color: '#8f8981', fontSize: 12 } },
    yAxis: { type: 'value', axisLine: { show: false }, splitLine: { lineStyle: { color: '#ece7df', type: 'dashed' } }, axisLabel: { color: '#8f8981', fontSize: 12 } },
    series: [{
      data: data.map(d => d.count), type: 'line', smooth: true,
      symbol: 'circle', symbolSize: 6,
      lineStyle: { color: '#c26a11', width: 2 },
      itemStyle: { color: '#c26a11' },
      areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(194,106,17,0.16)' }, { offset: 1, color: 'rgba(194,106,17,0)' }]) },
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
  &__section-head {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    margin-bottom: 14px;
  }

  &__eyebrow {
    color: #8f8981;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.12em;
  }

  &__title {
    margin: 4px 0 0;
    font-size: 18px;
    color: #171412;
    line-height: 1.2;
  }

  &__stats {
    display: grid;
    grid-template-columns: minmax(280px, 1.4fr) repeat(3, minmax(180px, 1fr));
    gap: 16px;
    margin-bottom: 20px;
  }

  &__chart-card {
    background: #fff;
    border-radius: 12px;
    padding: 24px 24px 18px;
    border: 1px solid #e4dfd8;
    box-shadow: 0 1px 2px rgba(23, 20, 18, 0.04);
  }

  &__chart-header {
    margin-bottom: 20px;
  }

  &__chart-title {
    font-size: 15px;
    font-weight: 700;
    color: #171412;
  }

  &__chart-sub {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #8f8981;
    margin-top: 2px;
  }

  &__chart-canvas { height: 340px; }
}

.stat-card {
  background: #fff;
  border-radius: 12px;
  padding: 20px 18px 20px 22px;
  border: 1px solid #e4dfd8;
  display: flex;
  align-items: center;
  gap: 12px;
  position: relative;
  overflow: hidden;
  transition: box-shadow 0.2s, border-color 0.2s, transform 0.2s;
  min-height: 118px;

  &:hover {
    box-shadow: 0 10px 28px rgba(23, 20, 18, 0.08);
    border-color: color-mix(in srgb, var(--accent) 36%, #e4dfd8);
    transform: translateY(-1px);
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
    color: #171412;
    line-height: 1;
    margin-bottom: 6px;
    font-variant-numeric: tabular-nums;
  }

  &__label {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #8f8981;
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

@media (max-width: 1100px) {
  .dashboard__stats {
    grid-template-columns: repeat(2, minmax(220px, 1fr));
  }
}

@media (max-width: 767px) {
  .dashboard__stats {
    grid-template-columns: 1fr;
  }
}
</style>
