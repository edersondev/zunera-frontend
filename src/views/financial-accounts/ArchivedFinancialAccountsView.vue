<script setup>
import { onMounted, reactive } from 'vue'
import { Wallet } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import FinancialAccountLifecycleDialog from '@/components/financial-accounts/FinancialAccountLifecycleDialog.vue'
import FinancialAccountList from '@/components/financial-accounts/FinancialAccountList.vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import { showActionSuccess } from '@/services/actionMessage'
import { useFinancialAccountStore } from '@/stores/financial-accounts/financialAccountStore'
import { useI18n } from 'vue-i18n'

const store = useFinancialAccountStore()
const { t } = useI18n()
const router = useRouter()
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

function openFinancialAccounts() {
  router.push({ name: 'financial-accounts' })
}

async function confirmRestore() {
  try {
    await store.restore(lifecycle.account)
    lifecycle.visible = false
    showActionSuccess(t('financialAccounts.restored'))
  } catch {
    // Store keeps the server error for the alert.
  }
}
</script>

<template>
  <div>
    <PageHeader
      :title="t('financialAccounts.archivedTitle')"
      :description="t('financialAccounts.archivedDescription')"
    >
      <template #actions>
        <ElButton data-test="open-financial-accounts" :icon="Wallet" @click="openFinancialAccounts">
          {{ t('financialAccounts.title') }}
        </ElButton>
      </template>
    </PageHeader>

    <ElAlert
      v-if="store.error"
      class="feedback"
      :title="store.error.message"
      type="error"
      show-icon
    />

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
}
</style>
