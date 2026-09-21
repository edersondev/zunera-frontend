<script setup>
import { onMounted, shallowRef } from 'vue'
import { ElAlert, ElButton, ElDialog, ElEmpty, ElSkeleton } from 'element-plus'
import { ArrowLeft, Close, RefreshLeft } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import PageHeader from '@/components/layout/PageHeader.vue'
import { useCreditCardStore } from '@/stores/credit-cards/creditCardStore'
import { cardIdentityLabel, formatBRL } from '@/utils/credit-cards/creditCardFormatters'

const store = useCreditCardStore()
const { t } = useI18n()
const router = useRouter()
const restoreDialogVisible = shallowRef(false)
const restoringCard = shallowRef(null)
const successMessage = shallowRef('')

onMounted(() => store.fetchCards('archived'))

function openRestoreDialog(card) {
  successMessage.value = ''
  restoringCard.value = card
  restoreDialogVisible.value = true
}

function closeRestoreDialog() {
  if (store.submitting) return

  restoreDialogVisible.value = false
  restoringCard.value = null
}

async function confirmRestore() {
  if (!restoringCard.value) return

  const outcome = await store.restoreCard(restoringCard.value.id)
  if (!outcome.ok) return

  restoreDialogVisible.value = false
  restoringCard.value = null
  successMessage.value = t('creditCards.restoredSuccess')
}
</script>

<template>
  <section data-test="credit-cards-archived-view">
    <PageHeader
      :title="t('creditCards.archivedTitle')"
      :description="t('creditCards.archivedDescription')"
    >
      <template #actions>
        <ElButton
          :icon="ArrowLeft"
          data-test="credit-cards-archived-back"
          @click="router.push({ name: 'credit-cards' })"
        >
          {{ t('creditCards.detail.back') }}
        </ElButton>
      </template>
    </PageHeader>

    <ElAlert
      v-if="successMessage"
      class="!mb-4"
      type="success"
      :closable="false"
      :title="successMessage"
    />
    <ElAlert
      v-if="store.error"
      class="!mb-4"
      type="error"
      :closable="false"
      :title="store.error.message"
    />
    <ElSkeleton v-if="store.loading" :rows="2" animated />
    <ElEmpty
      v-else-if="store.archivedCards.length === 0"
      :description="t('creditCards.archivedEmpty')"
      data-test="credit-cards-archived-empty"
    />

    <ul v-else class="archived-cards">
      <li
        v-for="card in store.archivedCards"
        :key="card.id"
        :data-test="`credit-card-archived-${card.id}`"
        class="archived-cards__item"
      >
        <span class="archived-cards__name">{{ card.name }}</span>
        <span class="archived-cards__identity">{{ cardIdentityLabel(card) }}</span>
        <span class="archived-cards__muted">
          {{
            t('creditCards.archivedSummary', {
              limit: formatBRL(card.summary.credit_limit.amount_centavos),
            })
          }}
        </span>
        <div class="archived-cards__actions">
          <ElButton
            type="primary"
            :icon="RefreshLeft"
            :loading="store.submitting"
            :data-test="`credit-card-restore-${card.id}`"
            @click="openRestoreDialog(card)"
          >
            {{ t('creditCards.restore') }}
          </ElButton>
        </div>
      </li>
    </ul>

    <ElDialog
      :model-value="restoreDialogVisible"
      :title="t('creditCards.restoreTitle')"
      :close-on-click-modal="!store.submitting"
      :show-close="!store.submitting"
      data-test="credit-card-restore-dialog"
      @close="closeRestoreDialog"
    >
      <p class="restore-dialog__description">
        {{ t('creditCards.restoreConfirmation', { name: restoringCard?.name ?? '' }) }}
      </p>
      <ElAlert
        v-if="store.mutationError"
        class="!mt-4"
        type="error"
        :closable="false"
        :title="store.mutationError.message"
      />
      <template #footer>
        <ElButton
          type="danger"
          :icon="Close"
          :disabled="store.submitting"
          data-test="credit-card-restore-cancel"
          @click="closeRestoreDialog"
        >
          {{ t('common.cancel') }}
        </ElButton>
        <ElButton
          type="primary"
          :icon="RefreshLeft"
          :loading="store.submitting"
          data-test="credit-card-restore-confirm"
          @click="confirmRestore"
        >
          {{ t('creditCards.restore') }}
        </ElButton>
      </template>
    </ElDialog>
  </section>
</template>

<style scoped>
.archived-cards {
  display: grid;
  gap: 0.75rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.archived-cards__item {
  display: grid;
  gap: 0.25rem;
  padding: 0.75rem 1rem;
  border: 1px solid var(--el-border-color);
  border-radius: 0.75rem;
}

.archived-cards__name {
  font-weight: 600;
}

.archived-cards__identity,
.archived-cards__muted {
  font-size: 0.8125rem;
  color: var(--el-text-color-secondary);
}

.archived-cards__actions {
  margin-top: 0.5rem;
}

.restore-dialog__description {
  margin: 0;
  color: var(--el-text-color);
  line-height: 1.5rem;
}
</style>
