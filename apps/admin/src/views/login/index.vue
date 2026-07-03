<template>
  <div class="login-page">
    <!-- 左侧品牌区 -->
    <div class="login-page__brand">
      <div class="login-page__brand-inner">
        <div class="login-page__logo">B</div>
        <h1 class="login-page__name">BlissTribe</h1>
        <p class="login-page__slogan">心悦部落 · 专属会员管理平台</p>
        <div class="login-page__features">
          <div v-for="f in features" :key="f.text" class="login-page__feature">
            <span class="login-page__feature-dot" />
            <span>{{ f.text }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 右侧登录区 -->
    <div class="login-page__form-area">
      <div class="login-page__form-box">
        <div class="login-page__form-header">
          <h2>欢迎回来</h2>
          <p>请登录管理员账号以继续</p>
        </div>
        <el-form ref="formRef" :model="form" :rules="rules" size="large" @submit.prevent="handleLogin">
          <el-form-item prop="username">
            <el-input v-model="form.username" placeholder="用户名" prefix-icon="User" />
          </el-form-item>
          <el-form-item prop="password">
            <el-input v-model="form.password" type="password" show-password placeholder="密码" prefix-icon="Lock" />
          </el-form-item>
          <el-button class="login-page__submit" type="primary" :loading="loading" native-type="submit" @click="handleLogin">
            {{ loading ? '登录中...' : '登 录' }}
          </el-button>
        </el-form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const formRef = ref<FormInstance>()
const loading = ref(false)
const form = reactive({ username: '', password: '' })

const features = [
  { text: '用户生命周期管理' },
  { text: '邀请关系数据追踪' },
  { text: 'Banner 与协议版本控制' },
  { text: '多级权限管理' },
]

const rules: FormRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

const handleLogin = async (): Promise<void> => {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  loading.value = true
  try {
    const result = await authApi.login(form.username, form.password)
    authStore.setToken(result.token)
    authStore.setAdminInfo(result.admin)
    ElMessage.success('登录成功')
    router.replace((route.query.redirect as string) || '/')
  } catch { /* toast by interceptor */ } finally {
    loading.value = false
  }
}
</script>

<style lang="scss" scoped>
.login-page {
  height: 100vh;
  display: flex;

  &__brand {
    width: 420px;
    flex-shrink: 0;
    background: linear-gradient(150deg, #92400e 0%, #c2410c 40%, #d97706 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 48px;
  }

  &__brand-inner {
    color: #fff;
  }

  &__logo {
    width: 56px;
    height: 56px;
    background: rgba(255,255,255,0.2);
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28px;
    font-weight: bold;
    margin-bottom: 24px;
    backdrop-filter: blur(8px);
    border: 1px solid rgba(255,255,255,0.3);
  }

  &__name {
    font-size: 32px;
    font-weight: 700;
    margin: 0 0 8px;
    letter-spacing: 1px;
  }

  &__slogan {
    font-size: 15px;
    opacity: 0.8;
    margin: 0 0 40px;
  }

  &__features {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  &__feature {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 14px;
    opacity: 0.85;
  }

  &__feature-dot {
    width: 6px;
    height: 6px;
    background: rgba(255,255,255,0.7);
    border-radius: 50%;
    flex-shrink: 0;
  }

  &__form-area {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f5f7fa;
  }

  &__form-box {
    width: 380px;
    background: #fff;
    border-radius: 16px;
    padding: 48px 40px;
    box-shadow: 0 4px 24px rgba(0,0,0,0.08);
  }

  &__form-header {
    margin-bottom: 32px;
    h2 { font-size: 24px; font-weight: 700; color: #1a1a1a; margin: 0 0 6px; }
    p  { font-size: 14px; color: #999; margin: 0; }
  }

  &__submit {
    width: 100%;
    margin-top: 8px;
    height: 44px;
    font-size: 15px;
    border-radius: 8px;
    background: #d97706;
    border-color: #d97706;
    &:hover { background: #b45309; border-color: #b45309; }
  }

  &__hint {
    text-align: center;
    font-size: 12px;
    color: #bbb;
    margin: 16px 0 0;
  }
}
</style>
