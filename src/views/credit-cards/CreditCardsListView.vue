<script setup>
import { onMounted, reactive, shallowRef } from 'vue'
import { ElAlert, ElButton, ElEmpty, ElSkeleton, ElTag } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import CreditCardForm from '@/components/credit-cards/CreditCardForm.vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import { useCreditCardStore } from '@/stores/credit-cards/creditCardStore'
import {
  availableCreditPresentation,
  billingCycleSummary,
  cardIdentityLabel,
  formatBRL,
  statementStatus,
} from '@/utils/credit-cards/creditCardFormatters'

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
        <ElButton data-test="credit-cards-archived-link" @click="openArchived">
          {{ t('creditCards.archived') }}
        </ElButton>
        <ElButton type="primary" :icon="Plus" data-test="credit-card-create" @click="openCreateDialog">
          {{ t('creditCards.new') }}
        </ElButton>
      </template>
    </PageHeader>

    <ElAlert
      v-if="successMessage"
      type="success"
      :closable="false"
      :title="successMessage"
      data-test="credit-cards-success"
    />
    <ElAlert
      v-if="store.error"
      type="error"
      :closable="false"
      :title="store.error.message"
      data-test="credit-cards-error"
    />

    <ElSkeleton v-if="store.loading" :rows="3" animated data-test="credit-cards-loading" />

    <ElEmpty v-else-if="!store.hasCards" :description="t('creditCards.empty')" data-test="credit-cards-empty">
      <ElButton type="primary" data-test="credit-cards-empty-create" @click="openCreateDialog">
        {{ t('creditCards.new') }}
      </ElButton>
    </ElEmpty>

    <ul v-else class="credit-cards__list">
      <li v-for="item in store.cards" :key="item.id" class="credit-cards__item" :data-test="`credit-card-${item.id}`">
        <button type="button" class="credit-cards__open" :data-test="`credit-card-open-${item.id}`" @click="openCard(item)">
          <span class="credit-cards__name">{{ item.name }}</span>
          <span class="credit-cards__identity">{{ cardIdentityLabel(item) }}</span>
          <span class="credit-cards__cycle">{{ t('creditCards.cycle', billingCycleSummary(item)) }}</span>
        </button>

        <dl class="credit-cards__summary">
          <div>
            <dt>{{ t('creditCards.summary.limit') }}</dt>
            <dd>{{ formatBRL(item.summary.credit_limit.amount_centavos) }}</dd>
          </div>
          <div>
            <dt>{{ t('creditCards.summary.used') }}</dt>
            <dd>{{ formatBRL(item.summary.used_credit.amount_centavos) }}</dd>
          </div>
          <div>
            <dt>{{ t('creditCards.summary.cardCredit') }}</dt>
            <dd>{{ formatBRL(item.summary.card_credit.amount_centavos) }}</dd>
          </div>
          <div>
            <dt>{{ t('creditCards.summary.available') }}</dt>
            <dd :data-test="`credit-card-available-${item.id}`">
              {{ formatBRL(item.summary.available_credit.amount_centavos) }}
            </dd>
          </div>
        </dl>

        <p v-if="item.summary.is_over_limit" class="credit-cards__over-limit" :data-test="`credit-card-over-limit-${item.id}`">
          {{ t('creditCards.overLimit', { amount: availableCreditPresentation(item.summary.available_credit.amount_centavos).formatted }) }}
        </p>

        <div class="credit-cards__current">
          <ElTag :type="statementStatus(item.current_statement.status).tone" data-test="credit-card-current-status">
            {{ t(statementStatus(item.current_statement.status).labelKey) }}
          </ElTag>
          <span data-test="credit-card-current-outstanding">
            {{ t('creditCards.currentStatement', { amount: formatBRL(item.current_statement.outstanding_amount.amount_centavos) }) }}
          </span>
        </div>

        <div class="credit-cards__actions">
          <ElButton data-test="credit-card-edit" @click="openEditDialog(item)">{{ t('common.edit') }}</ElButton>
          <ElButton type="danger" plain data-test="credit-card-archive" @click="openLifecycle(item)">
            {{ t('creditCards.archive') }}
          </ElButton>
        </div>
      </li>
    </ul>

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
      <p class="credit-cards__hint">{{ t('creditCards.archiveBlockedHint') }}</p>
      <ElAlert
        v-if="store.mutationError"
        type="error"
        :closable="false"
        :title="store.mutationError.message"
        data-test="credit-card-archive-error"
      />
      <template #footer>
        <ElButton data-test="credit-card-archive-cancel" @click="lifecycle.visible = false">{{ t('common.cancel') }}</ElButton>
        <ElButton type="danger" :loading="store.submitting" data-test="credit-card-archive-confirm" @click="confirmArchive">
          {{ t('creditCards.archive') }}
        </ElButton>
      </template>
    </ElDialog>
  </section>
</template>

<style scoped>
.credit-cards__list {
  display: grid;
  gap: 1rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.credit-cards__item {
  display: grid;
  gap: 0.75rem;
  padding: 1rem;
  border: 1px solid var(--el-border-color);
  border-radius: 0.75rem;
}

.credit-cards__open {
  display: grid;
  gap: 0.125rem;
  padding: 0;
  text-align: start;
  background: none;
  border: none;
  cursor: pointer;
}

.credit-cards__name {
  font-weight: 600;
}

.credit-cards__identity,
.credit-cards__cycle,
.credit-cards__hint {
  font-size: 0.8125rem;
  color: var(--el-text-color-secondary);
}

.credit-cards__summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
  gap: 0.5rem;
  margin: 0;
}

.credit-cards__summary dt {
  font-size: 0.75rem;
  color: var(--el-text-color-secondary);
}

.credit-cards__summary dd {
  margin: 0;
  font-variant-numeric: tabular-nums;
}

.credit-cards__over-limit {
  margin: 0;
  font-weight: 600;
  color: var(--el-color-danger);
}

.credit-cards__current,
.credit-cards__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}

@media (min-width: 1024px) {
  .credit-cards__list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .credit-cards__item {
    min-block-size: 100%;
  }
}
</style>
