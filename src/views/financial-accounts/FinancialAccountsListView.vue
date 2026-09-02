<script setup>
import { onMounted, reactive, shallowRef } from 'vue'
import FinancialAccountForm from '@/components/financial-accounts/FinancialAccountForm.vue'
import FinancialAccountLifecycleDialog from '@/components/financial-accounts/FinancialAccountLifecycleDialog.vue'
import FinancialAccountList from '@/components/financial-accounts/FinancialAccountList.vue'
import FinancialAccountSummary from '@/components/financial-accounts/FinancialAccountSummary.vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import { useFinancialAccountStore } from '@/stores/financial-accounts/financialAccountStore'

const store = useFinancialAccountStore()
const formRef = shallowRef(null)
const successMessage = shallowRef('')
const lifecycle = reactive({
  visible: false,
  action: 'archive',
  account: null,
})

onMounted(async () => {
  await Promise.allSettled([store.fetchAccounts('active'), store.fetchSummary()])
})

async function createAccount(payload) {
  successMessage.value = ''

  try {
    await store.create(payload)
    if (typeof formRef.value?.resetCreateForm === 'function') {
      formRef.value.resetCreateForm()
    }
    successMessage.value = 'Financial account created.'
  } catch {
    // Store keeps the server error for the alert.
  }
}

function askArchive(account) {
  lifecycle.account = account
  lifecycle.action = 'archive'
  lifecycle.visible = true
}

async function confirmLifecycle() {
  successMessage.value = ''

  try {
    await store.archive(lifecycle.account)
    lifecycle.visible = false
    successMessage.value = 'Financial account archived.'
  } catch {
    // Store keeps the server error for the alert.
  }
}
</script>

<template>
  <div>
    <PageHeader
      title="Financial accounts"
      description="Create and manage the accounts where your money is held."
    />

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

    <FinancialAccountSummary :summary="store.summary" />

    <div class="accounts-workspace">
      <section class="content-section content-section--create" aria-labelledby="create-title">
        <h2 id="create-title">New account</h2>
        <FinancialAccountForm ref="formRef" :submitting="store.creating" @submit="createAccount" />
      </section>

      <section class="content-section content-section--accounts" aria-labelledby="active-title">
        <h2 id="active-title">Active accounts</h2>
        <FinancialAccountList
          :accounts="store.accounts"
          :loading="store.loading"
          @archive="askArchive"
        />
      </section>
    </div>

    <FinancialAccountLifecycleDialog
      v-model:visible="lifecycle.visible"
      :account="lifecycle.account"
      :action="lifecycle.action"
      :loading="store.lifecycleLoading"
      @confirm="confirmLifecycle"
    />
  </div>
</template>

<style scoped>
.feedback {
  margin-bottom: 16px;
}

.accounts-workspace {
  display: grid;
  gap: 24px;
  margin-top: 24px;
}

.content-section {
  min-width: 0;
}

.content-section h2 {
  margin: 0 0 12px;
  color: var(--color-text);
  font-size: 20px;
  line-height: 28px;
}

.content-section--create {
  padding: 24px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
}

@media (min-width: 1024px) {
  .accounts-workspace {
    grid-template-columns: minmax(280px, 420px) minmax(0, 1fr);
    align-items: start;
  }
}
</style>
