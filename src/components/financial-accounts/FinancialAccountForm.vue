<script setup>
import { reactive, ref, shallowRef, watch } from 'vue'
import {
  ACCOUNT_TYPES,
  COLOR_OPTIONS,
  ICON_OPTIONS,
} from '@/utils/financial-accounts/accountOptions'
import { parseBRLToCentavos } from '@/utils/financial-accounts/currency'

const props = defineProps({
  account: {
    type: Object,
    default: null,
  },
  submitting: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['submit'])
const formRef = shallowRef(null)
const initialBalance = ref(0)
const form = reactive({
  name: '',
  accountType: 'checking',
  institutionName: '',
  color: 'teal',
  icon: 'circle',
})

const initialBalanceLocked = ref(false)
const rules = {
  name: [
    { required: true, message: 'Enter an account name.', trigger: 'blur' },
    { min: 1, max: 120, message: 'Account name must be between 1 and 120 characters.', trigger: 'blur' },
  ],
  accountType: [{ required: true, message: 'Choose an account type.', trigger: 'change' }],
}

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
    initialBalance.value = account.initial_balance_centavos / 100
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
  initialBalance.value = 0
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
  <ElForm ref="formRef" :model="form" :rules="rules" label-position="top" @submit.prevent="submit">
    <ElFormItem label="Account name" prop="name">
      <ElInput
        v-model="form.name"
        name="account-name"
        autocomplete="off"
        placeholder="Conta principal"
      />
    </ElFormItem>

    <ElFormItem label="Account type" prop="accountType">
      <ElSelect v-model="form.accountType" name="account-type" aria-label="Account type">
        <ElOption
          v-for="type in ACCOUNT_TYPES"
          :key="type.value"
          :label="type.label"
          :value="type.value"
        />
      </ElSelect>
    </ElFormItem>

    <ElFormItem label="Financial institution (optional)" prop="institutionName">
      <ElInput
        v-model="form.institutionName"
        name="institution-name"
        autocomplete="organization"
        placeholder="Nubank"
      />
    </ElFormItem>

    <ElFormItem label="Opening balance" required>
      <ElInputNumber
        v-model="initialBalance"
        name="opening-balance"
        :controls="false"
        :precision="2"
        :step="0.01"
        :disabled="initialBalanceLocked"
        :min="-9999999999.99"
        :max="9999999999.99"
        placeholder="0,00"
      />
      <p v-if="initialBalanceLocked" class="field-help">
        The opening balance is locked because this account already has financial movements.
      </p>
      <p v-else class="field-help">Enter the balance the account started with, not income.</p>
    </ElFormItem>

    <div class="form-row">
      <ElFormItem label="Color" prop="color">
        <ElSelect v-model="form.color" name="color" aria-label="Color">
          <ElOption v-for="color in COLOR_OPTIONS" :key="color.value" :label="color.label" :value="color.value" />
        </ElSelect>
      </ElFormItem>

      <ElFormItem label="Icon" prop="icon">
        <ElSelect v-model="form.icon" name="icon" aria-label="Icon">
          <ElOption v-for="icon in ICON_OPTIONS" :key="icon.value" :label="icon.label" :value="icon.value" />
        </ElSelect>
      </ElFormItem>
    </div>

    <ElButton class="form-submit" native-type="submit" type="primary" :loading="props.submitting">
      {{ props.account ? 'Save changes' : 'Create account' }}
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
