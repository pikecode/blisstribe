<template>
  <div class="admin-mgr">
    <el-card>
      <div class="admin-mgr__toolbar">
        <el-input
          v-model="keyword"
          placeholder="搜索用户名"
          clearable
          style="width: 240px"
          @keyup.enter="handleSearch"
        />
        <el-button type="primary" @click="handleSearch">搜索</el-button>
        <div class="admin-mgr__toolbar-right">
          <el-button @click="loadRoles">刷新角色</el-button>
          <el-button type="primary" @click="openCreate">新增管理员</el-button>
        </div>
      </div>

      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="username" label="用户名" width="140" />
        <el-table-column prop="nickname" label="昵称" />
        <el-table-column label="角色" min-width="180">
          <template #default="{ row }">
            <el-tag v-for="r in row.roles" :key="r.id" size="small" style="margin-right: 4px">
              {{ r.name }}
            </el-tag>
            <span v-if="!row.roles.length" class="admin-mgr__empty">—</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'danger'">
              {{ row.status === 1 ? '正常' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="最后登录" width="180">
          <template #default="{ row }">{{ row.lastLoginAt ? formatDate(row.lastLoginAt) : '—' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="openEdit(row)">编辑</el-button>
            <el-button size="small" @click="openRoles(row)">分配角色</el-button>
            <el-button size="small" type="warning" @click="openReset(row)">重置密码</el-button>
            <el-button
              size="small"
              :type="row.status === 1 ? 'danger' : 'success'"
              @click="toggleStatus(row)"
            >
              {{ row.status === 1 ? '禁用' : '启用' }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :total="total"
        layout="total, prev, pager, next"
        @current-change="loadList"
        class="admin-mgr__pager"
      />
    </el-card>

    <!-- 新增/编辑管理员 -->
    <el-dialog v-model="dialogVisible" :title="editing.id ? '编辑管理员' : '新增管理员'" width="500px">
      <el-form ref="formRef" :model="editing" :rules="formRules" label-width="80px">
        <el-form-item label="用户名" prop="username" v-if="!editing.id">
          <el-input v-model="editing.username" placeholder="登录用户名" />
        </el-form-item>
        <el-form-item label="用户名" v-else>
          <el-input :value="editing.username" disabled />
        </el-form-item>
        <el-form-item v-if="!editing.id" label="密码" prop="password">
          <el-input v-model="editing.password" type="password" show-password placeholder="至少 8 位" />
        </el-form-item>
        <el-form-item label="昵称" prop="nickname">
          <el-input v-model="editing.nickname" />
        </el-form-item>
        <el-form-item v-if="!editing.id" label="角色">
          <el-select v-model="editing.roleIds" multiple placeholder="分配角色" style="width: 100%">
            <el-option v-for="r in roles" :key="r.id" :label="r.name" :value="String(r.id)" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>

    <!-- 分配角色 -->
    <el-dialog v-model="rolesDialogVisible" title="分配角色" width="420px">
      <el-select v-model="selectedRoleIds" multiple placeholder="选择角色" style="width: 100%">
        <el-option v-for="r in roles" :key="r.id" :label="r.name" :value="String(r.id)" />
      </el-select>
      <template #footer>
        <el-button @click="rolesDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleAssignRoles">保存</el-button>
      </template>
    </el-dialog>

    <!-- 重置密码 -->
    <el-dialog v-model="resetDialogVisible" title="重置密码" width="420px">
      <el-form :model="resetForm" label-width="80px">
        <el-form-item label="新密码">
          <el-input v-model="resetForm.password" type="password" show-password placeholder="至少 8 位" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="resetDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleReset">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage, ElMessageBox } from 'element-plus'
import { adminApi, type AdminItem, type RoleItem } from '@/api/admin'

const list = ref<AdminItem[]>([])
const roles = ref<RoleItem[]>([])
const loading = ref(false)
const saving = ref(false)
const keyword = ref('')
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)

const dialogVisible = ref(false)
const rolesDialogVisible = ref(false)
const resetDialogVisible = ref(false)
const formRef = ref<FormInstance>()

const editing = reactive<{ id: number | null; username: string; password: string; nickname: string; roleIds: string[] }>({
  id: null,
  username: '',
  password: '',
  nickname: '',
  roleIds: [],
})

const formRules: FormRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, min: 8, message: '至少 8 位', trigger: 'blur' }],
  nickname: [{ required: true, message: '请输入昵称', trigger: 'blur' }],
}

const currentAdminId = ref<string>('')
const selectedRoleIds = ref<string[]>([])
const resetForm = reactive({ password: '' })

const loadList = async (): Promise<void> => {
  loading.value = true
  try {
    const data = await adminApi.list({
      page: page.value,
      pageSize: pageSize.value,
      keyword: keyword.value || undefined,
    })
    list.value = data.list
    total.value = data.total
  } finally {
    loading.value = false
  }
}

const loadRoles = async (): Promise<void> => {
  roles.value = await adminApi.listRoles()
}

const handleSearch = (): void => {
  page.value = 1
  loadList()
}

const openCreate = (): void => {
  Object.assign(editing, { id: null, username: '', password: '', nickname: '', roleIds: [] })
  dialogVisible.value = true
}

const openEdit = (row: AdminItem): void => {
  Object.assign(editing, {
    id: row.id,
    username: row.username,
    password: '',
    nickname: row.nickname,
    roleIds: [],
  })
  dialogVisible.value = true
}

const handleSave = async (): Promise<void> => {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  saving.value = true
  try {
    if (editing.id) {
      await adminApi.update(String(editing.id), { nickname: editing.nickname })
      ElMessage.success('已更新')
    } else {
      await adminApi.create({
        username: editing.username,
        password: editing.password,
        nickname: editing.nickname,
        roleIds: editing.roleIds,
      })
      ElMessage.success('已创建')
    }
    dialogVisible.value = false
    loadList()
  } finally {
    saving.value = false
  }
}

const openRoles = (row: AdminItem): void => {
  currentAdminId.value = String(row.id)
  selectedRoleIds.value = row.roles.map((r) => String(r.id))
  rolesDialogVisible.value = true
}

const handleAssignRoles = async (): Promise<void> => {
  saving.value = true
  try {
    await adminApi.assignRoles(currentAdminId.value, selectedRoleIds.value)
    ElMessage.success('角色已更新')
    rolesDialogVisible.value = false
    loadList()
  } finally {
    saving.value = false
  }
}

const openReset = (row: AdminItem): void => {
  currentAdminId.value = String(row.id)
  resetForm.password = ''
  resetDialogVisible.value = true
}

const handleReset = async (): Promise<void> => {
  if (resetForm.password.length < 8) {
    ElMessage.warning('密码至少 8 位')
    return
  }
  saving.value = true
  try {
    await adminApi.resetPassword(currentAdminId.value, resetForm.password)
    ElMessage.success('密码已重置')
    resetDialogVisible.value = false
  } finally {
    saving.value = false
  }
}

const toggleStatus = async (row: AdminItem): Promise<void> => {
  const newStatus = row.status === 1 ? 0 : 1
  await ElMessageBox.confirm(`确定${newStatus === 1 ? '启用' : '禁用'}「${row.username}」？`, '提示', {
    type: 'warning',
  })
  await adminApi.updateStatus(String(row.id), newStatus)
  ElMessage.success('已操作')
  loadList()
}

const formatDate = (iso: string): string => new Date(iso).toLocaleString('zh-CN')

onMounted(async () => {
  await Promise.all([loadList(), loadRoles()])
})
</script>

<style lang="scss" scoped>
.admin-mgr {
  &__toolbar {
    display: flex;
    gap: 12px;
    margin-bottom: 16px;
  }

  &__toolbar-right {
    margin-left: auto;
    display: flex;
    gap: 8px;
  }

  &__empty {
    color: #ccc;
  }

  &__pager {
    margin-top: 16px;
    justify-content: flex-end;
  }
}
</style>
