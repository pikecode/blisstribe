<template>
  <div class="layout">
    <!-- 汉堡按钮（仅移动端） -->
    <button v-if="isMobile" class="layout__hamburger" @click="drawerVisible = true">
      <el-icon><MenuIcon /></el-icon>
    </button>

    <!-- 侧边栏：移动端用drawer，桌面端固定 -->
    <el-drawer
      v-if="isMobile"
      v-model="drawerVisible"
      direction="ltr"
      :size="280"
      :with-header="false"
    >
      <aside class="layout__sidebar layout__sidebar--drawer">
        <div class="layout__brand">
          <span class="layout__brand-icon">B</span>
          <span class="layout__brand-text">
            <span class="layout__brand-name">BlissTribe</span>
            <span class="layout__brand-sub">运营后台</span>
          </span>
        </div>
        <nav class="layout__nav">
          <div v-for="section in menuSections" :key="section.title" class="layout__nav-section">
            <div class="layout__nav-section-title">{{ section.title }}</div>
            <router-link
              v-for="item in section.items"
              :key="item.path"
              :to="item.path"
              class="layout__nav-item"
              :class="{ active: isActiveMenu(item.path) }"
              @click="drawerVisible = false"
            >
              <el-icon class="layout__nav-icon"><component :is="item.icon" /></el-icon>
              <span>{{ item.title }}</span>
            </router-link>
          </div>
        </nav>
      </aside>
    </el-drawer>

    <aside v-else class="layout__sidebar">
      <div class="layout__brand">
        <span class="layout__brand-icon">B</span>
        <span class="layout__brand-text">
          <span class="layout__brand-name">BlissTribe</span>
          <span class="layout__brand-sub">运营后台</span>
        </span>
      </div>
      <nav class="layout__nav">
        <div v-for="section in menuSections" :key="section.title" class="layout__nav-section">
          <div class="layout__nav-section-title">{{ section.title }}</div>
          <router-link
            v-for="item in section.items"
            :key="item.path"
            :to="item.path"
            class="layout__nav-item"
            :class="{ active: isActiveMenu(item.path) }"
          >
            <el-icon class="layout__nav-icon"><component :is="item.icon" /></el-icon>
            <span>{{ item.title }}</span>
          </router-link>
        </div>
      </nav>
    </aside>

    <!-- 主内容区 -->
    <div class="layout__body">
      <header class="layout__header">
        <div class="layout__breadcrumb">
          <h1 class="layout__page-title">{{ route.meta.title || '管理后台' }}</h1>
          <p class="layout__page-desc">{{ currentMenu?.desc || '管理平台业务配置与运营数据' }}</p>
        </div>
        <div class="layout__header-right">
          <el-dropdown>
            <div class="layout__user">
              <div class="layout__user-avatar">
                {{ (authStore.adminInfo?.nickname || 'A').slice(0, 1) }}
              </div>
              <span class="layout__user-name">{{ authStore.adminInfo?.nickname || '管理员' }}</span>
              <el-icon style="font-size: 12px; color: #999"><ArrowDownIcon /></el-icon>
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
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import {
  ArrowDown as ArrowDownIcon,
  CollectionTag,
  DataLine,
  Document,
  EditPen,
  Goods,
  Lock,
  Menu as MenuIcon,
  OfficeBuilding,
  Picture,
  Share,
  SwitchButton,
  Tickets,
  User,
} from '@element-plus/icons-vue'
import type { Component } from 'vue'

interface MenuItem {
  path: string
  title: string
  icon: Component
  desc: string
}

interface MenuSection {
  title: string
  items: MenuItem[]
}

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

// 移动端检测
const windowWidth = ref(window.innerWidth)
const isMobile = computed(() => windowWidth.value < 768)
const drawerVisible = ref(false)

const updateWidth = () => { windowWidth.value = window.innerWidth }
onMounted(() => window.addEventListener('resize', updateWidth))
onUnmounted(() => window.removeEventListener('resize', updateWidth))

const menuSections: MenuSection[] = [
  {
    title: '运营概览',
    items: [
      { path: '/dashboard', title: '数据看板', icon: DataLine, desc: '查看关键增长指标与注册趋势' },
    ],
  },
  {
    title: '用户与增长',
    items: [
      { path: '/users', title: '用户管理', icon: User, desc: '检索用户资料、标签与账号状态' },
      { path: '/invitations', title: '邀请管理', icon: Share, desc: '查看邀请效果、注册记录与关系链路' },
      { path: '/partners', title: '服务伙伴审核', icon: OfficeBuilding, desc: '审核经营主体、客户归属与邀请记录' },
      { path: '/product-leads', title: '咨询线索', icon: Tickets, desc: '查看用户需求并记录线索跟进状态' },
    ],
  },
  {
    title: '产品与推荐',
    items: [
      { path: '/products', title: '产品管理', icon: Goods, desc: '维护产品模块、标签、推荐优先级与上下架' },
      { path: '/assessment-templates', title: '评估管理', icon: EditPen, desc: '维护模块评估题目、选项和标签映射' },
      { path: '/recommendation-rules', title: '推荐规则', icon: CollectionTag, desc: '配置评估标签命中后的产品加权和推荐理由' },
      { path: '/tags', title: '标签字典', icon: CollectionTag, desc: '维护评估、产品和推荐规则共用标签' },
    ],
  },
  {
    title: '内容与系统',
    items: [
      { path: '/banners', title: '首页 Banner', icon: Picture, desc: '维护小程序首页展示资源' },
      { path: '/agreements', title: '协议管理', icon: Document, desc: '维护用户协议和隐私政策版本' },
      { path: '/admins', title: '管理员与权限', icon: Lock, desc: '管理后台账号、角色与权限' },
    ],
  },
]

const menuItems = computed(() => menuSections.flatMap(section => section.items))
const currentMenu = computed(() => menuItems.value.find(item => isActiveMenu(item.path)))

const isActiveMenu = (path: string) => {
  return route.path === path || route.path.startsWith(`${path}/`)
}

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
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.84), rgba(245, 247, 248, 0) 260px),
    $color-bg;
}

/* ── 侧边栏 ── */
.layout__sidebar {
  width: 256px;
  flex-shrink: 0;
  background:
    linear-gradient(180deg, rgba(20, 184, 166, 0.08) 0%, rgba(17, 24, 39, 0) 220px),
    $color-sidebar;
  border-right: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  flex-direction: column;
  color: #fff;
}

.layout__brand {
  height: 76px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 22px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.layout__brand-icon {
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, #0f766e 0%, #14b8a6 100%);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: bold;
  font-size: 16px;
  box-shadow: 0 10px 26px rgba(20, 184, 166, 0.22);
}

.layout__brand-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.layout__brand-name {
  font-size: 16px;
  font-weight: 700;
  color: #fff;
  line-height: 1;
}

.layout__brand-sub {
  font-size: 12px;
  color: $color-sidebar-muted;
}

.layout__nav {
  flex: 1;
  padding: 14px 12px 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  overflow-y: auto;
}

.layout__nav-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.layout__nav-section-title {
  padding: 8px 12px 6px;
  color: rgba(255, 255, 255, 0.42);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  line-height: 1;
}

.layout__nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 14px;
  min-height: 42px;
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.70);
  font-size: 14px;
  text-decoration: none;
  transition: background 0.16s, color 0.16s, transform 0.16s;
}

.layout__nav-item:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
}

.layout__nav-item.active {
  background: rgba(255, 255, 255, 0.96);
  color: $color-primary-dark;
  font-weight: 600;
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.16);
  transform: translateX(2px);
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
  min-height: 82px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(14px);
  border-bottom: 1px solid $color-border;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 30px;
  flex-shrink: 0;
}

.layout__page-title {
  font-size: 20px;
  font-weight: 800;
  color: $color-text;
  margin: 0;
  line-height: 1.2;
}

.layout__page-desc {
  margin: 7px 0 0;
  color: $color-text-tertiary;
  font-size: 13px;
  line-height: 1.3;
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
  padding: 6px 10px 6px 6px;
  border-radius: 8px;
  border: 1px solid transparent;
  transition: background 0.15s, border-color 0.15s;
}

.layout__user:hover {
  background: $color-surface-soft;
  border-color: $color-border;
}

.layout__user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #111827 0%, #0f766e 100%);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
}

.layout__user-name {
  font-size: 14px;
  color: $color-text;
  font-weight: 600;
}

.layout__main {
  flex: 1;
  overflow-y: auto;
  padding: 26px 30px 34px;
  max-width: 1480px;
  width: 100%;
  margin: 0 auto;
}

/* ── 汉堡按钮（移动端） ── */
.layout__hamburger {
  position: fixed;
  top: 12px;
  left: 12px;
  z-index: 2001;
  width: 40px;
  height: 40px;
  border: none;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(28, 25, 23, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: $color-text;
  font-size: 18px;
}

/* drawer内侧边栏填满高度 */
.layout__sidebar--drawer {
  height: 100%;
  width: 280px;
  overflow-y: auto;
}

/* ── 移动端布局 ── */
@media (max-width: 767px) {
  .layout__header {
    min-height: 64px;
    padding: 10px 16px 10px 60px; // 给汉堡按钮留位
  }

  .layout__main {
    padding: 16px;
  }

  .layout__page-title {
    font-size: 15px;
  }

  .layout__page-desc {
    display: none;
  }

  .layout__user-name {
    display: none; // 移动端只显示头像
  }
}
</style>
