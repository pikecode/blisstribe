<template>
  <div class="analytics-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <div>
            <div class="card-header__title">推荐效果</div>
            <div class="card-header__desc">查看产品推荐从曝光、点击到线索的转化闭环</div>
          </div>
          <el-button @click="loadAnalytics">刷新</el-button>
        </div>
      </template>

      <div class="page-toolbar">
        <el-select v-model="filters.moduleId" placeholder="全部模块" clearable style="width: 170px">
          <el-option v-for="item in modules" :key="item.id" :label="item.name" :value="item.id" />
        </el-select>
        <el-select v-model="filters.productType" placeholder="全部产品形式" clearable style="width: 160px">
          <el-option label="服务产品" value="service" />
          <el-option label="实物产品" value="physical" />
          <el-option label="组合方案" value="package" />
        </el-select>
        <el-select v-model="filters.recommendationForm" placeholder="全部推荐形式" clearable style="width: 180px">
          <el-option v-for="item in recommendationForms" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          value-format="YYYY-MM-DD"
          style="width: 260px"
        />
        <el-button type="primary" @click="handleSearch">筛选</el-button>
        <el-button @click="resetSearch">重置</el-button>
      </div>

      <div class="metric-grid" v-loading="loading">
        <div v-for="item in metrics" :key="item.label" class="metric-item">
          <div class="metric-item__label">{{ item.label }}</div>
          <div class="metric-item__value">{{ item.value }}</div>
          <div class="metric-item__desc">{{ item.desc }}</div>
        </div>
      </div>

      <div class="section-title">产品转化排行</div>
      <el-table :data="analytics.productStats" v-loading="loading" stripe>
        <el-table-column label="产品" min-width="220">
          <template #default="{ row }">
            <div class="product-title">{{ row.product?.title || `产品 #${row.productId}` }}</div>
            <div class="muted">{{ row.product?.module?.name || '-' }}</div>
          </template>
        </el-table-column>
        <el-table-column label="形式" width="110">
          <template #default="{ row }">{{ productTypeText(row.product?.productType) }}</template>
        </el-table-column>
        <el-table-column prop="impressions" label="曝光" width="100" sortable />
        <el-table-column prop="clicks" label="点击" width="100" sortable />
        <el-table-column prop="assessments" label="评估" width="100" sortable />
        <el-table-column prop="leads" label="线索" width="100" sortable />
        <el-table-column label="点击率" width="110" sortable prop="clickRate">
          <template #default="{ row }">{{ row.clickRate }}%</template>
        </el-table-column>
        <el-table-column label="线索率" width="110" sortable prop="leadRate">
          <template #default="{ row }">{{ row.leadRate }}%</template>
        </el-table-column>
      </el-table>

      <div class="section-title">每日趋势</div>
      <el-table :data="analytics.trend" v-loading="loading" stripe>
        <el-table-column prop="date" label="日期" min-width="140" />
        <el-table-column prop="impressions" label="曝光" />
        <el-table-column prop="clicks" label="点击" />
        <el-table-column prop="assessments" label="评估" />
        <el-table-column prop="leads" label="线索" />
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { productApi, productTypeText, type ProductModule, type RecommendationAnalytics } from '@/api/product'

const emptyAnalytics = (): RecommendationAnalytics => ({
  overview: {
    impressions: 0,
    clicks: 0,
    assessments: 0,
    leads: 0,
    clickRate: 0,
    leadRate: 0,
  },
  productStats: [],
  trend: [],
})

const recommendationForms = [
  { label: '模块推荐', value: 'module_featured' },
  { label: '评估结果', value: 'assessment_result' },
  { label: '个人建议', value: 'profile_suggestion' },
  { label: '顾问推荐', value: 'consultant_recommendation' },
  { label: '活动推荐', value: 'campaign_recommendation' },
  { label: '组合方案', value: 'bundle_solution' },
]

const loading = ref(false)
const modules = ref<ProductModule[]>([])
const analytics = ref<RecommendationAnalytics>(emptyAnalytics())
const dateRange = ref<[string, string] | ''>('')
const filters = reactive<{
  moduleId: number | ''
  productType: '' | 'service' | 'physical' | 'package'
  recommendationForm: string
}>({
  moduleId: '',
  productType: '',
  recommendationForm: '',
})

const metrics = computed(() => [
  { label: '曝光', value: analytics.value.overview.impressions, desc: '推荐被用户看到的次数' },
  { label: '点击', value: analytics.value.overview.clicks, desc: '用户进入产品详情的次数' },
  { label: '评估', value: analytics.value.overview.assessments, desc: '用户完成需求评估的次数' },
  { label: '线索', value: analytics.value.overview.leads, desc: '用户提交咨询意向的次数' },
  { label: '点击率', value: `${analytics.value.overview.clickRate}%`, desc: '点击 / 曝光' },
  { label: '线索率', value: `${analytics.value.overview.leadRate}%`, desc: '线索 / 点击' },
])

async function loadModules() {
  modules.value = await productApi.listModules()
}

async function loadAnalytics() {
  loading.value = true
  try {
    analytics.value = await productApi.analytics({
      moduleId: filters.moduleId,
      productType: filters.productType,
      recommendationForm: filters.recommendationForm,
      startDate: dateRange.value ? dateRange.value[0] : undefined,
      endDate: dateRange.value ? dateRange.value[1] : undefined,
    })
  } catch {
    ElMessage.error('推荐效果加载失败')
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  loadAnalytics()
}

function resetSearch() {
  filters.moduleId = ''
  filters.productType = ''
  filters.recommendationForm = ''
  dateRange.value = ''
  loadAnalytics()
}

onMounted(async () => {
  await loadModules()
  await loadAnalytics()
})
</script>

<style scoped>
.analytics-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.card-header__title {
  color: #1f2937;
  font-size: 18px;
  font-weight: 700;
}

.card-header__desc {
  margin-top: 4px;
  color: #6b7280;
  font-size: 13px;
}

.page-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-bottom: 18px;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 22px;
}

.metric-item {
  min-height: 96px;
  padding: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f9fafb;
}

.metric-item__label {
  color: #6b7280;
  font-size: 13px;
}

.metric-item__value {
  margin-top: 8px;
  color: #111827;
  font-size: 26px;
  font-weight: 700;
  line-height: 1.1;
}

.metric-item__desc {
  margin-top: 8px;
  color: #9ca3af;
  font-size: 12px;
}

.section-title {
  margin: 22px 0 12px;
  color: #1f2937;
  font-size: 15px;
  font-weight: 700;
}

.product-title {
  color: #1f2937;
  font-weight: 600;
}

.muted {
  margin-top: 4px;
  color: #8a94a6;
  font-size: 12px;
}

@media (max-width: 1280px) {
  .metric-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>
