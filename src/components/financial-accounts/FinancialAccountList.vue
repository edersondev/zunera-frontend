<script setup>
import { ACCOUNT_TYPE_LABELS } from '@/utils/financial-accounts/accountOptions'
import { formatBRL } from '@/utils/financial-accounts/currency'

const props = defineProps({
  accounts: {
    type: Array,
    required: true,
  },
  archived: {
    type: Boolean,
    default: false,
  },
  loading: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['archive', 'restore'])
</script>

<template>
  <div v-loading="props.loading">
    <ElEmpty
      v-if="!props.accounts.length"
      :description="
        props.archived
          ? 'No archived accounts yet.'
          : 'No active accounts yet. Create your first account to get started.'
      "
    />
    <ul v-else class="account-list">
      <li v-for="account in props.accounts" :key="account.id" class="account-card">
        <div class="account-identity">
          <RouterLink
            class="account-name"
            :to="{ name: 'financial-account-detail', params: { id: account.id } }"
          >
            {{ account.name }}
          </RouterLink>
          <p class="account-meta">
            {{ ACCOUNT_TYPE_LABELS[account.account_type] ?? account.account_type }}
            <template v-if="account.institution_name"> · {{ account.institution_name }}</template>
          </p>
        </div>
        <p class="account-balance">{{ formatBRL(account.current_balance_centavos) }}</p>
        <ElButton
          v-if="!props.archived"
          class="account-action"
          plain
          @click="emit('archive', account)"
        >
          Archive
        </ElButton>
        <ElButton
          v-else
          class="account-action"
          plain
          type="primary"
          @click="emit('restore', account)"
        >
          Restore
        </ElButton>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.account-list {
  display: grid;
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.account-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
}

.account-name {
  font-size: 16px;
  line-height: 24px;
  font-weight: 600;
}

.account-meta {
  margin: 4px 0 0;
  color: var(--color-text-muted);
  font-size: 14px;
  line-height: 20px;
}

.account-balance {
  margin: 0;
  font-size: 16px;
  line-height: 24px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.account-action {
  min-height: 44px;
}

@media (max-width: 640px) {
  .account-card {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .account-balance {
    grid-column: 1 / -1;
    grid-row: 2;
  }

  .account-action {
    grid-column: 2;
    grid-row: 1;
  }
}
</style>
