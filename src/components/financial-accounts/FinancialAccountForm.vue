<script setup>
import { computed, reactive, ref, shallowRef, watch } from 'vue'
import { vMaska } from 'maska/vue'
import { Check, CirclePlus } from '@element-plus/icons-vue'
import {
  accountColorOptions,
  accountIconOptions,
  accountTypeOptions,
} from '@/utils/financial-accounts/accountOptions'
import { useI18n } from 'vue-i18n'
import { parseBRLToCentavos } from '@/utils/financial-accounts/currency'
import { useLocale } from '@/composables/useLocale'

const props = defineProps({
  account: {
    type: Object,
    default: null,
  },
  submitting: {
    type: Boolean,
    default: false,
  },
  formId: {
    type: String,
    default: undefined,
  },
  showSubmit: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits(['submit'])
const { t } = useI18n()
const { activeLocale } = useLocale()
const formRef = shallowRef(null)
const initialBalance = ref('')
const accountTypes = computed(() => accountTypeOptions(t))
const colorOptions = computed(() => accountColorOptions(t))
const iconOptions = computed(() => accountIconOptions(t))
const balancePlaceholder = computed(() =>
  new Intl.NumberFormat(activeLocale.value, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(0),
)
const balanceMask = computed(() => ({
  number: {
    locale: activeLocale.value,
    fraction: 2,
    unsigned: false,
  },
  preProcess: (value) => normalizeBalanceInput(value, activeLocale.value),
}))
const form = reactive({
  name: '',
  accountType: 'checking',
  institutionName: '',
  color: 'teal',
  icon: 'circle',
})

const initialBalanceLocked = ref(false)
const rules = computed(() => ({
  name: [
    { required: true, message: t('financialAccounts.nameRequired'), trigger: 'blur' },
    {
      min: 1,
      max: 120,
      message: t('financialAccounts.nameLength'),
      trigger: 'blur',
    },
  ],
  accountType: [{ required: true, message: t('financialAccounts.typeRequired'), trigger: 'change' }],
}))

watch(
  () => props.account,
  (account) => {
    if (!account) {
      return
    }

    form.name = account.name ?? ''
    form.accountType = account.account_type ?? 'checking'
    form.institutionName = account.institution_name ?? ''
    form.color = account.color ?? 'teal'
    form.icon = account.icon ?? 'circle'
    initialBalance.value = formatBalance(account.initial_balance_centavos)
    initialBalanceLocked.value = Boolean(account.has_financial_movements)
  },
  { immediate: true },
)

function resetCreateForm() {
  form.name = ''
  form.accountType = 'checking'
  form.institutionName = ''
  form.color = 'teal'
  form.icon = 'circle'
  initialBalance.value = ''
  initialBalanceLocked.value = false
}

function formatBalance(centavos) {
  return (Number(centavos) / 100).toLocaleString(activeLocale.value, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function normalizeBalanceInput(value, locale) {
  const raw = String(value)
  const negative = raw.startsWith('-')
  const digits = raw.replace(/\D/g, '')

  if (!digits) {
    return negative ? '-' : ''
  }

  const padded = digits.padStart(3, '0')
  const decimalSeparator = new Intl.NumberFormat(locale)
    .formatToParts(1.1)
    .find((part) => part.type === 'decimal')?.value ?? ','

  return `${negative ? '-' : ''}${padded.slice(0, -2)}${decimalSeparator}${padded.slice(-2)}`
}

async function submit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) {
    return
  }

  const payload = {
    name: form.name.trim(),
    account_type: form.accountType,
    institution_name: form.institutionName.trim() || null,
    color: form.color,
    icon: form.icon,
  }

  if (!props.account || !props.account.has_financial_movements) {
    payload.initial_balance_centavos = parseBRLToCentavos(initialBalance.value)
  }

  emit('submit', payload)

  if (!props.account) {
    resetCreateForm()
  }
}

defineExpose({ resetCreateForm })
</script>

<template>
  <ElForm
    :id="props.formId"
    ref="formRef"
    :model="form"
    :rules="rules"
    label-position="top"
    @submit.prevent="submit"
  >
    <div class="form-row">
      <ElFormItem :label="t('financialAccounts.accountName')" prop="name">
        <ElInput
          v-model="form.name"
          name="account-name"
          autocomplete="off"
          :placeholder="t('financialAccounts.accountName')"
        />
      </ElFormItem>

      <ElFormItem :label="t('financialAccounts.accountType')" prop="accountType">
        <ElSelect v-model="form.accountType" name="account-type" :aria-label="t('financialAccounts.accountType')">
          <ElOption
            v-for="type in accountTypes"
            :key="type.value"
            :label="type.label"
            :value="type.value"
          />
        </ElSelect>
      </ElFormItem>
    </div>

    <div class="form-row">
      <ElFormItem :label="t('financialAccounts.openingBalance')" required>
        <ElInput
          v-model="initialBalance"
          v-maska="balanceMask"
          name="opening-balance"
          inputmode="decimal"
          autocomplete="off"
          :disabled="initialBalanceLocked"
          :placeholder="balancePlaceholder"
        >
          <template #prefix><span class="currency-prefix">R$</span></template>
        </ElInput>
        <p v-if="initialBalanceLocked" class="field-help">
          {{ t('financialAccounts.balanceLocked') }}
        </p>
        <p v-else class="field-help">{{ t('financialAccounts.balanceHelp') }}</p>
      </ElFormItem>

      <ElFormItem :label="t('financialAccounts.institution')" prop="institutionName">
        <ElInput
          v-model="form.institutionName"
          name="institution-name"
          autocomplete="organization"
          placeholder="Nubank"
        />
      </ElFormItem>
    </div>

    <div class="form-row">
      <ElFormItem :label="t('financialAccounts.color')" prop="color">
        <ElSelect v-model="form.color" name="color" :aria-label="t('financialAccounts.color')">
          <ElOption
            v-for="color in colorOptions"
            :key="color.value"
            :label="color.label"
            :value="color.value"
          />
        </ElSelect>
      </ElFormItem>

      <ElFormItem :label="t('financialAccounts.icon')" prop="icon">
        <ElSelect v-model="form.icon" name="icon" :aria-label="t('financialAccounts.icon')">
          <ElOption
            v-for="icon in iconOptions"
            :key="icon.value"
            :label="icon.label"
            :value="icon.value"
          />
        </ElSelect>
      </ElFormItem>
    </div>

    <ElButton
      v-if="props.showSubmit"
      class="form-submit"
      :icon="props.account ? Check : CirclePlus"
      native-type="submit"
      type="primary"
      :loading="props.submitting"
    >
      {{ props.account ? t('financialAccounts.saveChanges') : t('financialAccounts.create') }}
    </ElButton>
  </ElForm>
</template>

<style scoped>
.form-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.field-help {
  width: 100%;
  margin: 6px 0 0;
  color: var(--color-text-muted);
  font-size: 12px;
  line-height: 16px;
}

.currency-prefix {
  margin-right: 4px;
}

.form-submit {
  margin-top: 8px;
}

@media (max-width: 640px) {
  .form-row {
    grid-template-columns: 1fr;
    gap: 0;
  }
}
</style>
