<script setup>
import { onMounted, reactive, shallowRef } from 'vue'
import { ElAlert, ElButton, ElEmpty, ElSkeleton, ElTag } from 'element-plus'
import { FolderOpened, Plus } from '@element-plus/icons-vue'
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

    <ElEmpty
      v-else-if="!store.hasCards"
      :description="t('creditCards.empty')"
      data-test="credit-cards-empty"
    >
      <ElButton
        type="primary"
        :icon="Plus"
        data-test="credit-cards-empty-create"
        @click="openCreateDialog"
      >
        {{ t('creditCards.new') }}
      </ElButton>
    </ElEmpty>

    <ul v-else class="m-0 grid list-none gap-4 p-0 lg:grid-cols-2">
      <li
        v-for="item in store.cards"
        :key="item.id"
        class="grid min-h-full gap-3 rounded-xl border border-[var(--el-border-color)] p-4"
        :data-test="`credit-card-${item.id}`"
      >
        <button
          type="button"
          class="grid cursor-pointer gap-0.5 border-0 bg-transparent p-0 text-left"
          :data-test="`credit-card-open-${item.id}`"
          @click="openCard(item)"
        >
          <span class="font-semibold">{{ item.name }}</span>
          <span class="text-[0.8125rem] text-[var(--el-text-color-secondary)]">{{
            cardIdentityLabel(item)
          }}</span>
          <span class="text-[0.8125rem] text-[var(--el-text-color-secondary)]">{{
            t('creditCards.cycle', billingCycleSummary(item))
          }}</span>
        </button>

        <dl class="m-0 grid grid-cols-[repeat(auto-fit,minmax(9rem,1fr))] gap-2">
          <div>
            <dt class="text-xs text-[var(--el-text-color-secondary)]">
              {{ t('creditCards.summary.limit') }}
            </dt>
            <dd class="m-0 tabular-nums">
              {{ formatBRL(item.summary.credit_limit.amount_centavos) }}
            </dd>
          </div>
          <div>
            <dt class="text-xs text-[var(--el-text-color-secondary)]">
              {{ t('creditCards.summary.used') }}
            </dt>
            <dd class="m-0 tabular-nums">
              {{ formatBRL(item.summary.used_credit.amount_centavos) }}
            </dd>
          </div>
          <div>
            <dt class="text-xs text-[var(--el-text-color-secondary)]">
              {{ t('creditCards.summary.cardCredit') }}
            </dt>
            <dd class="m-0 tabular-nums">
              {{ formatBRL(item.summary.card_credit.amount_centavos) }}
            </dd>
          </div>
          <div>
            <dt class="text-xs text-[var(--el-text-color-secondary)]">
              {{ t('creditCards.summary.available') }}
            </dt>
            <dd class="m-0 tabular-nums" :data-test="`credit-card-available-${item.id}`">
              {{ formatBRL(item.summary.available_credit.amount_centavos) }}
            </dd>
          </div>
        </dl>

        <p
          v-if="item.summary.is_over_limit"
          class="m-0 font-semibold text-[var(--el-color-danger)]"
          :data-test="`credit-card-over-limit-${item.id}`"
        >
          {{
            t('creditCards.overLimit', {
              amount: availableCreditPresentation(item.summary.available_credit.amount_centavos)
                .formatted,
            })
          }}
        </p>

        <div class="flex flex-wrap items-center gap-2">
          <ElTag
            :type="statementStatus(item.current_statement.status).tone"
            data-test="credit-card-current-status"
          >
            {{ t(statementStatus(item.current_statement.status).labelKey) }}
          </ElTag>
          <span data-test="credit-card-current-outstanding">
            {{
              t('creditCards.currentStatement', {
                amount: formatBRL(item.current_statement.outstanding_amount.amount_centavos),
              })
            }}
          </span>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <ElButton data-test="credit-card-edit" @click="openEditDialog(item)">{{
            t('common.edit')
          }}</ElButton>
          <ElButton
            type="danger"
            plain
            data-test="credit-card-archive"
            @click="openLifecycle(item)"
          >
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
          data-test="credit-card-archive-cancel"
          @click="lifecycle.visible = false"
          >{{ t('common.cancel') }}</ElButton
        >
        <ElButton
          type="danger"
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
