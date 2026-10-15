<template>
  <div class="service-program-page">
    <section class="service-overview" aria-label="服务方案概览">
      <div class="service-overview__intro">
        <span class="service-overview__eyebrow">SERVICE DELIVERY</span>
        <h2>把产品介绍变成可履约的服务</h2>
        <p>在这里维护实际服务机构、成交价格、有效期和履约规则。上架后，小程序才能向患者展示可购买方案。</p>
      </div>
      <div class="service-overview__metrics">
        <div><strong>{{ total }}</strong><span>全部方案</span></div>
        <div><strong>{{ publishedCount }}</strong><span>当前上架</span></div>
        <div><strong>{{ institutions.length }}</strong><span>履约机构</span></div>
      </div>
    </section>

    <el-tabs v-model="activeTab" class="service-tabs">
      <el-tab-pane label="服务套餐" name="offerings">
        <AdminListToolbar>
          <el-select v-model="filters.productId" filterable clearable placeholder="全部服务产品" style="width: 220px">
            <el-option v-for="item in products" :key="item.id" :label="item.title" :value="item.id" />
          </el-select>
          <el-select v-model="filters.institutionId" clearable placeholder="全部履约机构" style="width: 190px">
            <el-option v-for="item in institutions" :key="item.id" :label="item.name" :value="item.id" />
          </el-select>
          <el-select v-model="filters.status" clearable placeholder="全部状态" style="width: 140px">
            <el-option label="草稿" :value="0" />
            <el-option label="已上架" :value="1" />
            <el-option label="已下架" :value="2" />
          </el-select>
          <el-button type="primary" @click="resetPageAndLoad">搜索</el-button>
          <el-button @click="resetFilters">重置</el-button>
          <div class="toolbar__right">
            <el-button type="primary" @click="openOfferingDrawer()">新增套餐</el-button>
          </div>
        </AdminListToolbar>

        <AdminListTable :data="offerings" :loading="loading" :error="listError" @retry="loadOfferings">
          <el-table-column label="方案" min-width="240">
            <template #default="{ row }">
              <div class="table-title">{{ row.name }}</div>
              <div class="table-subtitle">{{ row.product.title }} · V{{ row.version }}</div>
            </template>
          </el-table-column>
          <el-table-column label="履约机构" min-width="170">
            <template #default="{ row }">
              <div class="table-title">{{ row.institution.name }}</div>
              <div class="table-subtitle">{{ row.institution.address || '暂未填写地址' }}</div>
            </template>
          </el-table-column>
          <el-table-column label="售价" width="120" align="right">
            <template #default="{ row }"><strong class="money">¥{{ fenToYuan(row.priceFen) }}</strong></template>
          </el-table-column>
          <el-table-column label="服务规则" min-width="150">
            <template #default="{ row }">
              <div>{{ row.items.length }} 个项目 · {{ totalQuantity(row) }} 次服务</div>
              <div class="table-subtitle">{{ row.validityDays }} 天 · {{ row.requiresQualification ? '需先确认资格' : '可直接购买' }}</div>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="{ row }"><el-tag :type="statusMeta(row.status).type">{{ statusMeta(row.status).text }}</el-tag></template>
          </el-table-column>
          <el-table-column label="可售检查" min-width="180"><template #default="{ row }"><el-button link :type="row.readiness?.availableNow ? 'success' : 'warning'" @click="openReadiness(row)">{{ row.readiness?.summary || '查看检查结果' }}</el-button><div class="table-subtitle">{{ readinessIssue(row) }}</div></template></el-table-column>
          <el-table-column label="操作" width="88" fixed="right" align="center">
            <template #default="{ row }">
              <AdminListActions>
                <AdminListAction :label="row.status === 1 ? '查看套餐' : '编辑套餐'" :icon="row.status === 1 ? 'View' : 'Edit'" @click="openOfferingDrawer(row)" />
                <template #more>
                  <el-dropdown-item v-if="row.status !== 1" @click="publishOffering(row)">上架方案</el-dropdown-item>
                  <template v-else><el-dropdown-item @click="openOfferingDrawer(row)">查看套餐</el-dropdown-item><el-dropdown-item @click="editPublishedOffering(row)">下架并编辑</el-dropdown-item><el-dropdown-item @click="unpublishOffering(row)">仅下架</el-dropdown-item></template>
                </template>
              </AdminListActions>
            </template>
          </el-table-column>
        </AdminListTable>
        <AdminListPagination v-model:current-page="page" v-model:page-size="pageSize" :total="total" :disabled="loading" @change="loadOfferings" />
      </el-tab-pane>

      <el-tab-pane label="履约机构" name="institutions">
        <div class="institution-head">
          <div><h3>履约机构</h3><p>服务方案必须绑定实际提供服务的机构。</p></div>
          <el-button type="primary" @click="openInstitutionDialog()">新增机构</el-button>
        </div>
        <AdminListTable :data="institutions" :loading="institutionLoading" empty-text="暂无履约机构，请先新增">
          <el-table-column label="机构" min-width="220">
            <template #default="{ row }"><div class="table-title">{{ row.name }}</div><div class="table-subtitle">{{ row.partner.displayName }} · {{ row.partner.partnerNo }}</div></template>
          </el-table-column>
          <el-table-column prop="address" label="服务地址" min-width="220" show-overflow-tooltip />
          <el-table-column label="联系人" min-width="170">
            <template #default="{ row }">{{ [row.contactName, row.contactPhone].filter(Boolean).join(' · ') || '—' }}</template>
          </el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="{ row }"><el-tag :type="row.status === 1 ? 'success' : 'info'">{{ row.status === 1 ? '启用' : '停用' }}</el-tag></template>
          </el-table-column>
          <el-table-column label="操作" width="88" fixed="right" align="center">
            <template #default="{ row }"><AdminListActions :show-more="false"><AdminListAction label="编辑" icon="Edit" @click="openInstitutionDialog(row)" /></AdminListActions></template>
          </el-table-column>
        </AdminListTable>
      </el-tab-pane>
    </el-tabs>

    <el-drawer v-model="offeringDrawer" class="offering-drawer" :title="offeringReadOnly ? '查看服务套餐' : editingOfferingId ? '编辑服务套餐' : '新增服务套餐'" size="min(1120px, 100vw)" destroy-on-close :before-close="beforeOfferingClose" @closed="resetOfferingForm">
      <div class="offering-editor">
      <div class="offering-editor__main">
      <el-alert v-if="offeringReadOnly" title="套餐已上架，当前为只读预览" description="下架后可修改，新用户将暂时无法购买；已购订单内容保持原成交记录。" type="info" :closable="false" show-icon />
      <el-form ref="offeringFormRef" :model="offeringForm" :rules="offeringRules" :disabled="offeringReadOnly || submitting" :scroll-to-error="true" label-position="top" class="offering-form">
        <section class="form-section">
          <div class="form-section__title"><span>01</span><div><strong>基础信息</strong><small>患者看到的方案名称与实际履约机构</small></div></div>
          <div class="form-grid">
            <el-form-item label="服务产品" prop="productId"><el-select v-model="offeringForm.productId" filterable placeholder="选择服务产品"><el-option v-for="item in products" :key="item.id" :label="item.title" :value="item.id" /></el-select></el-form-item>
            <el-form-item label="履约机构" prop="institutionId"><el-select v-model="offeringForm.institutionId" placeholder="选择履约机构"><el-option v-for="item in activeInstitutions" :key="item.id" :label="item.name" :value="item.id" /></el-select></el-form-item>
            <el-form-item label="方案名称" prop="name"><el-input v-model="offeringForm.name" maxlength="60" placeholder="如 初次评估服务" /></el-form-item>
            <el-form-item label="一句话说明"><el-input v-model="offeringForm.subtitle" maxlength="100" placeholder="帮助患者快速理解方案" /></el-form-item>
          </div>
        </section>

        <section class="form-section">
          <div class="form-section__title"><span>02</span><div><strong>价格与服务内容</strong><small>按项目维护次数和成交分摊，患者购买后分别获得权益</small></div></div>
          <div class="form-grid">
            <el-form-item label="套餐售价（元）" prop="priceYuan"><el-input-number v-model="offeringForm.priceYuan" :min="0" :precision="2" :step="10" controls-position="right" /></el-form-item>

            <el-form-item label="主理人收益比例"><el-input-number v-model="offeringForm.promoterRatePercent" :min="0" :max="100" :precision="2" controls-position="right" /><span class="field-suffix">%</span></el-form-item>
          </div>
          <div ref="allocationSummaryRef" class="allocation-summary" :class="{ 'allocation-summary--error': allocationDifferenceFen !== 0 }" aria-live="polite">
            <div><strong>成交分摊 ¥{{ fenToYuan(allocatedTotalFen) }}</strong><span v-if="allocationDifferenceFen === 0">与套餐售价一致</span><span v-else>{{ allocationDifferenceFen > 0 ? '还需分摊' : '超出售价' }} ¥{{ fenToYuan(Math.abs(allocationDifferenceFen)) }}</span></div>
            <small>分摊金额是该项目全部次数的成交总额，用于未使用次数退款；机构结算填写每次单价。</small>
            <small>机构结算合计 ¥{{ fenToYuan(settlementTotalFen) }} · 默认推广收益预算 ¥{{ fenToYuan(promoterTotalFen) }}</small>
            <small v-if="offeringForm.priceYuan > 0 && payoutTotalFen > yuanToFen(offeringForm.priceYuan)" class="budget-error">售价不足以覆盖结算与收益支出，请调整价格或单价。</small>
          </div>
          <section v-for="(item, index) in offeringForm.items" :key="item.key" class="offering-item">
            <div class="offering-item__head"><div><el-tag size="small" :type="item.kind === 'goods' ? 'warning' : 'success'">{{ item.kind === 'goods' ? '实物' : '服务' }}</el-tag><strong> {{ item.name || `项目 ${index + 1}` }}</strong></div><el-button type="danger" text :disabled="offeringForm.items.length === 1" :aria-label="`移除项目 ${index + 1}`" @click="offeringForm.items.splice(index, 1)">移除</el-button></div>
            <el-form-item label="项目类型"><el-radio-group v-model="item.kind"><el-radio-button value="service">服务</el-radio-button><el-radio-button value="goods">套餐实物</el-radio-button></el-radio-group></el-form-item>
            <template v-if="item.kind === 'goods'">
              <el-form-item label="商城商品规格" :prop="`items.${index}.skuId`" :rules="[{ required: true, message: '请选择商品规格', trigger: 'change' }]"><el-select v-model="item.skuId" filterable remote :remote-method="searchGoods" :loading="goodsOptionsLoading" placeholder="搜索已上架商品" style="width:100%"><el-option v-if="item.skuId && !goodsSkuOptions.some(option => option.id === item.skuId)" :value="item.skuId" :label="item.skuLabel" /><el-option v-for="option in goodsSkuOptions" :key="option.id" :value="option.id" :label="option.label" /></el-select></el-form-item>
              <el-form-item label="交付方式"><el-radio-group v-model="item.deliveryMethod"><el-radio value="pickup">机构现场领取</el-radio><el-radio value="shipping">物流寄送</el-radio></el-radio-group></el-form-item>
              <el-form-item label="退货规则" :prop="`items.${index}.returnNotice`" :rules="[{ required: true, whitespace: true, message: '请填写退货规则', trigger: 'blur' }]"><el-input v-model="item.returnNotice" type="textarea" :rows="2" maxlength="500" placeholder="明确可退条件、申请期限和运费承担，购买前向患者展示" /></el-form-item>
            </template>
            <div class="form-grid">
              <el-form-item :label="item.kind === 'goods' ? '商品展示名称' : '服务项目'" :prop="`items.${index}.name`" :rules="[{ required: true, whitespace: true, message: '请输入服务项目名称', trigger: 'blur' }]"><el-input v-model="item.name" maxlength="60" placeholder="如 健康评估、护理服务" /></el-form-item>
              <el-form-item :label="item.kind === 'goods' ? '商品数量' : '服务次数'" :prop="`items.${index}.quantity`" :rules="[{ required: true, type: 'integer', min: 1, message: '请填写至少为1的整数', trigger: 'change' }]"><el-input-number v-model="item.quantity" :min="1" :max="999" :precision="0" controls-position="right" /></el-form-item>
              <el-form-item label="项目成交分摊（元）"><el-input-number v-model="item.allocatedYuan" :min="0" :precision="2" controls-position="right" /></el-form-item>
              <el-form-item  :label="item.kind === 'goods' ? '机构每件结算（元）' : '机构每次结算（元）'"><el-input-number v-model="item.settlementYuan" :min="0" :precision="2" controls-position="right" /></el-form-item>
            </div>
            <div class="offering-item__amount"><span>项目分摊总额 <strong>¥{{ fenToYuan(yuanToFen(item.allocatedYuan)) }}</strong></span><span>{{ item.quantity || 0 }} {{ item.kind === 'goods' ? '件' : '次' }} · 机构结算小计 <strong>¥{{ fenToYuan(yuanToFen(item.settlementYuan) * (item.quantity || 0)) }}</strong></span></div>
            <el-form-item label="项目说明"><el-input v-model="item.description" type="textarea" :rows="2" maxlength="200" placeholder="说明该项目实际交付的内容" /></el-form-item>
          </section>
          <el-button class="add-item" plain :disabled="offeringForm.items.length >= 50" @click="offeringForm.items.push(newOfferingItem())">＋ 添加项目</el-button>

        </section>

        <section class="form-section">
          <div class="form-section__title"><span>03</span><div><strong>购买与履约规则</strong><small>明确购买条件、可使用期限及售后边界</small></div></div>
          <div class="form-grid"><el-form-item label="有效期（天）" prop="validityDays"><el-input-number v-model="offeringForm.validityDays" :min="1" :max="3650" controls-position="right" /></el-form-item><el-form-item label="购买条件"><el-switch v-model="offeringForm.requiresQualification" active-text="需机构确认资格" inactive-text="可直接购买" /></el-form-item></div>
          <el-form-item label="预约须知" prop="appointmentNotice"><el-input v-model="offeringForm.appointmentNotice" type="textarea" :rows="3" maxlength="500" placeholder="说明预约确认、取消与改约规则" /></el-form-item>
          <el-form-item label="退款规则" prop="refundNotice"><el-input v-model="offeringForm.refundNotice" type="textarea" :rows="3" maxlength="500" placeholder="说明未使用服务的退款范围与处理方式" /></el-form-item>
        </section>
      </el-form>
      </div>
      <aside class="offering-preview" aria-label="套餐实时摘要">
        <div class="offering-preview__heading"><span>套餐摘要</span><el-tag size="small" :type="offeringReadOnly ? 'success' : 'info'">{{ offeringReadOnly ? '已上架' : '待上架' }}</el-tag></div>
        <h3>{{ offeringForm.name || '未命名套餐' }}</h3>
        <p>{{ offeringForm.subtitle || '填写一句话说明，帮助患者理解套餐' }}</p>
        <div class="offering-preview__price">¥{{ fenToYuan(yuanToFen(offeringForm.priceYuan)) }}<small>套餐售价</small></div>
        <dl><div><dt>关联产品</dt><dd>{{ products.find(item => item.id === offeringForm.productId)?.title || '未选择' }}</dd></div><div><dt>履约机构</dt><dd>{{ institutions.find(item => item.id === offeringForm.institutionId)?.name || '未选择' }}</dd></div><div><dt>有效期</dt><dd>{{ offeringForm.validityDays || '—' }} 天</dd></div><div><dt>购买条件</dt><dd>{{ offeringForm.requiresQualification ? '机构确认资格' : '可直接购买' }}</dd></div></dl>
        <div class="offering-preview__items"><div v-for="item in offeringForm.items" :key="item.key"><span>{{ item.name || '未填写项目' }}</span><strong>× {{ item.quantity || 0 }} {{ item.kind === 'goods' ? '件' : '次' }}</strong></div></div>
        <div class="offering-preview__check" :class="{ 'offering-preview__check--error': !!offeringAmountError }" aria-live="polite">{{ offeringAmountError || '售价与分摊金额一致' }}</div>
        <p class="offering-preview__note">分摊金额按项目全部次数或数量填写，用于计算退款。修改仅影响之后的新订单。</p>
      </aside>
      </div>
      <template #footer><div class="drawer-footer"><div class="drawer-footer__status"><strong>{{ offeringReadOnly ? '已上架 · 只读预览' : offeringDirty ? '有未保存的修改' : '保存后需上架才可购买' }}</strong><span v-if="!offeringReadOnly">{{ offeringAmountError || '保存后返回列表，可继续检查并上架' }}</span></div><div><el-button :disabled="submitting" @click="closeOffering">{{ offeringReadOnly ? '关闭' : '取消' }}</el-button><el-button v-if="offeringReadOnly" type="primary" :loading="submitting" @click="unpublishAndEdit">下架并编辑</el-button><el-button v-else type="primary" :loading="submitting" @click="saveOffering">保存套餐</el-button></div></div></template>
    </el-drawer>

    <el-dialog v-model="readinessVisible" title="套餐上架与可售检查" width="min(680px, 94vw)">
      <p>{{ readinessOffering?.name }}</p>
      <el-skeleton v-if="readinessLoading" :rows="5" animated />
      <el-alert v-else-if="readinessError" :title="readinessError" type="error" :closable="false"><el-button @click="refreshReadiness">重试检查</el-button></el-alert>
      <template v-else-if="readinessResult">
        <el-alert :title="readinessResult.summary" :type="readinessResult.canPublish ? 'info' : 'warning'" :closable="false" description="配置缺项会阻止上架；时段和库存随时变化，实际下单仍会再次校验。" />
        <div v-for="check in readinessResult.checks" :key="check.key" class="readiness-row"><div><strong>{{ check.label }}</strong><p>{{ check.passed ? '已就绪' : check.message }}</p></div><el-tag v-if="check.passed" type="success">通过</el-tag><el-button v-else link type="primary" @click="resolveReadiness(check.target)">去处理</el-button></div>
        <p class="table-subtitle">{{ readinessResult.requiresQualification ? '本套餐还需要针对每位用户单独确认购买资格。' : '本套餐无需单独确认购买资格。' }} 检查时间：{{ new Date(readinessResult.checkedAt).toLocaleString('zh-CN') }}</p>
      </template>
      <template #footer><el-button @click="readinessVisible = false">关闭</el-button><el-button :loading="readinessLoading" @click="refreshReadiness">刷新检查</el-button><el-button v-if="readinessOffering?.status !== 1" type="primary" :disabled="!readinessResult?.canPublish || readinessLoading || !!readinessError" :loading="publishing" @click="confirmPublish">确认上架</el-button></template>
    </el-dialog>

    <el-dialog v-model="institutionDialog" :title="editingInstitutionId ? '编辑履约机构' : '新增履约机构'" width="580px" destroy-on-close @closed="resetInstitutionForm">
      <el-form ref="institutionFormRef" :model="institutionForm" :rules="institutionRules" label-position="top">
        <el-form-item v-if="!editingInstitutionId" label="关联合作主体" prop="partnerId"><el-select v-model="institutionForm.partnerId" filterable placeholder="选择已审核的合作主体" style="width: 100%"><el-option v-for="item in availablePartners" :key="Number(item.id)" :label="item.displayName" :value="Number(item.id)" /></el-select></el-form-item>
        <el-form-item label="机构名称" prop="name"><el-input v-model="institutionForm.name" maxlength="60" placeholder="患者可识别的正式机构名称" /></el-form-item>
        <el-form-item label="服务地址"><el-input v-model="institutionForm.address" maxlength="200" placeholder="线下服务的详细地址" /></el-form-item>
        <div class="form-grid">
          <el-form-item label="运营联系人"><el-input v-model="institutionForm.contactName" maxlength="30" /></el-form-item>
          <el-form-item label="联系电话"><el-input v-model="institutionForm.contactPhone" maxlength="30" /></el-form-item>
        </div>
        <el-form-item label="接待日（北京时间）"><el-checkbox-group v-model="institutionForm.weekdays"><el-checkbox v-for="(label, index) in ['周日','周一','周二','周三','周四','周五','周六']" :key="index" :value="index">{{ label }}</el-checkbox></el-checkbox-group></el-form-item>
        <div class="form-grid"><el-form-item label="接待开始"><el-time-select v-model="institutionForm.openTime" start="00:00" end="23:45" step="00:15" /></el-form-item><el-form-item label="接待结束"><el-time-select v-model="institutionForm.closeTime" start="00:15" end="23:45" step="00:15" /></el-form-item></div>
        <el-form-item v-if="editingInstitutionId" label="状态"><el-switch v-model="institutionForm.active" inline-prompt active-text="启" inactive-text="停" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="institutionDialog = false">取消</el-button><el-button type="primary" :loading="submitting" @click="saveInstitution">保存</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox, type FormInstance } from 'element-plus'
import AdminListAction from '@/components/AdminListAction.vue'
import AdminListActions from '@/components/AdminListActions.vue'
import AdminListPagination from '@/components/AdminListPagination.vue'
import AdminListTable from '@/components/AdminListTable.vue'
import AdminListToolbar from '@/components/AdminListToolbar.vue'
import { shopApi, type ShopProduct } from '@/api/shop'
import { partnerApi } from '@/api/partner'
import { productApi, type Product } from '@/api/product'
import { serviceProgramApi, type ServiceInstitution, type ServiceOffering, type ServiceOfferingReadiness } from '@/api/service-program'

const route = useRoute()
const router = useRouter()
const queryProductId = computed(() => {
  const value = Number(route.query.productId)
  return Number.isSafeInteger(value) && value > 0 ? value : ''
})
const activeTab = ref('offerings')
const loading = ref(false)
const institutionLoading = ref(false)
const submitting = ref(false)
const listError = ref('')
const offerings = ref<ServiceOffering[]>([])
const institutions = ref<ServiceInstitution[]>([])
const products = ref<Product[]>([])
const partners = ref<any[]>([])
const goodsProducts = ref<ShopProduct[]>([])
const goodsOptionsLoading = ref(false)
async function searchGoods(keyword = '') { goodsOptionsLoading.value = true; try { goodsProducts.value = (await shopApi.listProducts({ keyword, status: 1, page: 1, pageSize: 100 })).list } finally { goodsOptionsLoading.value = false } }
const goodsSkuOptions = computed(() => goodsProducts.value.flatMap(product => product.skus.filter(sku => sku.enabled).map(sku => ({ id: Number(sku.id), label: `${product.name} / ${Object.values(sku.specifications || {}).join(' · ') || '默认规格'}` }))))
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const filters = reactive<{ productId: number | ''; institutionId: number | ''; status: number | '' }>({ productId: queryProductId.value, institutionId: '', status: '' })
const publishedCount = computed(() => offerings.value.filter((item) => item.status === 1).length)
const activeInstitutions = computed(() => institutions.value.filter((item) => item.status === 1))
const availablePartners = computed(() => partners.value.filter((partner) => !institutions.value.some((item) => item.partnerId === Number(partner.id))))

const offeringDrawer = ref(false)
const offeringFormRef = ref<FormInstance>()
const editingOfferingId = ref<number | null>(null)
const editingOffering = ref<ServiceOffering | null>(null)
let offeringItemKey = 0
const newOfferingItem = () => ({ key: ++offeringItemKey, name: '', description: '', kind: 'service' as 'service' | 'goods', skuId: undefined as number | undefined, skuLabel: '', deliveryMethod: 'pickup' as 'pickup' | 'shipping', returnNotice: '', quantity: 1, allocatedYuan: 0, settlementYuan: 0 })
const defaultOfferingForm = () => ({ productId: filters.productId, institutionId: '' as number | '', name: '', subtitle: '', priceYuan: 0, validityDays: 365, items: [newOfferingItem()], promoterRatePercent: 0, requiresQualification: false, appointmentNotice: '', refundNotice: '' })
const offeringForm = reactive(defaultOfferingForm())
const offeringSnapshot = ref('')
const allocationSummaryRef = ref<HTMLElement>()
const offeringReadOnly = computed(() => editingOffering.value?.status === 1)
const offeringDirty = computed(() => !!offeringSnapshot.value && JSON.stringify(offeringForm) !== offeringSnapshot.value)
const offeringAmountError = computed(() => allocationDifferenceFen.value !== 0
  ? `${allocationDifferenceFen.value > 0 ? '还需分摊' : '分摊超出售价'} ¥${fenToYuan(Math.abs(allocationDifferenceFen.value))}`
  : offeringForm.priceYuan > 0 && payoutTotalFen.value > yuanToFen(offeringForm.priceYuan)
    ? '售价不足以覆盖机构结算与推广收益' : '')
const allocatedTotalFen = computed(() => offeringForm.items.reduce((sum, item) => sum + yuanToFen(item.allocatedYuan), 0))
const allocationDifferenceFen = computed(() => yuanToFen(offeringForm.priceYuan) - allocatedTotalFen.value)
const settlementTotalFen = computed(() => offeringForm.items.reduce((sum, item) => sum + yuanToFen(item.settlementYuan) * (item.quantity || 0), 0))
const promoterTotalFen = computed(() => Math.ceil(yuanToFen(offeringForm.priceYuan) * Math.round(offeringForm.promoterRatePercent * 100) / 10000))
const payoutTotalFen = computed(() => settlementTotalFen.value + promoterTotalFen.value)
const offeringRules = {
  productId: [{ required: true, message: '请选择服务产品', trigger: 'change' }],
  institutionId: [{ required: true, message: '请选择履约机构', trigger: 'change' }],
  name: [{ required: true, message: '请输入方案名称', trigger: 'blur' }],
  priceYuan: [{ required: true, type: 'number', min: 0, message: '请输入正确售价', trigger: 'change' }],
  validityDays: [{ required: true, type: 'number', min: 1, message: '有效期至少 1 天', trigger: 'change' }],
  appointmentNotice: [{ required: true, message: '请输入预约须知', trigger: 'blur' }],
  refundNotice: [{ required: true, message: '请输入退款规则', trigger: 'blur' }],
}

const institutionDialog = ref(false)
const institutionFormRef = ref<FormInstance>()
const editingInstitutionId = ref<number | null>(null)
const defaultInstitutionForm = () => ({ partnerId: '' as number | '', name: '', address: '', contactName: '', contactPhone: '', weekdays: [1,2,3,4,5], openTime: '09:00', closeTime: '17:00', active: true })
const institutionForm = reactive(defaultInstitutionForm())
const institutionRules = { partnerId: [{ required: true, message: '请选择合作主体', trigger: 'change' }], name: [{ required: true, message: '请输入机构名称', trigger: 'blur' }] }

function fenToYuan(value: number) { return (value / 100).toFixed(2) }
function totalQuantity(row: ServiceOffering) { return row.items.filter(item => item.kind !== 'goods').reduce((sum, item) => sum + item.quantity, 0) }
function yuanToFen(value: number) { return Math.round(Number(value || 0) * 100) }
function statusMeta(status: number): { text: string; type: 'info' | 'success' | 'warning' } {
  if (status === 1) return { text: '已上架', type: 'success' }
  if (status === 2) return { text: '已下架', type: 'warning' }
  return { text: '草稿', type: 'info' }
}

async function loadOfferings() {
  loading.value = true
  listError.value = ''
  try {
    const result = await serviceProgramApi.listOfferings({ ...filters, page: page.value, pageSize: pageSize.value })
    offerings.value = result.list
    total.value = result.total
  } catch { listError.value = '服务方案加载失败，请重试' } finally { loading.value = false }
}
async function loadInstitutions() {
  institutionLoading.value = true
  try { institutions.value = await serviceProgramApi.listInstitutions() } finally { institutionLoading.value = false }
}
async function loadOptions() {
  const [productResult, partnerResult] = await Promise.all([
    productApi.listProducts({ page: 1, pageSize: 100, productType: 'service' }),
    partnerApi.list({ page: 1, pageSize: 100, status: 1 }),
  ])
  products.value = productResult.list
  partners.value = partnerResult.list
}
function resetPageAndLoad() { page.value = 1; loadOfferings() }
function resetFilters() { Object.assign(filters, { productId: '', institutionId: '', status: '' }); resetPageAndLoad() }

function openOfferingDrawer(row?: ServiceOffering) {
  editingOfferingId.value = row?.id ?? null
  editingOffering.value = row ?? null
  Object.assign(offeringForm, row ? {
    productId: row.productId, institutionId: row.institutionId, name: row.name, subtitle: row.subtitle,
    priceYuan: row.priceFen / 100, validityDays: row.validityDays,
    items: row.items.map(item => ({ key: ++offeringItemKey, name: item.name, description: item.description, kind: item.kind, skuId: item.skuId || undefined, skuLabel: `${item.goodsSnapshot?.productName || item.name} / ${Object.values(item.goodsSnapshot?.specifications || {}).join(' · ') || '默认规格'}`, deliveryMethod: item.deliveryMethod, returnNotice: item.returnNotice, quantity: item.quantity, allocatedYuan: item.allocatedAmountFen / 100, settlementYuan: item.institutionSettlementFen / 100 })),
    promoterRatePercent: row.defaultPromoterRateBps / 100, requiresQualification: row.requiresQualification,
    appointmentNotice: row.appointmentNotice, refundNotice: row.refundNotice,
  } : defaultOfferingForm())
  offeringSnapshot.value = JSON.stringify(offeringForm)
  void searchGoods()
  offeringDrawer.value = true
}
async function beforeOfferingClose(done: () => void) {
  if (submitting.value) return
  if (offeringDirty.value && !offeringReadOnly.value) {
    try { await ElMessageBox.confirm('尚有未保存的修改，关闭后将丢失。', '放弃修改？', { confirmButtonText: '放弃修改', cancelButtonText: '继续编辑', type: 'warning' }) } catch { return }
  }
  done()
}
function closeOffering() { void beforeOfferingClose(() => { offeringDrawer.value = false }) }
async function editPublishedOffering(row: ServiceOffering) {
  openOfferingDrawer(row)
  await unpublishAndEdit()
}
async function unpublishAndEdit() {
  if (!editingOffering.value || submitting.value) return
  try { await ElMessageBox.confirm('下架后将暂停新购买，已购订单不受影响。是否继续编辑？', '下架并编辑', { confirmButtonText: '下架并编辑', cancelButtonText: '取消', type: 'warning' }) } catch { return }
  submitting.value = true
  try {
    await serviceProgramApi.unpublishOffering(editingOffering.value.id)
    editingOffering.value = { ...editingOffering.value, status: 2 }
    ElMessage.success('已下架，现在可以编辑')
    await loadOfferings()
  } finally { submitting.value = false }
}
function resetOfferingForm() { offeringSnapshot.value = ''; offeringFormRef.value?.clearValidate(); editingOffering.value = null; editingOfferingId.value = null; Object.assign(offeringForm, defaultOfferingForm()) }
async function saveOffering() {
  if (!offeringFormRef.value || submitting.value || offeringReadOnly.value) return
  if (!await offeringFormRef.value.validate().catch(() => false)) return
  const priceFen = yuanToFen(offeringForm.priceYuan)
  if (offeringAmountError.value) { allocationSummaryRef.value?.scrollIntoView({ behavior: 'smooth', block: 'center' }); ElMessage.warning(offeringAmountError.value); return }
  if (!offeringForm.items.some(item => item.kind === 'service')) { ElMessage.warning('套餐至少需要包含一个服务项目'); return }
  if (offeringForm.items.some(item => !Number.isInteger(item.quantity) || item.quantity < 1)) { ElMessage.warning('每个项目的服务次数至少为 1 次'); return }
  if (priceFen > 0 && payoutTotalFen.value > priceFen) { ElMessage.warning('套餐售价不足以覆盖机构结算和默认推广收益'); return }
  const payload = {
    productId: Number(offeringForm.productId), institutionId: Number(offeringForm.institutionId), name: offeringForm.name.trim(), subtitle: offeringForm.subtitle.trim(),
    priceFen, validityDays: offeringForm.validityDays, requiresQualification: offeringForm.requiresQualification,
    appointmentNotice: offeringForm.appointmentNotice.trim(), refundNotice: offeringForm.refundNotice.trim(),
    defaultPromoterRateBps: Math.round(offeringForm.promoterRatePercent * 100),
    items: offeringForm.items.map(item => ({ kind: item.kind, skuId: item.kind === 'goods' ? item.skuId : undefined, deliveryMethod: item.deliveryMethod, returnNotice: item.returnNotice, name: item.name.trim(), description: item.description.trim(), quantity: item.quantity, allocatedAmountFen: yuanToFen(item.allocatedYuan), institutionSettlementFen: yuanToFen(item.settlementYuan) })),
  }
  submitting.value = true
  try {
    if (editingOfferingId.value) await serviceProgramApi.updateOffering(editingOfferingId.value, payload)
    else await serviceProgramApi.createOffering(payload)
    ElMessage.success(editingOfferingId.value ? '服务方案已更新' : '服务方案已创建')
    offeringDrawer.value = false
    await loadOfferings()
  } finally { submitting.value = false }
}
const readinessVisible = ref(false)
const readinessLoading = ref(false)
const readinessError = ref('')
const readinessOffering = ref<ServiceOffering | null>(null)
const readinessResult = ref<ServiceOfferingReadiness | null>(null)
const publishing = ref(false)
function readinessIssue(row: ServiceOffering) { return row.readiness?.checks.find(item => !item.passed)?.label || '点击查看完整检查项' }
function openReadiness(row: ServiceOffering) { if (readinessLoading.value) return; readinessOffering.value = row; readinessResult.value = null; readinessVisible.value = true; void refreshReadiness() }
async function refreshReadiness() {
  if (!readinessOffering.value || readinessLoading.value) return
  readinessLoading.value = true; readinessError.value = ''
  try { readinessResult.value = await serviceProgramApi.readiness(readinessOffering.value.id) }
  catch { readinessResult.value = null; readinessError.value = '检查失败，请重试' }
  finally { readinessLoading.value = false }
}
function resolveReadiness(target: ServiceOfferingReadiness['checks'][number]['target']) {
  const row = readinessOffering.value
  if (!row) return
  readinessVisible.value = false
  if (target === 'offering') { openOfferingDrawer(row); return }
  if (target === 'institution') { activeTab.value = 'institutions'; const institution = institutions.value.find(item => item.id === row.institutionId); if (institution) openInstitutionDialog(institution); return }
  if (target === 'slots') { void router.push({ path: '/service-appointments', query: { institutionId: row.institutionId, openSlots: '1' } }); return }
  void router.push(target === 'goods' ? '/shop/products' : '/products')
}
function publishOffering(row: ServiceOffering) { openReadiness(row) }
async function confirmPublish() {
  if (!readinessOffering.value || !readinessResult.value?.canPublish || publishing.value) return
  if (!readinessResult.value.checks.every(check => check.passed)) {
    try { await ElMessageBox.confirm('仍有展示、时段或库存条件未就绪，上架后可能暂时无法售卖。继续上架？', '确认上架', { confirmButtonText: '继续上架', cancelButtonText: '返回完善', type: 'warning' }) } catch { return }
  }
  publishing.value = true
  try { await serviceProgramApi.publishOffering(readinessOffering.value.id); readinessVisible.value = false; ElMessage.success('套餐已上架'); await loadOfferings() }
  finally { publishing.value = false }
}
async function unpublishOffering(row: ServiceOffering) {
  await ElMessageBox.confirm(`下架后新患者将无法购买“${row.name}”。`, '确认下架', { type: 'warning', confirmButtonText: '确认下架', cancelButtonText: '取消' })
  await serviceProgramApi.unpublishOffering(row.id); ElMessage.success('方案已下架'); await loadOfferings()
}

function openInstitutionDialog(row?: ServiceInstitution) {
  editingInstitutionId.value = row?.id ?? null
  Object.assign(institutionForm, row ? { partnerId: row.partnerId, name: row.name, address: row.address, contactName: row.contactName, contactPhone: row.contactPhone, active: row.status === 1, weekdays: [...row.receptionHours.weekdays], openTime: minuteText(row.receptionHours.startMinute), closeTime: minuteText(row.receptionHours.endMinute) } : defaultInstitutionForm())
  institutionDialog.value = true
}
function resetInstitutionForm() { institutionFormRef.value?.clearValidate(); editingInstitutionId.value = null; Object.assign(institutionForm, defaultInstitutionForm()) }
function minuteText(value: number) { return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}` }
function timeMinute(value: string) { const [hour, minute] = value.split(':').map(Number); return hour * 60 + minute }
async function saveInstitution() {
  if (!institutionFormRef.value) return
  await institutionFormRef.value.validate()
  const receptionHours = { weekdays: institutionForm.weekdays, startMinute: timeMinute(institutionForm.openTime), endMinute: timeMinute(institutionForm.closeTime) }
  if (!receptionHours.weekdays.length || receptionHours.startMinute >= receptionHours.endMinute) { ElMessage.warning('请设置有效的接待日和起止时间'); return }
  submitting.value = true
  try {
    if (editingInstitutionId.value) await serviceProgramApi.updateInstitution(editingInstitutionId.value, { receptionHours, name: institutionForm.name.trim(), address: institutionForm.address.trim(), contactName: institutionForm.contactName.trim(), contactPhone: institutionForm.contactPhone.trim(), status: institutionForm.active ? 1 : 0 })
    else await serviceProgramApi.createInstitution({ receptionHours, partnerId: Number(institutionForm.partnerId), name: institutionForm.name.trim(), address: institutionForm.address.trim(), contactName: institutionForm.contactName.trim(), contactPhone: institutionForm.contactPhone.trim() })
    ElMessage.success(editingInstitutionId.value ? '履约机构已更新' : '履约机构已创建')
    institutionDialog.value = false
    await loadInstitutions()
  } finally { submitting.value = false }
}

watch(queryProductId, (productId) => {
  filters.productId = productId
  activeTab.value = 'offerings'
  resetPageAndLoad()
})
onMounted(async () => { await Promise.all([loadInstitutions(), loadOptions()]); await loadOfferings() })
</script>

<style scoped lang="scss">
@use '@/styles/variables.scss' as *;
.readiness-row { display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 14px 0; border-bottom: 1px solid #edf0f2; }
.readiness-row p { margin: 4px 0 0; font-size: 12px; color: #64748b; }
.service-program-page { padding: 20px; }
.service-overview { display: grid; grid-template-columns: minmax(0, 1.6fr) minmax(360px, 1fr); gap: 24px; align-items: end; padding: 28px 30px; margin-bottom: 18px; color: #fff; border-radius: 16px; background: linear-gradient(125deg, #102a2a 0%, #11443f 62%, #0f766e 100%); box-shadow: 0 18px 38px rgba(15, 75, 70, .18); }
.service-overview__eyebrow { display: block; margin-bottom: 8px; color: #5eead4; font-size: 11px; font-weight: 800; letter-spacing: .16em; }
.service-overview h2 { margin: 0 0 8px; font-size: 24px; letter-spacing: -.02em; }
.service-overview p { max-width: 680px; margin: 0; color: rgba(255,255,255,.72); font-size: 13px; line-height: 1.7; }
.service-overview__metrics { display: grid; grid-template-columns: repeat(3, 1fr); overflow: hidden; border: 1px solid rgba(255,255,255,.14); border-radius: 12px; background: rgba(255,255,255,.06); }
.service-overview__metrics div { display: flex; flex-direction: column; gap: 4px; padding: 16px; border-left: 1px solid rgba(255,255,255,.12); }
.service-overview__metrics div:first-child { border-left: 0; }
.service-overview__metrics strong { font-size: 23px; }
.service-overview__metrics span { color: rgba(255,255,255,.6); font-size: 11px; }
.service-tabs { padding: 0 20px 18px; border: 1px solid $color-border; border-radius: $radius-lg; background: #fff; }
.service-tabs :deep(.el-tabs__header) { margin: 0 0 18px; }
.service-tabs :deep(.el-tabs__item) { height: 54px; font-weight: 700; }
.money { color: $color-danger; font-variant-numeric: tabular-nums; }
.institution-head { display: flex; align-items: center; justify-content: space-between; padding: 2px 0 16px; }
.institution-head h3 { margin: 0 0 4px; font-size: 16px; }
.institution-head p { margin: 0; color: $color-text-tertiary; font-size: 12px; }
.offering-drawer :deep(.el-drawer__header) { margin-bottom: 0; padding: 22px 28px; border-bottom: 1px solid $color-border; }
.offering-drawer :deep(.el-drawer__title) { font-size: 18px; font-weight: 600; color: #243b38; }
.offering-drawer :deep(.el-drawer__body) { padding: 0 28px; background: #f5f7f9; }
.offering-drawer :deep(.el-drawer__footer) { padding: 16px 28px; border-top: 1px solid $color-border; background: #fff; }
.offering-editor { display: grid; grid-template-columns: minmax(0, 1fr) 280px; gap: 24px; align-items: start; padding: 24px 0; }
.offering-editor__main { min-width: 0; }
.offering-editor__main > .el-alert { margin-bottom: 16px; }
.offering-form { padding-bottom: 0; }
.offering-form :deep(.el-form-item__label) { color: #465364; font-weight: 500; line-height: 22px; padding-bottom: 6px; }
.offering-form :deep(.el-form-item) { margin-bottom: 20px; }
.offering-preview { position: sticky; top: 0; padding: 22px; border: 1px solid #e0e8e8; border-radius: 12px; background: #fff; box-shadow: 0 4px 18px rgba(18, 56, 54, .04); }
.offering-preview__heading { display: flex; align-items: center; justify-content: space-between; color: #647477; font-size: 12px; }
.offering-preview h3 { margin: 20px 0 8px; font-size: 19px; color: #183d38; line-height: 1.5; overflow-wrap: anywhere; }
.offering-preview p { margin: 0; color: #76838b; font-size: 12px; line-height: 1.8; overflow-wrap: anywhere; }
.offering-preview__price { display: flex; flex-direction: column; gap: 4px; padding: 20px 0; color: #176c60; font-size: 30px; font-weight: 600; font-variant-numeric: tabular-nums; }
.offering-preview__price small { color: #82908d; font-size: 12px; font-weight: 400; }
.offering-preview dl { display: grid; gap: 14px; padding: 18px 0; margin: 0; border-top: 1px solid #edf0f1; }
.offering-preview dl > div { display: grid; grid-template-columns: 64px minmax(0, 1fr); gap: 12px; font-size: 12px; line-height: 1.7; }
.offering-preview dt { color: #82908d; }
.offering-preview dd { margin: 0; text-align: right; color: #384a48; overflow-wrap: anywhere; }
.offering-preview__items { display: grid; gap: 12px; padding: 18px 0; border-top: 1px solid #edf0f1; }
.offering-preview__items > div { display: flex; justify-content: space-between; gap: 12px; font-size: 12px; line-height: 1.6; }
.offering-preview__items span { overflow-wrap: anywhere; min-width: 0; }
.offering-preview__items strong { white-space: nowrap; font-weight: 500; }
.offering-preview__check { margin: 8px 0 12px; padding: 12px; border-radius: 8px; background: #edf8f5; color: #176c60; font-size: 12px; line-height: 1.6; }
.offering-preview__check--error { color: #a64b00; background: #fff3e9; }
.offering-preview__note { font-size: 11px !important; }
.drawer-footer__status { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.drawer-footer__status strong { color: #465364; font-size: 13px; font-weight: 500; }
.drawer-footer__status span { color: #82908d; font-size: 12px; }
.drawer-footer > div:last-child { flex-shrink: 0; }

.form-section { padding: 22px 24px 4px; margin-bottom: 16px; border: 1px solid $color-border; border-radius: 12px; background: #fff; }
.form-section:last-child { margin-bottom: 0; }
.form-section__title { display: flex; gap: 12px; align-items: flex-start; margin-bottom: 18px; }
.form-section__title > span { display: grid; place-items: center; width: 30px; height: 30px; color: $color-primary; font-size: 11px; font-weight: 800; border-radius: 9px; background: #e8f7f4; }
.form-section__title div { display: flex; flex-direction: column; gap: 3px; }
.form-section__title strong { font-size: 15px; }
.form-section__title small { color: $color-text-tertiary; }
.form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 18px; }
.form-grid--three { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.form-grid :deep(.el-select), .form-grid :deep(.el-input-number) { width: 100%; }
.allocation-summary { display: grid; gap: 8px; padding: 14px 16px; margin-bottom: 16px; border-radius: 8px; background: #edf8f5; }
.allocation-summary > div { display: flex; justify-content: space-between; gap: 12px; }
.allocation-summary small { color: $color-text-secondary; line-height: 1.6; }
.allocation-summary--error { background: #fff3e9; color: #a64b00; }
.allocation-summary .budget-error { color: $color-danger; }
.offering-item { padding: 18px; margin-bottom: 16px; border: 1px solid #e1e7ec; border-radius: 10px; background: #fbfcfd; }
.offering-item__head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.offering-item__amount { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px; padding: 12px; margin: 0 0 16px; color: $color-text-secondary; font-size: 12px; background: #eef3f5; border-radius: 6px; }
.add-item { width: 100%; margin-bottom: 20px; }
.field-suffix { margin-left: 8px; color: $color-text-tertiary; }
.drawer-footer { display: flex; align-items: center; justify-content: space-between; gap: 16px; width: 100%; }
.drawer-footer > span { color: $color-text-tertiary; font-size: 12px; }
@media (max-width: 960px) { .service-overview { grid-template-columns: 1fr; } .form-grid--three { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 900px) { .offering-editor { grid-template-columns: minmax(0, 1fr); } .offering-preview { position: static; } }
@media (max-width: 767px) { .offering-drawer :deep(.el-drawer__body) { padding: 0 14px; } .offering-drawer :deep(.el-drawer__header), .offering-drawer :deep(.el-drawer__footer) { padding: 16px; } .form-section { padding: 18px 16px 2px; } .drawer-footer { align-items: stretch; flex-direction: column; gap: 12px; } .drawer-footer > div:last-child { display: flex; justify-content: flex-end; } .service-program-page { padding: 12px; } .service-overview { padding: 22px 18px; } .service-overview__metrics, .form-grid, .form-grid--three { grid-template-columns: 1fr; } .service-overview__metrics div { border-left: 0; border-top: 1px solid rgba(255,255,255,.12); } .service-overview__metrics div:first-child { border-top: 0; } }
</style>
