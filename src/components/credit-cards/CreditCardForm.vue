<script setup>
import { computed, reactive, shallowRef, watch } from 'vue'
import {
  ElAlert,
  ElButton,
  ElCol,
  ElDialog,
  ElForm,
  ElFormItem,
  ElInput,
  ElInputNumber,
  ElOption,
  ElRow,
  ElSelect,
} from 'element-plus'
import { Check, Close } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'
import CurrencyAmountInput from '@/components/common/CurrencyAmountInput.vue'
import { availableCreditPresentation } from '@/utils/credit-cards/creditCardFormatters'

const props = defineProps({
  visible: { type: Boolean, default: false },
  card: { type: Object, default: null },
  submitting: { type: Boolean, default: false },
  mutationError: { type: Object, default: null },
})

const emit = defineEmits(['update:visible', 'submit'])
const { t } = useI18n()
const formRef = shallowRef(null)
const isEditing = computed(() => props.card !== null)
const COLORS = ['teal', 'blue', 'violet', 'amber', 'rose', 'cyan']
const ICONS = ['credit_card', 'bank', 'wallet', 'smartphone', 'circle']

const form = reactive({
  name: '',
  institution_name: '',
  last_four: '',
  credit_limit_centavos: null,
  closing_day: 10,
  due_day: 17,
  color: 'violet',
  icon: 'credit_card',
})

const fieldErrors = computed(() => props.mutationError?.errors ?? {})
const errorMessage = computed(() =>
  props.mutationError && !Object.keys(fieldErrors.value).length ? props.mutationError.message : '',
)
const limitPresentation = computed(() =>
  availableCreditPresentation(form.credit_limit_centavos ?? 0),
)

watch(
  () => [props.visible, props.card],
  ([visible, card]) => {
    if (!visible) return
    resetForm(card)
  },
  { immediate: true },
)

function resetForm(card = null) {
  form.name = card?.name ?? ''
  form.institution_name = card?.institution_name ?? ''
  form.last_four = card?.last_four ?? ''
  form.credit_limit_centavos = card?.summary?.credit_limit?.amount_centavos ?? null
  form.closing_day = card?.closing_day ?? 10
  form.due_day = card?.due_day ?? 17
  form.color = card?.color ?? 'violet'
  form.icon = card?.icon ?? 'credit_card'
  formRef.value?.clearValidate?.()
}

function resetCreateForm() {
  resetForm(null)
}

function close() {
  formRef.value?.clearValidate?.()
  emit('update:visible', false)
}

function sanitizeLastFour(value) {
  form.last_four = value.replace(/\D/g, '').slice(0, 4)
}

function submit() {
  emit('submit', {
    name: form.name.trim(),
    institution_name: form.institution_name.trim(),
    last_four: form.last_four.trim() === '' ? null : form.last_four.trim(),
    credit_limit_centavos: form.credit_limit_centavos,
    closing_day: form.closing_day,
    due_day: form.due_day,
    color: form.color,
    icon: form.icon,
  })
}

defineExpose({ resetCreateForm })
</script>

<template>
  <ElDialog
    :model-value="visible"
    :title="isEditing ? t('creditCards.form.editTitle') : t('creditCards.form.createTitle')"
    data-test="credit-card-form-dialog"
    @close="close"
  >
    <ElAlert
      v-if="errorMessage"
      type="error"
      :closable="false"
      :title="errorMessage"
      data-test="credit-card-form-error"
    />

    <ElForm ref="formRef" label-position="top" @submit.prevent>
      <ElRow :gutter="16">
        <ElCol :xs="24" :md="12">
          <ElFormItem :label="t('creditCards.form.name')" :error="fieldErrors.name?.[0]">
            <ElInput v-model="form.name" maxlength="100" data-test="credit-card-name" />
          </ElFormItem>
        </ElCol>

        <ElCol :xs="24" :md="12">
          <ElFormItem
            :label="t('creditCards.form.institution')"
            :error="fieldErrors.institution_name?.[0]"
          >
            <ElInput
              v-model="form.institution_name"
              maxlength="100"
              data-test="credit-card-institution"
            />
          </ElFormItem>
        </ElCol>
      </ElRow>

      <ElRow :gutter="16">
        <ElCol :xs="24" :md="12">
          <ElFormItem :label="t('creditCards.form.lastFour')" :error="fieldErrors.last_four?.[0]">
            <ElInput
              v-model="form.last_four"
              maxlength="4"
              inputmode="numeric"
              @input="sanitizeLastFour"
              data-test="credit-card-last-four"
            />
          </ElFormItem>
        </ElCol>

        <ElCol :xs="24" :md="12">
          <ElFormItem
            :label="t('creditCards.form.limit')"
            :error="fieldErrors.credit_limit_centavos?.[0]"
          >
            <CurrencyAmountInput
              v-model="form.credit_limit_centavos"
              data-test="credit-card-limit"
            />
            <p class="credit-card-form__hint" data-test="credit-card-limit-preview">
              {{ limitPresentation.formatted }}
            </p>
          </ElFormItem>
        </ElCol>
      </ElRow>

      <ElRow :gutter="16">
        <ElCol :xs="24" :md="12">
          <ElFormItem
            :label="t('creditCards.form.closingDay')"
            :error="fieldErrors.closing_day?.[0]"
          >
            <ElInputNumber
              v-model="form.closing_day"
              :min="1"
              :max="31"
              data-test="credit-card-closing-day"
            />
          </ElFormItem>
        </ElCol>

        <ElCol :xs="24" :md="12">
          <ElFormItem :label="t('creditCards.form.dueDay')" :error="fieldErrors.due_day?.[0]">
            <ElInputNumber
              v-model="form.due_day"
              :min="1"
              :max="31"
              data-test="credit-card-due-day"
            />
          </ElFormItem>
        </ElCol>
      </ElRow>

      <ElRow :gutter="16">
        <ElCol :xs="24" :md="12">
          <ElFormItem :label="t('creditCards.form.color')" :error="fieldErrors.color?.[0]">
            <ElSelect v-model="form.color" data-test="credit-card-color">
              <ElOption
                v-for="color in COLORS"
                :key="color"
                :label="t(`creditCards.colors.${color}`)"
                :value="color"
              />
            </ElSelect>
          </ElFormItem>
        </ElCol>

        <ElCol :xs="24" :md="12">
          <ElFormItem :label="t('creditCards.form.icon')" :error="fieldErrors.icon?.[0]">
            <ElSelect v-model="form.icon" data-test="credit-card-icon">
              <ElOption
                v-for="icon in ICONS"
                :key="icon"
                :label="t(`creditCards.icons.${icon}`)"
                :value="icon"
              />
            </ElSelect>
          </ElFormItem>
        </ElCol>
      </ElRow>
    </ElForm>

    <template #footer>
      <ElButton :icon="Close" type="danger" data-test="credit-card-form-cancel" @click="close">{{
        t('common.cancel')
      }}</ElButton>
      <ElButton
        type="primary"
        :icon="Check"
        :loading="submitting"
        data-test="credit-card-form-submit"
        @click="submit"
      >
        {{ t('common.save') }}
      </ElButton>
    </template>
  </ElDialog>
</template>

<style scoped>
.credit-card-form__hint {
  margin: 0.25rem 0 0;
  font-size: 0.8125rem;
  color: var(--el-text-color-secondary);
}
</style>
