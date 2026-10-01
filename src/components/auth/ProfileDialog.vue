<script setup>
import { Check, Close } from '@element-plus/icons-vue'
import { computed, reactive, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSessionStore } from '@/stores/auth/sessionStore'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  user: { type: Object, default: null },
})
const emit = defineEmits(['update:modelValue', 'closed'])
const { t } = useI18n()
const sessionStore = useSessionStore()
const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})
const nameFormRef = shallowRef(null)
const nameForm = reactive({ name: '' })
const nameBusy = shallowRef(false)
const nameError = shallowRef(null)
const nameSuccess = shallowRef(false)
const nameRules = computed(() => ({
  name: [
    { required: true, message: t('auth.nameRequired'), trigger: 'blur' },
    { min: 2, message: t('auth.nameShort'), trigger: 'blur' },
  ],
}))
watch(() => props.modelValue, (open) => {
  if (!open) return
  nameForm.name = props.user?.name ?? ''
  nameError.value = null
  nameSuccess.value = false
})

function onClosed() {
  nameFormRef.value?.clearValidate()
  nameError.value = null
  emit('closed')
}

async function saveName() {
  if (nameBusy.value) return
  nameError.value = null
  nameSuccess.value = false
  const valid = await nameFormRef.value?.validate().catch(() => false)
  if (!valid) return
  nameBusy.value = true
  try {
    await sessionStore.updateProfileName(nameForm.name.trim())
    nameForm.name = sessionStore.user?.name ?? nameForm.name
    nameSuccess.value = true
  } catch (error) {
    nameError.value = error
  } finally {
    nameBusy.value = false
  }
}
</script>

<template>
  <ElDialog
    v-model="visible"
    :title="t('profile.edit')"
    width="min(92vw, 520px)"
    :close-on-click-modal="false"
    :close-on-press-escape="!nameBusy"
    :show-close="!nameBusy"
    @closed="onClosed"
  >
    <ElForm ref="nameFormRef" :model="nameForm" :rules="nameRules" label-position="top" @submit.prevent="saveName">
      <ElFormItem :label="t('auth.fullName')" prop="name" :error="nameError?.errors?.name?.[0]">
        <ElInput v-model="nameForm.name" name="name" autocomplete="name" maxlength="255" :disabled="nameBusy" />
      </ElFormItem>
      <ElFormItem :label="t('common.email')">
        <ElInput :model-value="user?.email ?? ''" name="email" autocomplete="email" disabled />
      </ElFormItem>
      <ElAlert v-if="nameError?.message" type="error" :title="nameError.message" :closable="false" show-icon />
      <ElAlert v-if="nameSuccess" type="success" :title="t('profile.nameSaved')" :closable="false" show-icon />
    </ElForm>
    <template #footer>
      <ElButton type="danger" :icon="Close" :disabled="nameBusy" @click="visible = false">
        {{ t('common.cancel') }}
      </ElButton>
      <ElButton type="primary" :icon="Check" :loading="nameBusy" @click="saveName">
        {{ t('common.save') }}
      </ElButton>
    </template>
  </ElDialog>
</template>
