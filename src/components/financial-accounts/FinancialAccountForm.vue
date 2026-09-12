<script setup>
import { computed, reactive, ref, shallowRef, watch } from 'vue'
import { Check, CirclePlus } from '@element-plus/icons-vue'
import CurrencyAmountInput from '@/components/common/CurrencyAmountInput.vue'
import {
  accountColorOptions,
  accountIconOptions,
  accountTypeOptions,
} from '@/utils/financial-accounts/accountOptions'
import { useI18n } from 'vue-i18n'

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
const formRef = shallowRef(null)
const accountTypes = computed(() => accountTypeOptions(t))
const colorOptions = computed(() => accountColorOptions(t))
const iconOptions = computed(() => accountIconOptions(t))
const form = reactive({
  name: '',
  accountType: 'checking',
  institutionName: '',
  color: 'teal',
  icon: 'circle',
  initialBalanceCentavos: null,
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
    form.initialBalanceCentavos = account.initial_balance_centavos ?? 0
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
  form.initialBalanceCentavos = null
  initialBalanceLocked.value = false
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
    payload.initial_balance_centavos = form.initialBalanceCentavos ?? 0
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
        <CurrencyAmountInput
          v-model="form.initialBalanceCentavos"
          name="opening-balance"
          :disabled="initialBalanceLocked"
          allow-negative
        />
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
