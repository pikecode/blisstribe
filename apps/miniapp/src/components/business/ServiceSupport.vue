<template>
  <view class="support">
    <text class="title">需要帮助？</text><text class="description">可携带服务信息联系在线客服，暂未回复时请留言。</text>
    <button open-type="contact" :session-from="sessionFrom" :show-message-card="true" :send-message-title="title" :send-message-path="path" send-message-img="/static/logo.png" @error="contactError">在线客服</button>
    <button class="copy" @tap="copy">复制咨询信息</button>
  </view>
</template>
<script setup lang="ts">
const props = defineProps<{ title: string; path: string; sessionFrom: string; information: string }>()
function contactError() { uni.showToast({ title: '暂时无法打开客服，可复制咨询信息', icon: 'none' }) }
function copy() { uni.setClipboardData({ data: props.information }) }
</script>
<style scoped>
.support { margin-top:20rpx; padding:28rpx; border-radius:20rpx; background:white; }.title { display:block; font-size:27rpx; font-weight:700; }.description { display:block; margin-top:8rpx; color:var(--color-text-secondary); font-size:22rpx; line-height:34rpx; }.support button { height:78rpx; margin-top:18rpx; border-radius:999rpx; color:var(--color-primary); background:var(--color-primary-soft); font-size:25rpx; }.support .copy { border:1rpx solid var(--color-border); background:white; color:var(--color-text-secondary); }
</style>
