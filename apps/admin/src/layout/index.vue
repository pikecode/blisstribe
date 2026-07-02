<template>
  <el-container class="layout">
    <el-aside width="220px" class="layout__aside">
      <div class="layout__logo">BlissTribe</div>
      <el-menu
        :default-active="route.path"
        router
        background-color="#001529"
        text-color="#ffffffcc"
        active-text-color="#07c160"
      >
        <el-menu-item v-for="item in menuItems" :key="item.path" :index="item.path">
          <el-icon><component :is="item.icon" /></el-icon>
          <span>{{ item.title }}</span>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <el-container>
      <el-header class="layout__header">
        <span class="layout__title">{{ route.meta.title || '管理后台' }}</span>
        <el-dropdown>
          <span class="layout__user">
            {{ authStore.adminInfo?.nickname || '管理员' }}
            <el-icon><ArrowDown /></el-icon>
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item @click="handleLogout">退出登录</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </el-header>
      <el-main class="layout__main">
        <RouterView />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const menuItems = [
  { path: '/dashboard', title: '数据看板', icon: 'DataLine' },
  { path: '/users', title: '用户管理', icon: 'User' },
  { path: '/invitations', title: '邀请管理', icon: 'Share' },
  { path: '/banners', title: 'Banner管理', icon: 'Picture' },
  { path: '/admins', title: '管理员与权限', icon: 'Lock' },
  { path: '/agreements', title: '协议版本管理', icon: 'Document' },
]

const handleLogout = async (): Promise<void> => {
  authStore.clear()
  router.replace('/login')
}
</script>

<style lang="scss" scoped>
.layout {
  height: 100vh;

  &__aside {
    background-color: #001529;
    overflow: hidden;
  }

  &__logo {
    height: 60px;
    line-height: 60px;
    text-align: center;
    color: #fff;
    font-size: 20px;
    font-weight: bold;
  }

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background-color: #fff;
    border-bottom: 1px solid #eee;
  }

  &__title {
    font-size: 18px;
    font-weight: 500;
  }

  &__user {
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 4px;
  }

  &__main {
    background-color: #f5f5f5;
    padding: 24px;
  }
}

:deep(.el-menu) {
  border-right: none;
}
</style>
