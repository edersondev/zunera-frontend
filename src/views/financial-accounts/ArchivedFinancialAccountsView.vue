<script setup>
import { onMounted, reactive, shallowRef } from 'vue'
import FinancialAccountLifecycleDialog from '@/components/financial-accounts/FinancialAccountLifecycleDialog.vue'
import FinancialAccountList from '@/components/financial-accounts/FinancialAccountList.vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import { useFinancialAccountStore } from '@/stores/financial-accounts/financialAccountStore'

const store = useFinancialAccountStore()
const successMessage = shallowRef('')
const lifecycle = reactive({
  visible: false,
  action: 'restore',
  account: null,
})

onMounted(async () => {
  await store.fetchAccounts('archived')
})

function askRestore(account) {
  lifecycle.account = account
  lifecycle.visible = true
}

async function confirmRestore() {
  successMessage.value = ''

  try {
    await store.restore(lifecycle.account)
    lifecycle.visible = false
    successMessage.value = 'Financial account restored.'
  } catch {
    // Store keeps the server error for the alert.
  }
}
</script>

<template>
  <div>
    <PageHeader title="Archived accounts" description="Historical accounts stay available here until you restore them." />

    <p v-if="successMessage" class="feedback feedback-success" role="status">{{ successMessage }}</p>
    <p v-if="store.error" class="feedback feedback-error" role="alert">{{ store.error.message }}</p>

    <FinancialAccountList
      :accounts="store.archivedAccounts"
      archived
      :loading="store.loading"
      @restore="askRestore"
    />

    <FinancialAccountLifecycleDialog
      v-model:visible="lifecycle.visible"
      :account="lifecycle.account"
      :action="lifecycle.action"
      :loading="store.lifecycleLoading"
      @confirm="confirmRestore"
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
</style>
