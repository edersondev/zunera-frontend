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
    <PageHeader title="Financial accounts" description="Create and manage the accounts where your money is held." />

    <p v-if="successMessage" class="feedback feedback-success" role="status">{{ successMessage }}</p>
    <p v-if="store.error" class="feedback feedback-error" role="alert">{{ store.error.message }}</p>

    <FinancialAccountSummary :summary="store.summary" />

    <section class="content-section" aria-labelledby="create-title">
      <h2 id="create-title">New account</h2>
      <FinancialAccountForm ref="formRef" :submitting="store.creating" @submit="createAccount" />
    </section>

    <section class="content-section" aria-labelledby="active-title">
      <h2 id="active-title">Active accounts</h2>
      <FinancialAccountList
        :accounts="store.accounts"
        :loading="store.loading"
        @archive="askArchive"
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
</template>

<style scoped>
.feedback {
  margin-bottom: 16px;
  padding: 12px 16px;
  border-radius: var(--radius-md);
}

.feedback-success {
  border: 1px solid var(--color-success);
  color: var(--color-success);
  background: var(--color-surface);
}

.feedback-error {
  border: 1px solid var(--color-danger);
  color: var(--color-danger);
  background: var(--color-surface);
}

.content-section {
  margin-top: 24px;
}

.content-section h2 {
  margin: 0 0 12px;
  color: var(--color-text);
  font-size: 20px;
  line-height: 28px;
}
</style>
