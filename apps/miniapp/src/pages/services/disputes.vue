<template>
  <view class="list"><view class="intro"><text class="title">服务异议</text><text class="muted">查看反馈、处理方案和独立复核进度</text></view><view v-for="row in rows" :key="row.id" class="card" @tap="open(row.id)"><view class="head"><text>{{ row.itemName }}</text><text class="status">{{ statusText(row.status) }}</text></view><text class="muted">{{ row.institutionName }} · {{ row.ownerName || '等待客服受理' }}</text><text class="description">{{ row.description }}</text><text v-if="row.deadline" class="muted">反馈期限 {{ new Date(row.deadline).toLocaleString('zh-CN', { hour12: false }) }}</text></view><view v-if="error" class="empty" @tap="load(true)">加载失败，点击重试</view><view v-else-if="!rows.length && !loading" class="empty">暂无服务异议</view><button v-if="rows.length < total && !error" class="more" :disabled="loading" @tap="load(false)">{{ loading ? '加载中...' : '查看更多' }}</button></view>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { serviceProgramApi, type ServiceDispute } from '@/api/modules/service-program'
const planId = ref(0), rows = ref<ServiceDispute[]>([]), page = ref(1), total = ref(0), loading = ref(false), error = ref(false)
async function load(reset = true) { if (loading.value) return; loading.value = true; error.value = false; const targetPage = reset ? 1 : page.value + 1; try { const result = await serviceProgramApi.disputes({ planId: planId.value || undefined, page: targetPage }); rows.value = reset ? result.list : [...rows.value, ...result.list]; page.value = targetPage; total.value = result.total } catch { error.value = true } finally { loading.value = false } }
function open(id: number) { uni.navigateTo({ url: `/pages/services/dispute-detail?id=${id}` }) }
function statusText(value: string) { return ({ submitted: '待受理', evidence_pending: '等待依据', processing: '处理中', proposed: '待我确认', review_requested: '复核中', review_proposed: '待我确认复核', disputed: '继续协调', awaiting_rebooking: '等待新预约', executing: '退费执行中', resolved: '已结案' } as Record<string,string>)[value] || value }
onLoad(options => { planId.value = Number(options?.planId) || 0 })
onShow(() => { void load() })
</script>
<style scoped>
.list { min-height:100vh; padding:28rpx 24rpx; background:var(--color-bg); }.intro { padding:8rpx 4rpx 22rpx; }.title { display:block; font-size:36rpx; font-weight:750; }.card { padding:28rpx; margin-bottom:18rpx; border-radius:20rpx; background:#fff; }.head { display:flex; justify-content:space-between; gap:18rpx; font-size:27rpx; font-weight:650; }.status { flex-shrink:0; color:var(--color-primary); font-size:23rpx; }.muted { display:block; margin-top:12rpx; color:var(--color-text-secondary); font-size:23rpx; line-height:1.6; }.description { display:block; margin-top:16rpx; font-size:25rpx; color:var(--color-text); overflow-wrap:anywhere; }.empty { padding:120rpx 0; text-align:center; color:var(--color-text-secondary); font-size:25rpx; }.more { background:#fff; font-size:25rpx; color:var(--color-primary); }
</style>
