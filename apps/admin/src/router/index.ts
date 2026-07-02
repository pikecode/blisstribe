import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/index.vue'),
    meta: { public: true },
  },
  {
    path: '/',
    component: () => import('@/layout/index.vue'),
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/dashboard/index.vue'),
        meta: { title: '数据看板', icon: 'DataLine' },
      },
      {
        path: 'users',
        name: 'Users',
        component: () => import('@/views/user/index.vue'),
        meta: { title: '用户管理', icon: 'User' },
      },
      {
        path: 'admins',
        name: 'Admins',
        component: () => import('@/views/admin/index.vue'),
        meta: { title: '管理员与权限', icon: 'Lock' },
      },
      {
        path: 'agreements',
        name: 'Agreements',
        component: () => import('@/views/agreement/index.vue'),
        meta: { title: '协议版本管理', icon: 'Document' },
      },
    ],
  },
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
})

// 路由守卫
router.beforeEach((to) => {
  const authStore = useAuthStore()
  if (to.meta.public) return true
  if (!authStore.isLogin) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }
  return true
})
