<script setup>
import { onMounted, reactive, shallowRef } from 'vue'
import { ElAlert, ElButton, ElEmpty, ElSkeleton } from 'element-plus'
import { Close, FolderDelete, FolderOpened, Plus } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import CreditCardForm from '@/components/credit-cards/CreditCardForm.vue'
import CreditCardManagementCard from '@/components/credit-cards/CreditCardManagementCard.vue'
import CreditCardsOverview from '@/components/credit-cards/CreditCardsOverview.vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import { useCreditCardStore } from '@/stores/credit-cards/creditCardStore'

const store = useCreditCardStore()
const { t } = useI18n()
const router = useRouter()
const formRef = shallowRef(null)
const createDialogVisible = shallowRef(false)
const editDialogVisible = shallowRef(false)
const editingCard = shallowRef(null)
const successMessage = shallowRef('')
const lifecycle = reactive({ visible: false, card: null })

onMounted(() => store.fetchCards('active'))

function openCreateDialog() {
  successMessage.value = ''
  createDialogVisible.value = true
}

function openEditDialog(card) {
  successMessage.value = ''
  editingCard.value = card
  editDialogVisible.value = true
}

function openCard(card) {
  router.push({ name: 'credit-card-detail', params: { card_id: card.id } })
}

function openArchived() {
  router.push({ name: 'credit-cards-archived' })
}

async function createCard(payload) {
  const outcome = await store.saveCard(payload)
  if (!outcome.ok) return

  formRef.value?.resetCreateForm?.()
  createDialogVisible.value = false
  successMessage.value = t('creditCards.created')
}

async function updateCard(payload) {
  if (!editingCard.value) return

  const outcome = await store.saveCard(payload, editingCard.value.id)
  if (!outcome.ok) return

  editDialogVisible.value = false
  editingCard.value = null
  successMessage.value = t('creditCards.saved')
}

function openLifecycle(card) {
  successMessage.value = ''
  lifecycle.card = card
  lifecycle.visible = true
}

async function confirmArchive() {
  if (!lifecycle.card) return

  const outcome = await store.archiveCard(lifecycle.card.id)
  if (!outcome.ok) return

  lifecycle.visible = false
  lifecycle.card = null
  successMessage.value = t('creditCards.archivedSuccess')
}
</script>

<template>
  <section class="credit-cards" data-test="credit-cards-view">
    <PageHeader :title="t('creditCards.title')" :description="t('creditCards.description')">
      <template #actions>
        <ElButton :icon="FolderOpened" data-test="credit-cards-archived-link" @click="openArchived">
          {{ t('creditCards.archived') }}
        </ElButton>
        <ElButton
          type="primary"
          :icon="Plus"
          data-test="credit-card-create"
          @click="openCreateDialog"
        >
          {{ t('creditCards.new') }}
        </ElButton>
      </template>
    </PageHeader>

    <ElAlert
      v-if="successMessage"
      type="success"
      :closable="false"
      :title="successMessage"
      class="!mb-4"
      data-test="credit-cards-success"
    />
    <ElAlert
      v-if="store.error"
      type="error"
      :closable="false"
      :title="store.error.message"
      class="!mb-4"
      data-test="credit-cards-error"
    />

    <ElSkeleton v-if="store.loading" :rows="3" animated data-test="credit-cards-loading" />

    <div v-else-if="!store.hasCards" class="credit-cards-empty" data-test="credit-cards-empty">
      <ElEmpty :image-size="64" :description="t('creditCards.management.emptyTitle')">
        <p>{{ t('creditCards.management.emptyHint') }}</p>
        <ElButton
          type="primary"
          :icon="Plus"
          data-test="credit-cards-empty-create"
          @click="openCreateDialog"
        >
          {{ t('creditCards.new') }}
        </ElButton>
      </ElEmpty>
    </div>

    <template v-else>
      <CreditCardsOverview :cards="store.cards" />
      <ul class="card-grid" data-test="credit-cards-grid">
        <li v-for="item in store.cards" :key="item.id">
          <CreditCardManagementCard
            :card="item"
            :loading="store.submitting"
            @open="openCard"
            @edit="openEditDialog"
            @archive="openLifecycle"
          />
        </li>
      </ul>
    </template>

    <CreditCardForm
      ref="formRef"
      v-model:visible="createDialogVisible"
      :submitting="store.submitting"
      :mutation-error="store.mutationError"
      @submit="createCard"
    />
    <CreditCardForm
      v-model:visible="editDialogVisible"
      :card="editingCard"
      :submitting="store.submitting"
      :mutation-error="store.mutationError"
      @submit="updateCard"
    />

    <ElDialog
      v-model="lifecycle.visible"
      :title="t('creditCards.archiveTitle')"
      data-test="credit-card-archive-dialog"
      @close="lifecycle.card = null"
    >
      <p>{{ t('creditCards.archiveConfirmation', { name: lifecycle.card?.name ?? '' }) }}</p>
      <p class="text-[0.8125rem] text-[var(--el-text-color-secondary)]">
        {{ t('creditCards.archiveBlockedHint') }}
      </p>
      <ElAlert
        v-if="store.mutationError"
        type="error"
        :closable="false"
        :title="store.mutationError.message"
        data-test="credit-card-archive-error"
      />
      <template #footer>
        <ElButton
          type="danger"
          :icon="Close"
          data-test="credit-card-archive-cancel"
          @click="lifecycle.visible = false"
          >{{ t('common.cancel') }}</ElButton
        >
        <ElButton
          type="info"
          :icon="FolderDelete"
          :loading="store.submitting"
          data-test="credit-card-archive-confirm"
          @click="confirmArchive"
        >
          {{ t('creditCards.archive') }}
        </ElButton>
      </template>
    </ElDialog>
  </section>
</template>

<style scoped>
.credit-cards {
  display: grid;
  gap: 24px;
}

.credit-cards-empty :deep(.el-empty__description) {
  margin-bottom: 8px;
}

.credit-cards-empty :deep(.el-empty__description p),
.credit-cards-empty :deep(.el-empty__bottom p) {
  color: var(--color-text-muted);
}

.credit-cards-empty :deep(.el-empty__bottom) {
  display: grid;
  justify-items: center;
  gap: 12px;
}

.credit-cards-empty :deep(.el-empty__bottom p) {
  max-width: 24rem;
  margin: 0;
  font-size: 14px;
  line-height: 20px;
  text-align: center;
}

.card-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 16px;
  margin: 0;
  padding: 0;
  list-style: none;
}

@media (min-width: 1024px) {
  .card-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
