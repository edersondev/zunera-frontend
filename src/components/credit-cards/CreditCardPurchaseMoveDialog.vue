<script setup>
import { computed, nextTick, reactive, shallowRef, watch } from 'vue'
import { Check, Close } from '@element-plus/icons-vue'
import { ElAlert, ElButton, ElDialog, ElForm, ElFormItem, ElOption, ElRadio, ElRadioGroup, ElSelect } from 'element-plus'
import { useI18n } from 'vue-i18n'
import { formatBRL, formatIsoDate } from '@/utils/credit-cards/creditCardFormatters'

const props = defineProps({
  visible: { type: Boolean, default: false },
  purchase: { type: Object, default: null },
  initialInstallmentId: { type: [Number, String], default: null },
  options: { type: Object, default: null },
  optionsLoading: { type: Boolean, default: false },
  optionsError: { type: Object, default: null },
  preview: { type: Object, default: null },
  previewLoading: { type: Boolean, default: false },
  previewError: { type: Object, default: null },
  mutationError: { type: Object, default: null },
  history: { type: Array, default: () => [] },
  submitting: { type: Boolean, default: false },
  focusFallbackSelector: { type: String, default: '' },
})
const emit = defineEmits(['update:visible', 'request-options', 'request-preview', 'confirm', 'clear-preview'])
const { t, locale } = useI18n()
const selection = reactive({ mode: 'full_schedule', installmentId: null, targetClosingDate: null })
const localError = shallowRef('')
let returnFocus = null
let returnPurchaseId = null

const installments = computed(() => props.purchase?.installments ?? [])
const fieldErrors = computed(() => props.mutationError?.errors ?? props.previewError?.errors ?? {})
const errorMessage = computed(() => {
  const error = props.mutationError ?? props.previewError
  if (!error) return ''
  if (error.code === 'STALE_MOVE_PREVIEW') return t('creditCards.move.stale')
  return error.message || t('creditCards.move.error')
})
const canPreview = computed(() => Boolean(selection.targetClosingDate && (selection.mode !== 'one_installment' || selection.installmentId)))
const canConfirm = computed(() => Boolean(props.preview?.preview_token && !props.submitting && !props.previewLoading))

watch(() => props.visible, async (visible) => {
  if (visible) {
    returnFocus = document.activeElement
    returnPurchaseId = props.purchase?.id
    selection.mode = props.initialInstallmentId ? 'one_installment' : 'full_schedule'
    selection.installmentId = props.initialInstallmentId ? Number(props.initialInstallmentId) : null
    selection.targetClosingDate = null
    localError.value = ''
    emit('clear-preview')
    requestOptions()
  } else if (returnFocus?.focus) {
    await nextTick()
    restoreFocus()
  }
})

function restoreFocus() {
  const fallback = document.querySelector(`[data-test="credit-card-purchase-actions-${returnPurchaseId}"]`)
  const persistent = props.focusFallbackSelector ? document.querySelector(props.focusFallbackSelector) : null
  const target = fallback ?? persistent ?? (returnFocus?.isConnected ? returnFocus : null)
  target?.focus()
}

function restoreFocusAfterClose() {
  window.setTimeout(() => {
    if (!props.visible) restoreFocus()
  }, 0)
}

function statementOptionLabel(option) {
  return t('creditCards.statementChoice.option', {
    from: formatIsoDate(option.period_from, locale.value),
    to: formatIsoDate(option.period_to, locale.value),
    closing: formatIsoDate(option.closing_date, locale.value),
    due: formatIsoDate(option.due_date, locale.value),
  })
}

function movedAtLabel(value) {
  if (!value) return ''
  return t('creditCards.move.movedAt', {
    date: new Intl.DateTimeFormat(locale.value, {
      dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo',
    }).format(new Date(value)),
  })
}

watch(() => [selection.mode, selection.installmentId, selection.targetClosingDate], () => {
  localError.value = ''
  emit('clear-preview')
})

function requestOptions(fromMonth = null) {
  if (!props.purchase?.card?.id || !props.purchase.purchase_date) return
  emit('request-options', {
    cardId: props.purchase.card.id,
    purchaseDate: props.purchase.purchase_date,
    fromMonth,
  })
}

function payload() {
  return {
    mode: selection.mode,
    target_closing_date: selection.targetClosingDate,
    ...(selection.mode === 'one_installment' ? { installment_id: selection.installmentId } : {}),
  }
}

function requestPreview() {
  if (!canPreview.value) {
    localError.value = t('creditCards.move.chooseTarget')
    return
  }
  emit('request-preview', payload())
}

function confirm() {
  if (!canConfirm.value) return
  emit('confirm', { ...payload(), preview_token: props.preview.preview_token })
}
</script>

<template>
  <ElDialog
    :model-value="visible"
    :title="t('creditCards.move.title')"
    data-test="credit-card-purchase-move-dialog"
    @close="emit('update:visible', false)"
    @closed="restoreFocusAfterClose"
  >
    <p v-if="purchase" data-test="credit-card-move-purchase-name">{{ purchase.description }}</p>
    <ElAlert v-if="errorMessage" type="error" :closable="false" :title="errorMessage" data-test="credit-card-move-error" />
    <ElAlert v-if="optionsError" type="error" :closable="false" :title="optionsError.message || t('creditCards.move.optionsError')" />
    <ElForm label-position="top" @submit.prevent>
      <ElFormItem :label="t('creditCards.move.mode')" :error="fieldErrors.mode?.[0]">
        <ElRadioGroup v-model="selection.mode" data-test="credit-card-move-mode">
          <ElRadio value="full_schedule">{{ t('creditCards.move.fullSchedule') }}</ElRadio>
          <ElRadio value="one_installment">{{ t('creditCards.move.oneInstallment') }}</ElRadio>
        </ElRadioGroup>
      </ElFormItem>
      <ElFormItem
        v-if="selection.mode === 'one_installment'"
        :label="t('creditCards.move.installment')"
        :error="fieldErrors.installment_id?.[0]"
      >
        <ElSelect v-model="selection.installmentId" data-test="credit-card-move-installment">
          <ElOption
            v-for="installment in installments"
            :key="installment.id"
            :label="t('creditCards.move.installmentOption', { sequence: installment.sequence, count: purchase.installment_count })"
            :value="installment.id"
          />
        </ElSelect>
      </ElFormItem>
      <ElFormItem :label="t('creditCards.move.target')" :error="fieldErrors.target_closing_date?.[0] || localError">
        <ElSelect
          v-model="selection.targetClosingDate"
          :disabled="optionsLoading"
          :placeholder="t('creditCards.move.chooseTarget')"
          data-test="credit-card-move-target"
        >
          <ElOption
            v-for="option in options?.options ?? []"
            :key="option.closing_date"
            :label="statementOptionLabel(option)"
            :value="option.closing_date"
          />
        </ElSelect>
        <ElButton
          v-if="options?.next_from_month"
          text
          data-test="credit-card-move-more"
          @click="requestOptions(options.next_from_month)"
        >{{ t('creditCards.statementChoice.more') }}</ElButton>
      </ElFormItem>
      <p v-if="optionsLoading" role="status">{{ t('creditCards.statementChoice.loading') }}</p>
    </ElForm>

    <section v-if="preview" data-test="credit-card-move-preview" aria-live="polite">
      <h3>{{ t('creditCards.move.preview') }}</h3>
      <ul>
        <li v-for="item in preview.affected_installments" :key="item.installment_id">
          {{ t('creditCards.move.installmentOption', { sequence: item.sequence, count: purchase.installment_count }) }}:
          ({{ formatBRL(item.amount_centavos) }})
          <div>{{ t('creditCards.move.from') }} {{ statementOptionLabel(item.source) }}</div>
          <div>{{ t('creditCards.move.to') }} {{ statementOptionLabel(item.destination) }}</div>
        </li>
      </ul>
      <ul>
        <li v-for="item in preview.affected_statements" :key="item.closing_date">
          {{ formatIsoDate(item.closing_date) }}:
          {{ formatBRL(item.charge_before_centavos) }} → {{ formatBRL(item.charge_after_centavos) }}
          · {{ t('creditCards.move.outstanding') }} {{ formatBRL(item.outstanding_after_centavos) }}
          · {{ t('creditCards.move.surplus') }} {{ formatBRL(item.payment_surplus_after_centavos) }}
        </li>
      </ul>
    </section>
    <section v-if="history.length" data-test="credit-card-move-history">
      <h3>{{ t('creditCards.move.history') }}</h3>
      <ul>
        <li v-for="entry in history" :key="entry.id">
          {{ t('creditCards.move.installmentOption', { sequence: entry.sequence, count: purchase.installment_count }) }}
          · {{ t(entry.mode === 'full_schedule' ? 'creditCards.move.fullSchedule' : 'creditCards.move.oneInstallment') }}
          · {{ movedAtLabel(entry.moved_at) }}
          <div>{{ t('creditCards.move.from') }} {{ statementOptionLabel(entry.source) }}</div>
          <div>{{ t('creditCards.move.to') }} {{ statementOptionLabel(entry.destination) }}</div>
        </li>
      </ul>
    </section>

    <template #footer>
      <ElButton type="danger" :icon="Close" data-test="credit-card-move-cancel" @click="emit('update:visible', false)">
        {{ t('common.cancel') }}
      </ElButton>
      <ElButton :loading="previewLoading" :disabled="!canPreview || submitting" data-test="credit-card-move-preview-button" @click="requestPreview">
        {{ t('creditCards.move.preview') }}
      </ElButton>
      <ElButton type="primary" :icon="Check" :loading="submitting" :disabled="!canConfirm" data-test="credit-card-move-confirm" @click="confirm">
        {{ t('creditCards.move.confirm') }}
      </ElButton>
    </template>
  </ElDialog>
</template>

<style scoped>
section { margin-top: 1rem; }
section h3 { margin: 0 0 0.5rem; font-size: 1rem; }
section ul { display: grid; gap: 0.4rem; margin: 0 0 0.5rem; padding-left: 1.25rem; }
</style>
