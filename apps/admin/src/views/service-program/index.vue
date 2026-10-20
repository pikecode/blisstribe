<template>
  <div class="service-program-page" :class="{ 'service-program-page--embedded': embedded }">
    <div v-if="!embedded" class="service-page-heading"><div><h2>服务套餐</h2><p>统一维护各产品的套餐；完整配置可从产品工作区开始。</p></div><el-button @click="router.push('/products')">进入产品管理</el-button></div>
    <el-alert v-if="institutionError && workspaceSection === 'packages'" :title="institutionError" type="error" :closable="false"><el-button link @click="loadInstitutions">重试加载机构</el-button></el-alert>
    <el-alert v-if="optionsError" :title="optionsError" type="error" :closable="false" show-icon><el-button link @click="loadOptions">重新加载</el-button></el-alert>
    <el-alert v-if="embedded && workspaceError && workspaceSection !== 'packages'" :title="workspaceError" type="error" :closable="false"><el-button @click="emit('refresh')">重新加载</el-button></el-alert>
    <el-skeleton v-else-if="embedded && workspaceLoading && workspaceSection !== 'packages'" :rows="5" animated />
    <section v-else-if="embedded && workspaceSection === 'fulfilment'" class="workspace-stage">
      <div class="stage-heading"><div><h3>履约准备</h3><p>这里展示当前产品套餐关联的机构。机构资料与时段由同机构的套餐共享。</p></div><el-button :loading="institutionLoading" @click="refreshWorkspace">刷新状态</el-button></div>
      <el-alert v-if="institutionError" :title="institutionError" type="error" :closable="false"><el-button @click="loadInstitutions">重试</el-button></el-alert>
      <el-skeleton v-else-if="institutionLoading" :rows="4" animated />
      <el-empty v-else-if="!relatedInstitutions.length" description="还没有关联的履约机构，先为产品添加一个套餐"><el-button type="primary" @click="emit('navigate', 'packages')">配置套餐</el-button></el-empty>
      <div v-else class="institution-grid"><article v-for="institution in relatedInstitutions" :key="institution.id" class="institution-card"><div class="institution-card__heading"><h4>{{ institution.name }}</h4><el-tag :type="institution.status === 1 ? 'success' : 'info'">{{ institution.status === 1 ? '启用' : '停用' }}</el-tag></div><p>{{ institution.address || '尚未填写服务地址' }}</p><dl><div><dt>运营联系</dt><dd>{{ [institution.contactName, institution.contactPhone].filter(Boolean).join(' · ') || '尚未填写' }}</dd></div><div><dt>接待时间</dt><dd>{{ receptionText(institution) }}</dd></div><div><dt>关联套餐</dt><dd>{{ workspaceOfferings.filter(item => item.institutionId === institution.id).map(item => item.name).join('、') }}</dd></div></dl><div class="institution-card__actions"><el-button @click="openInstitutionDialog(institution)">编辑机构</el-button><el-button type="primary" plain @click="openInstitutionSlots(institution.id)">维护可约时段</el-button></div></article></div>
    </section>
    <section v-else-if="embedded && workspaceSection === 'checks'" class="workspace-stage">
      <div class="stage-heading"><div><h3>套餐上线检查</h3><p>先完成介绍展示，再检查套餐配置与履约资源；两项状态分别维护。</p></div><el-button @click="emit('refresh')">刷新检查</el-button></div>
      <el-empty v-if="!workspaceOfferings.length" description="尚无套餐，请先配置服务内容与价格"><el-button type="primary" @click="emit('navigate', 'packages')">配置套餐</el-button></el-empty>
      <article v-for="row in workspaceOfferings" :key="row.id" class="launch-card"><div class="launch-card__heading"><div><h4>{{ row.name }}</h4><p>{{ row.institution.name }} · ¥{{ fenToYuan(row.priceFen) }} · {{ totalQuantity(row) }} 次服务</p></div><el-tag :type="statusMeta(row.status).type">{{ statusMeta(row.status).text }}</el-tag></div><div class="launch-card__issues"><template v-if="row.readiness"><span :class="{ ready: row.readiness.availableNow }">{{ row.readiness.summary }}</span><small>{{ row.readiness.checks.filter(check => !check.passed).map(check => check.label).join('、') || '当前配置和资源检查均通过' }}</small></template><span v-else>检查结果暂不可用，请重新加载</span></div><div class="launch-card__footer"><span>{{ row.requiresQualification ? '每位用户仍需单独确认购买资格' : '无需单独确认购买资格' }}</span><el-button type="primary" plain @click="openReadiness(row)">{{ row.status === 1 ? '查看检查结果' : '检查并上架' }}</el-button></div></article>
    </section>

    <el-tabs v-show="!embedded || workspaceSection === 'packages'" v-model="activeTab" class="service-tabs" :class="{ 'service-tabs--embedded': embedded }">
      <el-tab-pane label="服务套餐" name="offerings">
        <AdminListToolbar>
          <el-select v-if="!embedded" v-model="filters.productId" filterable clearable placeholder="全部服务产品" style="width: 220px">
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
          <el-table-column label="销售状态" width="110">
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

      <el-tab-pane v-if="!embedded" label="履约机构" name="institutions">
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
      <el-form ref="offeringFormRef" :model="offeringForm" :rules="offeringRules" :disabled="offeringReadOnly || submitting || !!optionsError || !!institutionError" :scroll-to-error="true" label-position="top" class="offering-form">
        <section class="form-section">
          <div class="form-section__title"><span>01</span><div><strong>基础信息</strong><small>患者看到的方案名称与实际履约机构</small></div></div>
          <div class="form-grid">
            <el-form-item label="服务产品" prop="productId"><el-select v-model="offeringForm.productId" :disabled="embedded" filterable placeholder="选择服务产品"><el-option v-for="item in products" :key="item.id" :label="item.title" :value="item.id" /></el-select></el-form-item>
            <el-form-item label="履约机构" prop="institutionId"><el-select v-model="offeringForm.institutionId" placeholder="选择履约机构"><el-option v-for="item in activeInstitutions" :key="item.id" :label="item.name" :value="item.id" /></el-select></el-form-item>
            <el-form-item label="方案名称" prop="name"><el-input v-model="offeringForm.name" maxlength="60" placeholder="如 初次评估服务" /></el-form-item>
            <el-form-item label="一句话说明"><el-input v-model="offeringForm.subtitle" maxlength="100" placeholder="帮助患者快速理解方案" /></el-form-item>
          </div>
        </section>

        <section class="form-section">
          <div class="form-section__title"><span>02</span><div><strong>服务与配套实物</strong><small>先确定提供哪些服务、各有几次，以及是否包含实物</small></div></div>
          <section v-for="(item, index) in offeringForm.items" :key="item.key" class="offering-item">
            <div class="offering-item__head"><div><el-tag size="small" :type="item.kind === 'goods' ? 'warning' : 'success'">{{ item.kind === 'goods' ? '实物' : '服务' }}</el-tag><strong> {{ item.name || `项目 ${index + 1}` }}</strong></div><el-button type="danger" text :disabled="offeringForm.items.length === 1" :aria-label="`移除项目 ${index + 1}`" @click="offeringForm.items.splice(index, 1)">移除</el-button></div>
            <p class="field-note">{{ item.kind === 'goods' ? '配套实物随套餐交付，引用商城商品规格与库存。' : '用户购买后获得对应次数的服务权益。' }}</p>
            <template v-if="item.kind === 'goods'">
              <el-form-item label="商城商品规格" :prop="`items.${index}.skuId`" :rules="[{ required: true, message: '请选择商品规格', trigger: 'change' }]"><el-select v-model="item.skuId" filterable remote :remote-method="searchGoods" :loading="goodsOptionsLoading" placeholder="搜索已上架商品" style="width:100%"><el-option v-if="item.skuId && !goodsSkuOptions.some(option => option.id === item.skuId)" :value="item.skuId" :label="item.skuLabel" /><el-option v-for="option in goodsSkuOptions" :key="option.id" :value="option.id" :label="option.label" /></el-select></el-form-item>
              <el-form-item label="交付方式"><el-radio-group v-model="item.deliveryMethod"><el-radio value="pickup">机构现场领取</el-radio><el-radio value="shipping">物流寄送</el-radio></el-radio-group></el-form-item>
              <el-form-item label="退货规则" :prop="`items.${index}.returnNotice`" :rules="[{ required: true, whitespace: true, message: '请填写退货规则', trigger: 'blur' }]"><el-input v-model="item.returnNotice" type="textarea" :rows="2" maxlength="500" placeholder="明确可退条件、申请期限和运费承担，购买前向患者展示" /></el-form-item>
            </template>
            <div class="form-grid">
              <el-form-item :label="item.kind === 'goods' ? '商品展示名称' : '服务项目'" :prop="`items.${index}.name`" :rules="[{ required: true, whitespace: true, message: '请输入服务项目名称', trigger: 'blur' }]"><el-input v-model="item.name" maxlength="60" placeholder="如 健康评估、护理服务" /></el-form-item>
              <el-form-item :label="item.kind === 'goods' ? '商品数量' : '服务次数'" :prop="`items.${index}.quantity`" :rules="[{ required: true, type: 'integer', min: 1, message: '请填写至少为1的整数', trigger: 'change' }]"><el-input-number v-model="item.quantity" :min="1" :max="999" :precision="0" controls-position="right" /></el-form-item>
            </div>

            <el-form-item label="项目说明"><el-input v-model="item.description" type="textarea" :rows="2" maxlength="200" placeholder="说明该项目实际交付的内容" /></el-form-item>
          </section>
          <div class="add-item-actions"><el-button plain :disabled="offeringForm.items.length >= 50" @click="offeringForm.items.push(newOfferingItem())">＋ 添加服务</el-button><el-button plain :disabled="offeringForm.items.length >= 50" @click="addGoodsItem">＋ 添加实物</el-button></div>

        </section>

        <section class="form-section">
          <div class="form-section__title"><span>03</span><div><strong>套餐价格与分配</strong><small>每个项目一行维护；分摊用于退款，结算用于机构，推广预算按套餐计算</small></div></div>
          <el-form-item label="套餐售价（元）" prop="priceYuan"><el-input-number v-model="offeringForm.priceYuan" :min="0" :precision="2" :step="10" controls-position="right" /></el-form-item>

          <div class="finance-table-wrap">
            <table class="finance-table">
              <thead><tr><th>服务项目</th><th>数量</th><th>退款分摊总额 <small>用于计算未使用部分退款</small></th><th>机构结算单价 <small>按次／件设置</small></th><th>结算小计</th></tr></thead>
              <tbody><tr v-for="(item, index) in offeringForm.items" :key="item.key"><td><strong>{{ item.name || `项目 ${index + 1}` }}</strong></td><td>{{ item.quantity }} {{ item.kind === 'goods' ? '件' : '次' }}</td><td><el-input-number v-model="item.allocatedYuan" :min="0" :precision="2" controls-position="right" /></td><td><el-input-number v-model="item.settlementYuan" :min="0" :precision="2" controls-position="right" /></td><td>¥{{ fenToYuan(yuanToFen(item.settlementYuan) * (item.quantity || 0)) }}</td></tr></tbody>
              <tfoot><tr><td colspan="2">分摊合计</td><td>¥{{ fenToYuan(allocatedTotalFen) }} <span :class="allocationDifferenceFen === 0 ? 'finance-ok' : 'finance-error'">{{ allocationDifferenceFen === 0 ? '与售价一致' : allocationDifferenceFen > 0 ? `还差 ¥${fenToYuan(allocationDifferenceFen)}` : `超出 ¥${fenToYuan(Math.abs(allocationDifferenceFen))}` }}</span></td><td>机构结算合计</td><td>¥{{ fenToYuan(settlementTotalFen) }}</td></tr></tfoot>
            </table>
          </div>
          <div ref="allocationSummaryRef" class="finance-toolbar"><span>退款分摊合计需等于套餐售价 ¥{{ fenToYuan(yuanToFen(offeringForm.priceYuan)) }}</span><el-button link type="primary" @click="assistAllocation">{{ offeringForm.items.length === 1 ? '售价填入项目' : '按数量辅助分摊' }}</el-button></div>

          <div class="finance-bottom">
            <div class="promoter-inline"><el-form-item label="主理人收益比例"><el-input-number v-model="offeringForm.promoterRatePercent" :min="0" :max="100" :precision="2" controls-position="right" /><span class="field-suffix">%</span></el-form-item><span>套餐售价 ¥{{ fenToYuan(yuanToFen(offeringForm.priceYuan)) }} × {{ offeringForm.promoterRatePercent || 0 }}% = <strong>推广收益预算 ¥{{ fenToYuan(promoterTotalFen) }}</strong></span></div>
            <div class="finance-remainder" :class="{ 'finance-remainder--error': budgetOverageFen > 0 }"><span>{{ budgetOverageFen > 0 ? '机构结算与推广预算超出售价' : '未配置去向金额' }}</span><strong>¥{{ fenToYuan(budgetOverageFen || unassignedAmountFen) }}</strong></div>
          </div>
          <el-alert v-if="offeringForm.priceYuan > 0 && payoutTotalFen > yuanToFen(offeringForm.priceYuan)" title="机构结算与推广收益预算合计超过套餐售价，请调整结算单价或收益比例。" type="error" :closable="false" />
          <p class="field-note">项目分摊是退款计算依据，不代表分给主理人；未配置去向金额也未指定给任何角色。以上仅为预算配置，当前不会自动生成收益账或打款。</p>
        </section>

        <section class="form-section">
          <div class="form-section__title"><span>04</span><div><strong>购买与履约规则</strong><small>明确购买条件、可使用期限及售后边界</small></div></div>
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
      <template #footer><div class="drawer-footer"><div class="drawer-footer__status"><strong>{{ offeringReadOnly ? '已上架 · 只读预览' : offeringDirty ? '有未保存的修改' : '保存后需上架才可购买' }}</strong><span v-if="!offeringReadOnly">{{ offeringAmountError || '保存后可继续上线检查' }}</span></div><div><el-button :disabled="submitting" @click="closeOffering">{{ offeringReadOnly ? '关闭' : '取消' }}</el-button><el-button v-if="offeringReadOnly" type="primary" :loading="submitting" @click="unpublishAndEdit">下架并编辑</el-button><el-button v-else :loading="submitting" @click="saveOffering(false)">保存套餐</el-button><el-button v-if="!offeringReadOnly" type="primary" :loading="submitting" @click="saveOffering(true)">保存并检查</el-button></div></div></template>
    </el-drawer>

    <el-dialog v-model="readinessVisible" title="套餐上架与可售检查" width="min(680px, 94vw)">
      <p>{{ readinessOffering?.name }}</p>
      <el-skeleton v-if="readinessLoading" :rows="5" animated />
      <el-alert v-else-if="readinessError" :title="readinessError" type="error" :closable="false"><el-button @click="refreshReadiness">重试检查</el-button></el-alert>
      <template v-else-if="readinessResult">
        <el-alert :title="readinessResult.summary" :type="readinessResult.canPublish ? 'info' : 'warning'" :closable="false" description="配置缺项会阻止上架；时段和库存随时变化，实际下单仍会再次校验。" />
        <div v-for="check in readinessResult.checks" :key="check.key" class="readiness-row"><div><strong>{{ check.label }}</strong><p>{{ check.passed ? '已就绪' : check.message }}</p></div><el-tag v-if="check.passed" type="success">通过</el-tag><el-button v-else link type="primary" @click="resolveReadiness(check.target, check.key)">去处理</el-button></div>
        <p class="table-subtitle">{{ readinessResult.requiresQualification ? '本套餐还需要针对每位用户单独确认购买资格。' : '本套餐无需单独确认购买资格。' }} 检查时间：{{ new Date(readinessResult.checkedAt).toLocaleString('zh-CN') }}</p>
      </template>
      <template #footer><el-button @click="readinessVisible = false">关闭</el-button><el-button :loading="readinessLoading" @click="refreshReadiness">刷新检查</el-button><el-button v-if="readinessOffering?.status !== 1" type="primary" :disabled="!readinessResult?.canPublish || readinessLoading || !!readinessError" :loading="publishing" @click="confirmPublish">确认上架</el-button></template>
    </el-dialog>

    <SlotManager v-model="slotsVisible" :institutions="institutions" :institution-id="slotsInstitutionId" @changed="refreshWorkspace" />

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
import SlotManager from './SlotManager.vue'
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

const props = withDefaults(defineProps<{ embedded?: boolean; product?: Product; workspaceSection?: string; workspaceOfferings?: ServiceOffering[]; workspaceLoading?: boolean; workspaceError?: string }>(), { embedded: false, workspaceSection: 'packages', workspaceOfferings: () => [], workspaceLoading: false, workspaceError: '' })
const emit = defineEmits<{ changed: []; refresh: []; navigate: [section: string] }>()
const optionsError = ref('')
const institutionError = ref('')
const slotsVisible = ref(false)
const slotsInstitutionId = ref<number>()
const relatedInstitutions = computed(() => institutions.value.filter(item => props.workspaceOfferings.some(offering => offering.institutionId === item.id)))
function receptionText(institution: ServiceInstitution) { const hours = institution.receptionHours; return `${hours.weekdays.map(day => ['周日','周一','周二','周三','周四','周五','周六'][day]).join('、')} ${minuteText(hours.startMinute)}–${minuteText(hours.endMinute)}` }
function openInstitutionSlots(id: number) { slotsInstitutionId.value = id; slotsVisible.value = true }
async function refreshWorkspace() { await loadInstitutions(); emit('refresh') }
function addGoodsItem() { offeringForm.items.push({ ...newOfferingItem(), kind: 'goods' }) }
async function assistAllocation() {
  const total = yuanToFen(offeringForm.priceYuan)
  if (!Number.isSafeInteger(total) || total < 0 || offeringForm.items.some(item => !Number.isInteger(item.quantity) || item.quantity < 1)) { ElMessage.warning('请先填写有效售价和项目数量'); return }
  try { await ElMessageBox.confirm('将按各项目数量占比分配套餐售价，覆盖当前分摊；余分按项目顺序补齐。请确认此比例符合实际退款规则。', '辅助分摊', { confirmButtonText: '确认填入', cancelButtonText: '取消' }) } catch { return }
  const quantity = offeringForm.items.reduce((sum, item) => sum + item.quantity, 0)
  const amounts = offeringForm.items.map(item => Math.floor(total * item.quantity / quantity))
  let remaining = total - amounts.reduce((sum, value) => sum + value, 0)
  offeringForm.items.forEach((item, index) => { item.allocatedYuan = (amounts[index] + (remaining-- > 0 ? 1 : 0)) / 100 })
}

const route = useRoute()
const router = useRouter()
const queryProductId = computed(() => {
  const value = props.embedded ? props.product?.id : Number(route.query.productId)
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : ''
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
const unassignedAmountFen = computed(() => Math.max(0, yuanToFen(offeringForm.priceYuan) - payoutTotalFen.value))
const budgetOverageFen = computed(() => Math.max(0, payoutTotalFen.value - yuanToFen(offeringForm.priceYuan)))
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
  if (props.embedded && !props.product?.id) return
  loading.value = true
  listError.value = ''
  try {
    const result = await serviceProgramApi.listOfferings({ ...filters, page: page.value, pageSize: pageSize.value })
    offerings.value = result.list
    total.value = result.total
  } catch { listError.value = '服务方案加载失败，请重试' } finally { loading.value = false }
}
async function loadInstitutions() {
  institutionLoading.value = true; institutionError.value = ''
  try { institutions.value = await serviceProgramApi.listInstitutions() } catch { institutionError.value = '机构资料加载失败，请重试' } finally { institutionLoading.value = false }
}
async function loadOptions() {
  optionsError.value = ''
  try {
  const [productResult, partnerResult] = await Promise.all([
    productApi.listProducts({ page: 1, pageSize: 100, productType: 'service' }),
    partnerApi.list({ page: 1, pageSize: 100, status: 1 }),
  ])
  products.value = props.product ? [props.product, ...productResult.list.filter(item => item.id !== props.product!.id)] : productResult.list
  partners.value = partnerResult.list
  } catch { optionsError.value = '产品或合作主体选项加载失败，请重试后编辑' }
}
function resetPageAndLoad() { page.value = 1; loadOfferings() }
function resetFilters() { Object.assign(filters, { productId: props.embedded ? queryProductId.value : '', institutionId: '', status: '' }); resetPageAndLoad() }

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
    await loadOfferings(); emit('changed')
  } finally { submitting.value = false }
}
function resetOfferingForm() { offeringSnapshot.value = ''; offeringFormRef.value?.clearValidate(); editingOffering.value = null; editingOfferingId.value = null; Object.assign(offeringForm, defaultOfferingForm()) }
async function saveOffering(checkAfter = false) {
  if (!offeringFormRef.value || submitting.value || offeringReadOnly.value || optionsError.value || institutionError.value) return
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
    const saved = editingOfferingId.value ? await serviceProgramApi.updateOffering(editingOfferingId.value, payload) : await serviceProgramApi.createOffering(payload)
    ElMessage.success(editingOfferingId.value ? '服务方案已更新' : '服务方案已创建')
    offeringSnapshot.value = JSON.stringify(offeringForm)
    offeringDrawer.value = false
    await loadOfferings()
    emit('changed')
    if (checkAfter) openReadiness(saved)
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
function resolveReadiness(target: ServiceOfferingReadiness['checks'][number]['target'], key?: string) {
  const row = readinessOffering.value
  if (!row) return
  readinessVisible.value = false
  if (target === 'offering') { openOfferingDrawer(row); return }
  if (target === 'institution') { if (!props.embedded) activeTab.value = 'institutions'; const institution = institutions.value.find(item => item.id === row.institutionId); if (institution) openInstitutionDialog(institution); return }
  if (target === 'slots' && props.embedded) { openInstitutionSlots(row.institutionId); return }
  if (target === 'product' && props.embedded) { emit('navigate', key === 'visibility' ? 'checks' : 'introduction'); return }
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
  try { await serviceProgramApi.publishOffering(readinessOffering.value.id); readinessVisible.value = false; ElMessage.success('套餐已上架'); await loadOfferings(); emit('changed') }
  finally { publishing.value = false }
}
async function unpublishOffering(row: ServiceOffering) {
  await ElMessageBox.confirm(`下架后新患者将无法购买“${row.name}”。`, '确认下架', { type: 'warning', confirmButtonText: '确认下架', cancelButtonText: '取消' })
  await serviceProgramApi.unpublishOffering(row.id); ElMessage.success('方案已下架'); await loadOfferings(); emit('changed')
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
    await loadInstitutions(); emit('changed')
  } finally { submitting.value = false }
}

async function confirmLeave() {
  if (submitting.value || publishing.value) return false
  if (!offeringDrawer.value || !offeringDirty.value || offeringReadOnly.value) return true
  try { await ElMessageBox.confirm('套餐有未保存的修改，离开后不会保留。', '离开工作区？', { confirmButtonText:'放弃修改并离开', cancelButtonText:'继续编辑', type:'warning' }); return true } catch { return false }
}
defineExpose({ confirmLeave, hasUnsavedChanges: computed(() => offeringDrawer.value && offeringDirty.value && !offeringReadOnly.value) })

watch(() => props.product, product => { if (product) products.value = [product, ...products.value.filter(item => item.id !== product.id)] })
watch(queryProductId, (productId) => {
  filters.productId = productId
  activeTab.value = 'offerings'
  resetPageAndLoad()
  if (props.product) products.value = [props.product, ...products.value.filter(item => item.id !== props.product!.id)]
})
onMounted(async () => { await Promise.all([loadInstitutions(), loadOptions()]); await loadOfferings() })
</script>

<style scoped lang="scss">
@use '@/styles/variables.scss' as *;
.service-page-heading { display:flex; justify-content:space-between; align-items:center; gap:20px; margin-bottom:20px; }
.service-page-heading h2 { margin:0 0 6px; font-size:20px; color:#243b38; }
.service-page-heading p,.stage-heading p { margin:0; color:#697b86; font-size:13px; line-height:1.8; }
.service-program-page--embedded { padding:0 !important; }
.service-tabs--embedded { padding:0 !important; border:0 !important; background:transparent !important; }
.service-tabs--embedded :deep(> .el-tabs__header) { display:none; }
.stage-heading { display:flex; justify-content:space-between; align-items:center; gap:20px; margin-bottom:20px; }
.stage-heading h3 { margin:0 0 8px; font-size:17px; color:#243b38; }
.institution-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:18px; }
.institution-card,.launch-card { border:1px solid #e2e8eb; border-radius:12px; background:#fff; padding:24px; }
.institution-card__heading,.launch-card__heading { display:flex; align-items:flex-start; justify-content:space-between; gap:16px; }
.institution-card h4,.launch-card h4 { margin:0; font-size:16px; line-height:1.6; color:#243b38; }
.institution-card p,.launch-card p { margin:10px 0 0; font-size:12px; color:#697b86; line-height:1.8; }
.institution-card dl { display:grid; gap:16px; margin:24px 0; font-size:12px; line-height:1.8; }
.institution-card dl > div { display:grid; grid-template-columns:64px 1fr; gap:16px; }
.institution-card dt { color:#798b92; }
.institution-card dd { margin:0; overflow-wrap:anywhere; }
.institution-card__actions { display:flex; justify-content:flex-end; flex-wrap:wrap; gap:8px; }
.launch-card { margin-bottom:16px; }
.launch-card__issues { display:grid; gap:8px; background:#faf7f0; color:#9a6808; border-radius:8px; padding:16px; margin:20px 0; font-size:13px; }
.launch-card__issues .ready { color:#0f766e; }
.launch-card__issues small { font-size:12px; color:#6e7d84; }
.launch-card__footer { display:flex; justify-content:space-between; align-items:center; gap:12px; }
.launch-card__footer > span { font-size:12px; color:#6e7d84; }
.add-item-actions { display:flex; gap:12px; margin-bottom:22px; }
.field-note { color:#6e7d84; font-size:12px; line-height:1.8; margin:0 0 18px; }
.allocation-tools { display:flex; justify-content:space-between; align-items:center; gap:16px; margin-bottom:16px; font-size:12px; color:#6e7d84; }
.finance-table-wrap { overflow-x:auto; border:1px solid #e4e9ec; border-radius:9px; background:#fff; }
.finance-table { width:100%; min-width:760px; border-collapse:collapse; text-align:left; }
.finance-table th,.finance-table td { padding:12px 14px; border-bottom:1px solid #edf0f2; color:#40535c; font-size:12px; }
.finance-table th { background:#f7f9fa; color:#566970; font-weight:650; white-space:nowrap; }
.finance-table th small { display:block; margin-top:4px; color:#859197; font-size:10px; font-weight:400; }
.finance-table td:first-child strong { font-size:13px; }
.finance-table td .el-input-number { width:145px; }
.finance-table tfoot td { border-bottom:0; background:#fafcfc; font-weight:650; white-space:nowrap; }
.finance-ok { margin-left:6px; color:#16815f; font-size:11px; font-weight:500; }
.finance-error { margin-left:6px; color:#c24135; font-size:11px; font-weight:500; }
.finance-toolbar { display:flex; align-items:center; justify-content:space-between; gap:16px; padding:8px 2px 14px; color:#79878c; font-size:11px; }
.finance-bottom { display:flex; align-items:center; justify-content:space-between; gap:20px; padding:14px 16px; border:1px solid #e7ecef; border-radius:9px; background:#fbfcfd; }
.promoter-inline { display:flex; align-items:center; flex-wrap:wrap; gap:20px; min-width:0; }
.promoter-inline .el-form-item { margin:0; }
.promoter-inline > span { color:#65757b; font-size:12px; }
.promoter-inline strong { color:#176c60; font-size:14px; }
.finance-remainder { display:grid; gap:4px; flex:0 0 auto; text-align:right; }
.finance-remainder span { color:#7a878c; font-size:11px; }
.finance-remainder strong { color:#68777d; font-size:16px; }
.finance-remainder--error span,.finance-remainder--error strong { color:#c24135; }
.form-section > :deep(.el-alert) { margin-top:14px; }
@media(max-width:1100px) { .institution-grid { grid-template-columns:1fr; } }
@media(max-width:800px) { .finance-bottom { align-items:flex-start; flex-direction:column; } .finance-remainder { text-align:left; } }
@media(max-width:600px) { .stage-heading,.launch-card__footer { align-items:flex-start; flex-direction:column; } .institution-card,.launch-card { padding:18px; } .finance-table td .el-input-number { width:130px; } .promoter-inline { align-items:flex-start; flex-direction:column; gap:10px; } }
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
