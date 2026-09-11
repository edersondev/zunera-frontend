<script setup>
import { Edit, FolderDelete, RefreshLeft } from '@element-plus/icons-vue'
import { accountTypeLabel } from '@/utils/financial-accounts/accountOptions'
import { formatBRL } from '@/utils/financial-accounts/currency'
import { useI18n } from 'vue-i18n'

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
  editable: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['archive', 'edit', 'restore'])
const { t } = useI18n()
</script>

<template>
  <div v-loading="props.loading">
    <ElEmpty
      v-if="!props.accounts.length"
      :description="
        props.archived
          ? t('financialAccounts.emptyArchived')
          : t('financialAccounts.empty')
      "
    />
    <ul v-else class="account-list">
      <li v-for="account in props.accounts" :key="account.id" class="account-card">
        <div class="account-identity">
          <button
            v-if="props.editable"
            class="account-name"
            type="button"
            @click="emit('edit', account)"
          >
            <ElIcon class="account-edit-icon"><Edit /></ElIcon>
            <span>{{ account.name }}</span>
          </button>
          <span v-else class="account-name account-name--static">{{ account.name }}</span>
          <p class="account-meta">
            {{ accountTypeLabel(account.account_type, t) }}
            <template v-if="account.institution_name"> · {{ account.institution_name }}</template>
          </p>
        </div>
        <p class="account-balance">{{ formatBRL(account.current_balance_centavos) }}</p>
        <ElButton
          v-if="!props.archived"
          class="account-action"
          :icon="FolderDelete"
          plain
          @click="emit('archive', account)"
        >
          {{ t('financialAccounts.archive') }}
        </ElButton>
        <ElButton
          v-else
          class="account-action"
          :icon="RefreshLeft"
          plain
          type="primary"
          @click="emit('restore', account)"
        >
          {{ t('financialAccounts.restore') }}
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
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--color-action-primary);
  cursor: pointer;
  font-size: 16px;
  line-height: 24px;
  font-weight: 600;
  text-align: left;
}

.account-edit-icon {
  flex: 0 0 auto;
}

.account-name:focus-visible {
  outline: 2px solid var(--color-focus-ring);
  outline-offset: 2px;
}

.account-name:not(.account-name--static):hover {
  text-decoration: underline;
}

.account-name--static {
  color: var(--color-text);
  cursor: default;
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
