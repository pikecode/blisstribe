<template>
  <div class="login-page">
    <div class="login-container">
      <div class="login-card">
        <div class="login-header">
          <h1>管理后台</h1>
          <p>BlissTribe Admin</p>
        </div>

        <form @submit.prevent="handleLogin" class="login-form">
          <div class="form-group">
            <label for="username">用户名</label>
            <input
              id="username"
              v-model="formData.username"
              type="text"
              placeholder="请输入用户名"
              required
              autocomplete="username"
            />
          </div>

          <div class="form-group">
            <label for="password">密码</label>
            <input
              id="password"
              v-model="formData.password"
              type="password"
              placeholder="请输入密码"
              required
              autocomplete="current-password"
            />
          </div>

          <button type="submit" class="login-button" :disabled="loading">
            {{ loading ? '登录中...' : '登录' }}
          </button>

          <div v-if="error" class="error-message">
            {{ error }}
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { authApi } from '@/api'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const formData = ref({
  username: '',
  password: ''
})

const loading = ref(false)
const error = ref('')

const handleLogin = async () => {
  if (!formData.value.username || !formData.value.password) {
    error.value = '请输入用户名和密码'
    return
  }

  loading.value = true
  error.value = ''

  try {
    const result = await authApi.login(formData.value)

    // 保存 token 和管理员信息
    authStore.setToken(result.token)
    authStore.setAdminInfo(result.admin)

    // 跳转到首页
    router.push('/')
  } catch (err: any) {
    error.value = err.message || '登录失败，请检查用户名和密码'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, #0A0D12 0%, #161D2B 100%);
  padding: 2rem;
}

.login-container {
  width: 100%;
  max-width: 420px;
}

.login-card {
  background: #0F131C;
  border-radius: 24px;
  padding: 3rem 2.5rem;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

.login-header {
  text-align: center;
  margin-bottom: 2.5rem;
}

.login-header h1 {
  font-size: clamp(1.75rem, 4vw, 2.25rem);
  font-weight: 700;
  letter-spacing: -0.02em;
  color: #ffffff;
  margin: 0 0 0.5rem 0;
}

.login-header p {
  font-size: 1rem;
  color: #9CA3AF;
  margin: 0;
  letter-spacing: 0.05em;
}

.login-form {
  display: grid;
  gap: 1.5rem;
}

.form-group {
  display: grid;
  gap: 0.5rem;
}

.form-group label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #D1D5DB;
  letter-spacing: 0.01em;
}

.form-group input {
  width: 100%;
  padding: 0.875rem 1rem;
  background: #1E2636;
  border: 1px solid #2D3748;
  border-radius: 12px;
  font-size: 1rem;
  color: #ffffff;
  transition: all 0.2s ease;
  outline: none;
}

.form-group input::placeholder {
  color: #6B7280;
}

.form-group input:focus {
  border-color: #38BDF8;
  box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.1);
}

.login-button {
  width: 100%;
  padding: 1rem;
  margin-top: 0.5rem;
  background: #38BDF8;
  border: none;
  border-radius: 999px;
  font-size: 1rem;
  font-weight: 600;
  color: #0A0D12;
  cursor: pointer;
  transition: all 0.2s ease;
  letter-spacing: 0.02em;
}

.login-button:hover:not(:disabled) {
  background: #0EA5E9;
  transform: translateY(-1px);
  box-shadow: 0 8px 24px rgba(56, 189, 248, 0.3);
}

.login-button:active:not(:disabled) {
  transform: translateY(0);
}

.login-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error-message {
  padding: 0.875rem 1rem;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 12px;
  color: #FCA5A5;
  font-size: 0.875rem;
  text-align: center;
}
</style>
