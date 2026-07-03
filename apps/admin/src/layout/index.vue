<template>
  <div class="layout">
    <!-- 侧边栏 -->
    <aside class="layout__sidebar">
      <div class="layout__brand">
        <span class="layout__brand-icon">B</span>
        <span class="layout__brand-name">BlissTribe</span>
      </div>
      <nav class="layout__nav">
        <router-link
          v-for="item in menuItems"
          :key="item.path"
          :to="item.path"
          class="layout__nav-item"
          :class="{ active: route.path.startsWith(item.path) }"
        >
          <el-icon class="layout__nav-icon"><component :is="item.icon" /></el-icon>
          <span>{{ item.title }}</span>
        </router-link>
      </nav>
    </aside>

    <!-- 主内容区 -->
    <div class="layout__body">
      <header class="layout__header">
        <div class="layout__breadcrumb">
          <h1 class="layout__page-title">{{ route.meta.title || '管理后台' }}</h1>
        </div>
        <div class="layout__header-right">
          <el-dropdown>
            <div class="layout__user">
              <div class="layout__user-avatar">
                {{ (authStore.adminInfo?.nickname || 'A').slice(0, 1) }}
              </div>
              <span class="layout__user-name">{{ authStore.adminInfo?.nickname || '管理员' }}</span>
              <el-icon style="font-size: 12px; color: #999"><ArrowDown /></el-icon>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="handleLogout">
                  <el-icon><SwitchButton /></el-icon> 退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </header>

      <main class="layout__main">
        <RouterView />
      </main>
    </div>
  </div>
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
  { path: '/agreements', title: '协议管理', icon: 'Document' },
]

const handleLogout = () => {
  authStore.clear()
  router.replace('/login')
}
</script>

<style scoped lang="scss">
@use '@/styles/variables.scss' as *;

.layout {
  display: flex;
  height: 100vh;
  background: $color-bg;
}

/* ── 侧边栏 ── */
.layout__sidebar {
  width: 220px;
  flex-shrink: 0;
  background: #fff;
  border-right: 1px solid $color-border;
  display: flex;
  flex-direction: column;
}

.layout__brand {
  height: 60px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 20px;
  border-bottom: 1px solid $color-border;
}

.layout__brand-icon {
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, #d97706 0%, #fbbf24 100%);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: bold;
  font-size: 16px;
}

.layout__brand-name {
  font-size: 16px;
  font-weight: 600;
  color: $color-text;
}

.layout__nav {
  flex: 1;
  padding: 12px 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow-y: auto;
}

.layout__nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  min-height: 44px;
  border-radius: 8px;
  color: $color-text-secondary;
  font-size: 14px;
  text-decoration: none;
  transition: all 0.15s;
}

.layout__nav-item:hover {
  background: #fef9f0;
  color: $color-text;
}

.layout__nav-item.active {
  background: #fff7ed;
  color: $color-primary;
  font-weight: 600;
  box-shadow: inset 3px 0 0 $color-primary;
  padding-left: 11px;
}

.layout__nav-icon {
  font-size: 16px;
  flex-shrink: 0;
}

/* ── 主区域 ── */
.layout__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.layout__header {
  height: 60px;
  background: #fff;
  border-bottom: 1px solid $color-border;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  flex-shrink: 0;
}

.layout__page-title {
  font-size: 16px;
  font-weight: 600;
  color: $color-text;
  margin: 0;
}

.layout__header-right {
  display: flex;
  align-items: center;
}

.layout__user {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 6px 10px;
  border-radius: 8px;
  transition: background 0.15s;
}

.layout__user:hover {
  background: #fef9f0;
}

.layout__user-avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: linear-gradient(135deg, #d97706 0%, #fbbf24 100%);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
}

.layout__user-name {
  font-size: 14px;
  color: #333;
}

.layout__main {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  max-width: 1280px;
  width: 100%;
  margin: 0 auto;
}
</style>


