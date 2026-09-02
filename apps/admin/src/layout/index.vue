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
      aria-label="导航菜单"
    >
      <aside class="layout__sidebar layout__sidebar--drawer" role="navigation" aria-label="主导航菜单">
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
          <!-- 面包屑导航 -->
          <div class="breadcrumb" v-if="breadcrumbs.length">
            <router-link v-for="(crumb, i) in breadcrumbs" :key="crumb.path" :to="crumb.path" class="breadcrumb__item">
              {{ crumb.title }}
            </router-link>
          </div>

          <!-- 页面标题自动从菜单项获取 -->
          <h1 class="layout__page-title">{{ currentMenu?.title || '管理后台' }}</h1>
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
  Calendar,
  CollectionTag,
  DataLine,
  Document,
  EditPen,
  Goods,
  Lock,
  Location,
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

// 深色模式状态
const isDarkMode = ref(false)

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
      { path: '/activities', title: '活动管理', icon: Calendar, desc: '维护活动内容、报名时间、名额和关联产品' },
      { path: '/venues', title: '场地管理', icon: Location, desc: '维护活动场地、图片、可用时间和不可用时间' },
      { path: '/activity-registrations', title: '活动报名', icon: Tickets, desc: '查看报名用户、来源归属和现场确认状态' },
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

const breadcrumbs = computed(() => {
  const items: Array<{ title: string; path: string }> = []
  const current = menuItems.value.find(item => isActiveMenu(item.path))

  if (current && current.path !== '/dashboard') {
    const section = menuSections.find(s => s.items.includes(current as any))
    if (section) {
      items.push({ title: '管理后台', path: '/dashboard' })
      items.push({ title: section.title, path: current.path })
    }
  }

  return items
})

const isActiveMenu = (path: string) => {
  return route.path === path || route.path.startsWith(`${path}/`)
}

const handleLogout = () => {
  authStore.clear()
  router.replace('/login')
}

// 深色模式切换
const toggleDarkMode = (): void => {
  isDarkMode.value = !isDarkMode.value
  if (isDarkMode.value) {
    document.documentElement.setAttribute('data-theme', 'dark')
    localStorage.setItem('theme', 'dark')
  } else {
    document.documentElement.removeAttribute('data-theme')
    localStorage.setItem('theme', 'light')
  }
}

// 初始化深色模式
const initDarkMode = (): void => {
  const savedTheme = localStorage.getItem('theme')
  if (savedTheme === 'dark') {
    isDarkMode.value = true
    document.documentElement.setAttribute('data-theme', 'dark')
  } else if (window.matchMedia('(prefers-color-scheme: dark)').matches && !savedTheme) {
    isDarkMode.value = true
    document.documentElement.setAttribute('data-theme', 'dark')
  }
}

onMounted(() => {
  initDarkMode()
  window.addEventListener('resize', updateWidth)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateWidth)
})
</script>

<style scoped lang="scss">
@use '@/styles/variables.scss' as *;

.layout {
  display: flex;
  height: 100vh;
  @include bg-scheme($color-bg, $dark-color-bg);
}

/* ── 侧边栏 ── */
.layout__sidebar {
  width: 256px;
  flex-shrink: 0;
  background:
    linear-gradient(180deg, rgba(20, 184, 166, 0.08) 0%, rgba(17, 24, 39, 0) 220px),
    $color-sidebar;
  @include dark-mode {
    background:
      linear-gradient(180deg, rgba(20, 184, 166, 0.08) 0%, rgba(15, 23, 42, 0) 220px),
      $dark-color-sidebar;
  }
  border-right: 1px solid rgba(255, 255, 255, 0.06);
  @include dark-mode {
    border-right-color: rgba(255, 255, 255, 0.1);
  }
  display: flex;
  flex-direction: column;
  color: #fff;
  transition: width $transition-base;
}

.layout__brand {
  height: $space-32 + $space-20;
  display: flex;
  align-items: center;
  gap: $space-12;
  padding: 0 $space-20;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.layout__brand-icon {
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, $color-primary 0%, $color-primary-light 100%);
  border-radius: $radius-md;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 700;
  font-size: 16px;
  box-shadow: $shadow-lg;
  flex-shrink: 0;
}

.layout__brand-text {
  display: flex;
  flex-direction: column;
  gap: $space-2;
  min-width: 0;
}

.layout__brand-name {
  font-size: $font-size-md;
  font-weight: 700;
  color: #fff;
  line-height: 1;
}

.layout__brand-sub {
  font-size: $font-size-xs;
  color: $color-sidebar-muted;
  line-height: 1;
}

.layout__nav {
  flex: 1;
  padding: $space-14 $space-12 $space-18;
  display: flex;
  flex-direction: column;
  gap: $space-12;
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 3px;

    &:hover {
      background: rgba(255, 255, 255, 0.3);
    }
  }
}

.layout__nav-section {
  display: flex;
  flex-direction: column;
  gap: $space-4;
}

.layout__nav-section-title {
  padding: $space-8 $space-12 $space-6;
  color: rgba(255, 255, 255, 0.42);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  line-height: 1;
}

.layout__nav-item {
  display: flex;
  align-items: center;
  gap: $space-10;
  padding: $space-12 $space-14;
  min-height: 42px;
  border-radius: $radius-md;
  border-left: 3px solid transparent;
  color: rgba(255, 255, 255, 0.7);
  font-size: $font-size-sm;
  text-decoration: none;
  transition: background $transition-base, color $transition-base, border-color $transition-base;
}

.layout__nav-item:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
}

.layout__nav-item.active {
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  border-left-color: $color-primary-light;
  font-weight: 600;
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
  min-height: 72px;
  background: $color-bg-white;
  @include dark-mode {
    background: $dark-color-bg-white;
  }
  border-bottom: 1px solid $color-border;
  @include dark-mode {
    border-bottom-color: $dark-color-border;
  }
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $space-16 $space-24;
  flex-shrink: 0;
  box-shadow: $shadow-sm;
  @include dark-mode {
    box-shadow: $dark-shadow-sm;
  }
}

.layout__breadcrumb {
  flex: 1;
  min-width: 0;
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: $space-8;
  margin-bottom: $space-8;
  font-size: $font-size-xs;

  &__item {
    @include color-scheme($color-text-tertiary, $dark-color-text-tertiary);
    text-decoration: none;
    transition: color $transition-fast;
    display: inline-flex;
    align-items: center;

    &:hover {
      @include color-scheme($color-primary, $dark-color-primary);
    }

    &:after {
      content: '/';
      margin-left: $space-8;
      margin-right: $space-8;
    }

    &:last-child {
      @include color-scheme($color-text, $dark-color-text);
      font-weight: 600;
      cursor: default;
      pointer-events: none;

      &:after {
        content: '';
        margin: 0;
      }
    }
  }
}

.layout__page-title {
  font-size: $font-size-xl;
  font-weight: 800;
  @include color-scheme($color-text, $dark-color-text);
  margin: 0;
  line-height: 1.2;
}

.layout__page-desc {
  margin: $space-6 0 0;
  @include color-scheme($color-text-tertiary, $dark-color-text-tertiary);
  font-size: $font-size-xs;
  line-height: 1.5;
}

.layout__header-right {
  display: flex;
  align-items: center;
  gap: $space-12;
}

.layout__user {
  display: flex;
  align-items: center;
  gap: $space-8;
  cursor: pointer;
  padding: $space-8 $space-12;
  border-radius: $radius-md;
  border: 1px solid transparent;
  transition: background $transition-fast, border-color $transition-fast;
}

.layout__user:hover {
  background: $color-bg-hover;
  border-color: $color-border;
}

.layout__user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, $color-sidebar 0%, $color-primary 100%);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: $font-size-xs;
  font-weight: 600;
  flex-shrink: 0;
}

.layout__user-name {
  font-size: $font-size-sm;
  @include color-scheme($color-text, $dark-color-text);
  font-weight: 600;
}

.layout__main {
  flex: 1;
  overflow-y: auto;
  padding: $space-24 $space-24 $space-32;
  @include bg-scheme($color-bg, $dark-color-bg);

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.1);
    @include dark-mode {
      background: rgba(255, 255, 255, 0.2);
    }
    border-radius: 4px;

    &:hover {
      background: rgba(0, 0, 0, 0.2);
      @include dark-mode {
        background: rgba(255, 255, 255, 0.3);
      }
    }
  }
}

/* ── 汉堡按钮（移动端） ── */
.layout__hamburger {
  position: fixed;
  top: $space-12;
  left: $space-12;
  z-index: 2001;
  width: 40px;
  height: 40px;
  border: none;
  background: $color-bg-white;
  border-radius: $radius-md;
  box-shadow: $shadow-md;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: $color-text;
  font-size: 18px;
  transition: background $transition-fast;

  &:hover {
    background: $color-bg-hover;
  }
}

/* drawer内侧边栏填满高度 */
.layout__sidebar--drawer {
  height: 100%;
  overflow-y: auto;
}

/* ── 平板端布局 (768px - 1024px) ── */
@media (min-width: 768px) and (max-width: 1023px) {
  .layout__main {
    padding: $space-20 $space-20 $space-28;
  }

  .layout__header {
    padding: $space-14 $space-20;
  }
}

/* ── 移动端布局 (< 768px) ── */
@media (max-width: 767px) {
  .layout__hamburger {
    display: flex;
  }

  .layout__header {
    min-height: 60px;
    padding: $space-12 $space-16 $space-12 54px;
  }

  .layout__main {
    padding: $space-16;
  }

  .layout__page-title {
    font-size: $font-size-lg;
  }

  .layout__page-desc {
    display: none;
  }

  .layout__user-name {
    display: none;
  }
}
</style>
