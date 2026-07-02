<template>
  <div class="dashboard">
    <el-row :gutter="20" class="dashboard__cards">
      <el-col :span="6" v-for="card in cards" :key="card.label">
        <el-card>
          <div class="dashboard__card-label">{{ card.label }}</div>
          <div class="dashboard__card-value">{{ card.value }}</div>
        </el-card>
      </el-col>
    </el-row>

    <el-card class="dashboard__chart">
      <template #header>近 30 天注册趋势</template>
      <div ref="chartRef" class="dashboard__chart-canvas" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import * as echarts from 'echarts'
import { statsApi } from '@/api'

const chartRef = ref<HTMLDivElement>()
let chart: echarts.ECharts | null = null

const cards = ref([
  { label: '总用户数', value: 0 },
  { label: '活跃用户', value: 0 },
  { label: '今日新增', value: 0 },
  { label: '已禁用', value: 0 },
])

const loadOverview = async (): Promise<void> => {
  const data = await statsApi.overview()
  cards.value[0].value = data.totalUsers
  cards.value[1].value = data.activeUsers
  cards.value[2].value = data.todayNewUsers
  cards.value[3].value = data.disabledUsers
}

const loadTrend = async (): Promise<void> => {
  const data = await statsApi.registerTrend()
  if (!chartRef.value) return
  chart = echarts.init(chartRef.value)
  chart.setOption({
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: data.map((d) => d.date) },
    yAxis: { type: 'value' },
    series: [{ data: data.map((d) => d.count), type: 'line', smooth: true, areaStyle: {} }],
  })
}

const handleResize = (): void => {
  chart?.resize()
}

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
  &__cards {
    margin-bottom: 20px;
  }

  &__card-label {
    color: #999;
    font-size: 14px;
  }

  &__card-value {
    font-size: 28px;
    font-weight: bold;
    margin-top: 8px;
    color: #07c160;
  }

  &__chart-canvas {
    height: 360px;
  }
}
</style>
