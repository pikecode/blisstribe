<template>
  <view class="notices">
    <view v-if="loading" class="state">消息加载中...</view>
    <view v-else-if="error" class="state"><text>消息加载失败</text><button @tap="load">重新加载</button></view>
    <view v-else-if="!notices.length" class="state">暂无服务消息</view>
    <view v-for="notice in notices" :key="notice.id" class="card" @tap="open(notice)">
      <view class="head"><text class="title">{{ notice.title }}</text><text v-if="!notice.readAt" class="unread">未读</text></view>
      <text class="detail">{{ notice.detail }}</text><text class="time">{{ new Date(notice.createdAt).toLocaleString('zh-CN', { hour12: false }) }}</text>
    </view>
  </view>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import { serviceProgramApi, type ServiceNotice } from '@/api/modules/service-program'
const notices = ref<ServiceNotice[]>([])
const loading = ref(true)
const error = ref(false)
async function load() { loading.value = true; error.value = false; try { notices.value = await serviceProgramApi.notices() } catch { error.value = true } finally { loading.value = false; uni.stopPullDownRefresh() } }
async function open(notice: ServiceNotice) { try { await serviceProgramApi.readNotice(notice.id); uni.navigateTo({ url: notice.path }) } catch { /* 请求层提示失败 */ } }
onShow(() => { void load() })
onPullDownRefresh(() => { void load() })
</script>
<style scoped>
.notices { min-height:100vh; padding:24rpx; background:var(--color-bg); }
.state { padding:180rpx 0; text-align:center; color:var(--color-text-secondary); }
.card { padding:28rpx; margin-bottom:18rpx; background:white; border-radius:20rpx; box-shadow:var(--shadow-sm); }
.head { display:flex; justify-content:space-between; gap:20rpx; }.title { font-size:28rpx; font-weight:700; color:var(--color-text); }.unread { color:var(--color-primary); font-size:21rpx; }
.detail,.time { display:block; margin-top:12rpx; font-size:24rpx; line-height:36rpx; color:var(--color-text-secondary); }.time { font-size:20rpx; color:var(--color-text-tertiary); }
</style>
