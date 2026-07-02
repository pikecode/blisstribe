<script setup lang="ts">
import { onLaunch } from '@dcloudio/uni-app'
import { useAuthStore } from '@/stores/modules/auth'
import { useUserStore } from '@/stores/modules/user'

onLaunch(() => {
  // 启动态恢复登录信息
  const authStore = useAuthStore()
  const userStore = useUserStore()
  authStore.init()
  userStore.init()
})
</script>

<style lang="scss">
@use '@/styles/global.scss';
</style>
