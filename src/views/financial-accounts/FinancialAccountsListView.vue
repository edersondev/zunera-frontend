<script setup>
import { onMounted, reactive, shallowRef } from 'vue'
import { Check, CirclePlus, Close, Edit, FolderOpened, Plus } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import FinancialAccountForm from '@/components/financial-accounts/FinancialAccountForm.vue'
import FinancialAccountLifecycleDialog from '@/components/financial-accounts/FinancialAccountLifecycleDialog.vue'
import FinancialAccountList from '@/components/financial-accounts/FinancialAccountList.vue'
import FinancialAccountSummary from '@/components/financial-accounts/FinancialAccountSummary.vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import { useFinancialAccountStore } from '@/stores/financial-accounts/financialAccountStore'

const store = useFinancialAccountStore()
const router = useRouter()
const formRef = shallowRef(null)
const createDialogVisible = shallowRef(false)
const editDialogVisible = shallowRef(false)
const editingAccount = shallowRef(null)
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
    createDialogVisible.value = false
    successMessage.value = 'Financial account created.'
  } catch {
    // Store keeps the server error for the alert.
  }
}

function openCreateDialog() {
  successMessage.value = ''
  createDialogVisible.value = true
}

function openArchivedAccounts() {
  router.push({ name: 'financial-accounts-archived' })
}

function closeCreateDialog() {
  createDialogVisible.value = false
}

async function updateAccount(payload) {
  if (!editingAccount.value) {
    return
  }

  successMessage.value = ''

  try {
    await store.update(editingAccount.value.id, payload)
    editDialogVisible.value = false
    editingAccount.value = null
    successMessage.value = 'Account details saved.'
  } catch {
    // Store keeps the server error for the alert.
  }
}

function openEditDialog(account) {
  successMessage.value = ''
  editingAccount.value = account
  editDialogVisible.value = true
}

function closeEditDialog() {
  editDialogVisible.value = false
  editingAccount.value = null
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
    >
      <template #actions>
        <ElButton
          data-test="open-create-account"
          type="primary"
          :icon="Plus"
          @click="openCreateDialog"
        >
          New account
        </ElButton>
        <ElButton
          data-test="open-archived-accounts"
          type="warning"
          :icon="FolderOpened"
          @click="openArchivedAccounts"
        >
          Archived
        </ElButton>
      </template>
    </PageHeader>

    <ElAlert
      v-if="successMessage"
      class="feedback"
      :title="successMessage"
      type="success"
      show-icon
    />
    <ElAlert
      v-if="store.error"
      class="feedback"
      :title="store.error.message"
      type="error"
      show-icon
    />

    <FinancialAccountSummary :summary="store.summary" />

    <section class="content-section" aria-labelledby="active-title">
      <h2 id="active-title">Active accounts</h2>
      <FinancialAccountList
        :accounts="store.accounts"
        editable
        :loading="store.loading"
        @archive="askArchive"
        @edit="openEditDialog"
      />
    </section>

    <ElDialog
      v-model="createDialogVisible"
      title="New account"
      width="min(92vw, 640px)"
      :close-on-click-modal="!store.creating"
      :close-on-press-escape="!store.creating"
      :show-close="!store.creating"
      destroy-on-close
    >
      <FinancialAccountForm
        ref="formRef"
        form-id="create-financial-account-form"
        :show-submit="false"
        :submitting="store.creating"
        @submit="createAccount"
      />

      <template #footer>
        <ElButton :icon="Close" :disabled="store.creating" type="danger" @click="closeCreateDialog">
          Cancel
        </ElButton>
        <ElButton
          data-test="create-account"
          :icon="CirclePlus"
          native-type="submit"
          type="primary"
          form="create-financial-account-form"
          :loading="store.creating"
        >
          Create account
        </ElButton>
      </template>
    </ElDialog>

    <ElDialog
      v-model="editDialogVisible"
      title="Edit account"
      width="min(92vw, 640px)"
      :close-on-click-modal="!store.updating"
      :close-on-press-escape="!store.updating"
      :show-close="!store.updating"
      destroy-on-close
    >
      <FinancialAccountForm
        v-if="editingAccount"
        form-id="edit-financial-account-form"
        :account="editingAccount"
        :show-submit="false"
        :submitting="store.updating"
        @submit="updateAccount"
      />

      <template #footer>
        <ElButton :icon="Close" :disabled="store.updating" type="danger" @click="closeEditDialog">
          Cancel
        </ElButton>
        <ElButton
          data-test="save-account"
          :icon="Check"
          native-type="submit"
          type="primary"
          form="edit-financial-account-form"
          :loading="store.updating"
        >
          Save changes
        </ElButton>
      </template>
    </ElDialog>

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
