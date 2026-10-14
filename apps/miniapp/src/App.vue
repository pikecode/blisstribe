<script setup lang="ts">
import { onLaunch, onShow } from '@dcloudio/uni-app'
import { restoreSession } from '@/api/request'
import { useAuthStore } from '@/stores/modules/auth'
import { useUserStore } from '@/stores/modules/user'

onLaunch(() => {
  // 启动态恢复登录信息
  const authStore = useAuthStore()
  const userStore = useUserStore()
  authStore.init()
  userStore.init()
  void restoreSession().catch(() => {})
})
// 回到前台时重读缓存，使过期的访问令牌触发自动续期。
onShow(() => {
  useAuthStore().init()
  void restoreSession().catch(() => {})
})
</script>

<style lang="scss">
@use '@/styles/global.scss';
</style>
