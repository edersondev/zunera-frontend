<script setup>
import { computed, onMounted, reactive, shallowRef } from 'vue'
import { useRoute } from 'vue-router'
import FinancialAccountForm from '@/components/financial-accounts/FinancialAccountForm.vue'
import FinancialAccountLifecycleDialog from '@/components/financial-accounts/FinancialAccountLifecycleDialog.vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import {
  ACCOUNT_TYPE_LABELS,
  COLOR_LABELS,
  ICON_LABELS,
} from '@/utils/financial-accounts/accountOptions'
import { formatBRL } from '@/utils/financial-accounts/currency'
import { useFinancialAccountStore } from '@/stores/financial-accounts/financialAccountStore'

const route = useRoute()
const store = useFinancialAccountStore()
const successMessage = shallowRef('')
const lifecycle = reactive({
  visible: false,
  action: 'archive',
  account: null,
})

const accountId = computed(() => Number(route.params.id))

onMounted(async () => {
  await store.fetchAccount(accountId.value)
  await store.fetchSummary()
})

const account = computed(() => store.selectedAccount)

async function updateAccount(payload) {
  successMessage.value = ''

  try {
    await store.update(accountId.value, payload)
    successMessage.value = 'Account details saved.'
  } catch {
    // Store keeps the server error for the alert.
  }
}

function askLifecycle(action) {
  lifecycle.action = action
  lifecycle.account = account.value
  lifecycle.visible = true
}

async function confirmLifecycle() {
  successMessage.value = ''

  try {
    if (lifecycle.action === 'archive') {
      await store.archive(account.value)
    } else {
      await store.restore(account.value)
    }
    lifecycle.visible = false
    successMessage.value =
      lifecycle.action === 'archive' ? 'Financial account archived.' : 'Financial account restored.'
  } catch {
    // Store keeps the server error for the alert.
  }
}
</script>

<template>
  <div v-if="account" v-loading="store.loading">
    <PageHeader
      :title="account.name"
      :description="`${ACCOUNT_TYPE_LABELS[account.account_type] ?? account.account_type} · ${account.status}`"
    >
      <template #actions>
        <ElButton v-if="account.status === 'active'" @click="askLifecycle('archive')"
          >Archive account</ElButton
        >
        <ElButton v-else type="primary" @click="askLifecycle('restore')">Restore account</ElButton>
      </template>
    </PageHeader>

    <ElAlert
      v-if="successMessage"
      class="feedback"
      :title="successMessage"
      type="success"
      :closable="false"
      show-icon
    />
    <ElAlert
      v-if="store.error"
      class="feedback"
      :title="store.error.message"
      type="error"
      :closable="false"
      show-icon
    />

    <section class="detail-panel" aria-labelledby="details-title">
      <h2 id="details-title">Account details</h2>
      <dl class="detail-grid">
        <div>
          <dt>Financial institution</dt>
          <dd>{{ account.institution_name ?? 'Not provided' }}</dd>
        </div>
        <div>
          <dt>Color</dt>
          <dd>{{ COLOR_LABELS[account.color] ?? account.color }}</dd>
        </div>
        <div>
          <dt>Icon</dt>
          <dd>{{ ICON_LABELS[account.icon] ?? account.icon }}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{{ account.status }}</dd>
        </div>
        <div>
          <dt>Opening balance</dt>
          <dd>{{ formatBRL(account.initial_balance_centavos) }}</dd>
        </div>
        <div>
          <dt>Current balance</dt>
          <dd class="tabular">{{ formatBRL(account.current_balance_centavos) }}</dd>
        </div>
      </dl>
    </section>

    <section class="content-section" aria-labelledby="edit-title">
      <h2 id="edit-title">Edit account</h2>
      <FinancialAccountForm
        :account="account"
        :submitting="store.updating"
        @submit="updateAccount"
      />
    </section>

    <FinancialAccountLifecycleDialog
      v-model:visible="lifecycle.visible"
      :account="lifecycle.account"
      :action="lifecycle.action"
      :loading="store.lifecycleLoading"
      @confirm="confirmLifecycle"
    />
  </div>

  <ElEmpty v-else description="Account not found." />
</template>

<style scoped>
.feedback {
  margin-bottom: 16px;
}

.detail-panel {
  padding: 24px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
}

.detail-panel h2,
.content-section h2 {
  margin: 0 0 12px;
  color: var(--color-text);
  font-size: 20px;
  line-height: 28px;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px 24px;
  margin: 0;
}

.detail-grid dt {
  color: var(--color-text-muted);
  font-size: 14px;
  line-height: 20px;
}

.detail-grid dd {
  margin: 4px 0 0;
  color: var(--color-text);
  font-size: 16px;
  line-height: 24px;
}

.tabular {
  font-variant-numeric: tabular-nums;
}

.content-section {
  margin-top: 24px;
  padding: 24px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
}

@media (max-width: 640px) {
  .detail-grid {
    grid-template-columns: 1fr;
  }
}
</style>
