<script setup>
import { reactive, watch } from 'vue'

const props = defineProps({
  filters: { type: Object, required: true },
  accounts: { type: Array, required: true },
  categories: { type: Array, required: true },
  loading: Boolean,
})
const emit = defineEmits(['apply', 'clear'])
const form = reactive({ ...props.filters })

watch(() => props.filters, (filters) => Object.assign(form, filters), { deep: true })

function apply() {
  emit('apply', { ...form })
}

function clear() {
  Object.assign(form, {
    view: 'active',
    per_page: 50,
    q: undefined,
    type: undefined,
    status: undefined,
    financial_account_id: undefined,
    category_id: undefined,
    from: undefined,
    to: undefined,
  })
  emit('clear')
}
</script>

<template>
  <ElForm
    :model="form"
    label-position="top"
    class="filters"
    data-test="transaction-filters"
    @submit.prevent="apply"
  >
    <ElFormItem label="Buscar">
      <ElInput v-model="form.q" clearable placeholder="Descrição ou observação" data-test="filter-search" />
    </ElFormItem>
    <ElFormItem label="Tipo">
      <ElSelect v-model="form.type" clearable data-test="filter-type">
        <ElOption label="Receita" value="income" />
        <ElOption label="Despesa" value="expense" />
      </ElSelect>
    </ElFormItem>
    <ElFormItem label="Status">
      <ElSelect v-model="form.status" clearable data-test="filter-status">
        <ElOption label="Efetiva" value="effective" />
        <ElOption label="Pendente" value="pending" />
      </ElSelect>
    </ElFormItem>
    <ElFormItem label="Conta">
      <ElSelect v-model="form.financial_account_id" clearable data-test="filter-account">
        <ElOption v-for="account in accounts" :key="account.id" :label="account.name" :value="account.id" />
      </ElSelect>
    </ElFormItem>
    <ElFormItem label="Categoria">
      <ElSelect v-model="form.category_id" clearable data-test="filter-category">
        <ElOption v-for="category in categories" :key="category.id" :label="category.name" :value="category.id" />
      </ElSelect>
    </ElFormItem>
    <ElFormItem label="De">
      <ElDatePicker v-model="form.from" type="date" value-format="YYYY-MM-DD" data-test="filter-from" />
    </ElFormItem>
    <ElFormItem label="Até">
      <ElDatePicker v-model="form.to" type="date" value-format="YYYY-MM-DD" data-test="filter-to" />
    </ElFormItem>
    <div class="filter-actions">
      <ElButton :loading="loading" type="primary" native-type="submit" data-test="apply-filters">Filtrar</ElButton>
      <ElButton data-test="clear-filters" @click="clear">Limpar</ElButton>
    </div>
  </ElForm>
</template>

<style scoped>
.filters {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0 16px;
  margin-bottom: 24px;
}
.filter-actions {
  align-self: end;
  display: flex;
  gap: 8px;
  padding-bottom: 18px;
}
@media (max-width: 1024px) {
  .filters {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 639px) {
  .filters {
    grid-template-columns: 1fr;
  }
}
</style>
