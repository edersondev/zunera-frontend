<script setup>
import { onMounted } from 'vue'
import { ElAlert, ElButton, ElEmpty, ElSkeleton } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import PageHeader from '@/components/layout/PageHeader.vue'
import { useCreditCardStore } from '@/stores/credit-cards/creditCardStore'
import { cardIdentityLabel, formatBRL } from '@/utils/credit-cards/creditCardFormatters'

const store = useCreditCardStore()
const { t } = useI18n()
const router = useRouter()

onMounted(() => store.fetchCards('archived'))
</script>

<template>
  <section data-test="credit-cards-archived-view">
    <PageHeader :title="t('creditCards.archivedTitle')" :description="t('creditCards.archivedDescription')">
      <template #actions>
        <ElButton :icon="ArrowLeft" data-test="credit-cards-archived-back" @click="router.push({ name: 'credit-cards' })">
          {{ t('creditCards.detail.back') }}
        </ElButton>
      </template>
    </PageHeader>

    <ElAlert v-if="store.error" type="error" :closable="false" :title="store.error.message" />
    <ElSkeleton v-if="store.loading" :rows="2" animated />
    <ElEmpty v-else-if="store.archivedCards.length === 0" :description="t('creditCards.archivedEmpty')" data-test="credit-cards-archived-empty" />

    <ul v-else class="archived-cards">
      <li v-for="card in store.archivedCards" :key="card.id" :data-test="`credit-card-archived-${card.id}`" class="archived-cards__item">
        <span class="archived-cards__name">{{ card.name }}</span>
        <span class="archived-cards__identity">{{ cardIdentityLabel(card) }}</span>
        <span class="archived-cards__muted">
          {{ t('creditCards.archivedSummary', { limit: formatBRL(card.summary.credit_limit.amount_centavos) }) }}
        </span>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.archived-cards {
  display: grid;
  gap: 0.75rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.archived-cards__item {
  display: grid;
  gap: 0.25rem;
  padding: 0.75rem 1rem;
  border: 1px solid var(--el-border-color);
  border-radius: 0.75rem;
}

.archived-cards__name {
  font-weight: 600;
}

.archived-cards__identity,
.archived-cards__muted {
  font-size: 0.8125rem;
  color: var(--el-text-color-secondary);
}
</style>
