<script setup>
import { reactive, shallowRef, watch } from 'vue'
import { Close } from '@element-plus/icons-vue'
import { ElAlert, ElButton, ElDatePicker, ElDialog, ElForm, ElFormItem, ElInput, ElOption, ElSelect } from 'element-plus'
import { useI18n } from 'vue-i18n'
import CurrencyAmountInput from '@/components/common/CurrencyAmountInput.vue'

const props = defineProps({ goal: { type: Object, default: null }, accounts: { type: Array, default: () => [] }, busy: { type: Boolean, default: false }, error: { type: Object, default: null } })
const visible = defineModel({ type: Boolean, default: false })
const emit = defineEmits(['submit'])
const { t } = useI18n()
const formRef = shallowRef(null)
const localError = shallowRef('')
const form = reactive({ name: '', target_centavos: null, target_date: null, financial_account_id: null, description: '', initial_allocated_centavos: null })
watch(visible, (open) => {
  if (!open) return
  Object.assign(form, { name: props.goal?.name ?? '', target_centavos: props.goal?.target_centavos ?? null, target_date: props.goal?.target_date ?? null, financial_account_id: props.goal?.financial_account?.id ?? null, description: props.goal?.description ?? '', initial_allocated_centavos: null })
  localError.value = ''
})
function submit() {
  if (!form.name.trim() || !Number.isInteger(form.target_centavos) || form.target_centavos <= 0) { localError.value = t('goals.formRequired'); return }
  localError.value = ''
  const payload = { name: form.name.trim(), target_centavos: form.target_centavos, target_date: form.target_date || null, financial_account_id: form.financial_account_id || null, description: form.description || null }
  if (!props.goal) {
    payload.initial_allocated_centavos = form.initial_allocated_centavos ?? 0
    emit('submit', payload)
    return
  }

  const original = {
    name: props.goal.name,
    target_centavos: props.goal.target_centavos,
    target_date: props.goal.target_date ?? null,
    financial_account_id: props.goal.financial_account?.id ?? null,
    description: props.goal.description ?? null,
  }
  const changes = Object.fromEntries(Object.entries(payload).filter(([field, value]) => value !== original[field]))
  if (Object.keys(changes).length === 0) { visible.value = false; return }
  emit('submit', changes)
}
</script>

<template>
  <ElDialog v-model="visible" :title="t(props.goal ? 'goals.edit' : 'goals.new')" width="min(92vw, 520px)" :close-on-click-modal="false" @closed="formRef?.clearValidate()">
    <ElForm ref="formRef" :model="form" label-position="top" @submit.prevent="submit">
      <ElFormItem :label="t('goals.name')" prop="name" :error="props.error?.errors?.name?.[0]"><ElInput v-model="form.name" name="name" maxlength="200" show-word-limit :disabled="props.busy" /></ElFormItem>
      <ElFormItem :label="t('goals.target')" prop="target_centavos" :error="props.error?.errors?.target_centavos?.[0]"><CurrencyAmountInput v-model="form.target_centavos" name="target_centavos" :disabled="props.busy" /></ElFormItem>
      <ElFormItem :label="t('goals.targetDate')" prop="target_date" :error="props.error?.errors?.target_date?.[0]"><ElDatePicker v-model="form.target_date" type="date" value-format="YYYY-MM-DD" :placeholder="t('goals.optional')" :disabled="props.busy" /></ElFormItem>
      <ElFormItem :label="t('goals.account')" prop="financial_account_id" :error="props.error?.errors?.financial_account_id?.[0]"><ElSelect v-model="form.financial_account_id" clearable :placeholder="t('goals.unlinked')" :disabled="props.busy"><ElOption v-for="account in props.accounts" :key="account.id" :label="account.name" :value="account.id" /></ElSelect></ElFormItem>
      <ElFormItem :label="t('goals.notes')" prop="description" :error="props.error?.errors?.description?.[0]"><ElInput v-model="form.description" name="description" type="textarea" maxlength="1000" show-word-limit :disabled="props.busy" /></ElFormItem>
      <ElFormItem v-if="!props.goal" :label="t('goals.initialAmount')" prop="initial_allocated_centavos" :error="props.error?.errors?.initial_allocated_centavos?.[0]"><CurrencyAmountInput v-model="form.initial_allocated_centavos" name="initial_allocated_centavos" :disabled="props.busy" /></ElFormItem>
      <ElAlert v-if="props.error?.message" :title="props.error.message" type="error" :closable="false" show-icon />
      <p v-if="localError" role="alert">{{ localError }}</p>
      <p class="form-note">{{ t('goals.allocationHelp') }}</p>
      <div class="dialog-actions"><ElButton type="danger" :icon="Close" :disabled="props.busy" @click="visible = false">{{ t('common.cancel') }}</ElButton><ElButton type="primary" native-type="submit" :loading="props.busy">{{ t(props.goal ? 'goals.save' : 'goals.create') }}</ElButton></div>
    </ElForm>
  </ElDialog>
</template>

<style scoped>
.form-note { color: var(--color-text-muted); font-size: 14px; }
.dialog-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px; }
</style>
