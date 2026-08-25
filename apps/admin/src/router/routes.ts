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
      {
        path: 'invitations',
        name: 'Invitations',
        component: () => import('@/views/invitation/index.vue'),
        meta: { title: '邀请管理', icon: 'Share' },
      },
      {
        path: 'partners',
        name: 'Partners',
        component: () => import('@/views/partner/index.vue'),
        meta: { title: 'B 入驻审核', icon: 'OfficeBuilding' },
      },
      {
        path: 'banners',
        name: 'Banners',
        component: () => import('@/views/banner/index.vue'),
        meta: { title: 'Banner管理', icon: 'Picture' },
      },
      {
        path: 'tags',
        name: 'Tags',
        component: () => import('@/views/product/tags.vue'),
        meta: { title: '标签管理', icon: 'CollectionTag' },
      },
      {
        path: 'products',
        name: 'Products',
        component: () => import('@/views/product/index.vue'),
        meta: { title: '产品管理', icon: 'Goods' },
      },
      {
        path: 'assessment-templates',
        name: 'AssessmentTemplates',
        component: () => import('@/views/product/assessment.vue'),
        meta: { title: '评估管理', icon: 'EditPen' },
      },
      {
        path: 'recommendation-rules',
        name: 'RecommendationRules',
        component: () => import('@/views/product/recommendation-rules.vue'),
        meta: { title: '推荐规则', icon: 'Goods' },
      },
      {
        path: 'product-leads',
        name: 'ProductLeads',
        component: () => import('@/views/product/leads.vue'),
        meta: { title: '产品线索', icon: 'Tickets' },
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
