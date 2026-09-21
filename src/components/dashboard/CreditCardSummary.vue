<script setup>
import { computed } from 'vue'
import { ElAlert, ElButton, ElEmpty, ElSkeleton, ElTag } from 'element-plus'
import { useI18n } from 'vue-i18n'
import {
  availableCreditPresentation,
  cardIdentityLabel,
  formatBRL,
  formatIsoDate,
  statementStatus,
} from '@/utils/credit-cards/creditCardFormatters'

const props = defineProps({
  projection: { type: Object, default: null },
  loading: { type: Boolean, default: false },
  error: { type: Object, default: null },
})

const emit = defineEmits(['retry', 'open-cards'])
const { t } = useI18n()

const cards = computed(() => props.projection?.cards ?? [])
const upcoming = computed(() => props.projection?.upcoming_statements ?? [])
const available = computed(() =>
  availableCreditPresentation(props.projection?.available_credit?.amount_centavos ?? 0),
)
</script>

<template>
  <section class="grid gap-2" data-test="dashboard-credit-cards">
    <header class="flex flex-wrap items-center justify-between gap-2">
      <h2 class="m-0 text-base">{{ t('creditCards.dashboard.title') }}</h2>
      <ElButton size="small" data-test="dashboard-credit-cards-link" @click="emit('open-cards')">
        {{ t('creditCards.dashboard.manage') }}
      </ElButton>
    </header>

    <ElAlert
      v-if="error"
      type="error"
      :closable="false"
      :title="error.message"
      data-test="dashboard-credit-cards-error"
    >
      <ElButton size="small" data-test="dashboard-credit-cards-retry" @click="emit('retry')">
        {{ t('common.retry') }}
      </ElButton>
    </ElAlert>

    <ElSkeleton v-else-if="loading" :rows="2" animated data-test="dashboard-credit-cards-loading" />

    <ElEmpty
      v-else-if="cards.length === 0"
      :description="t('creditCards.dashboard.empty')"
      data-test="dashboard-credit-cards-empty"
    />

    <template v-else>
      <dl
        class="m-0 grid grid-cols-[repeat(auto-fit,minmax(8rem,1fr))] gap-2"
        data-test="dashboard-credit-cards-totals"
      >
        <div>
          <dt class="text-xs text-[var(--el-text-color-secondary)]">
            {{ t('creditCards.dashboard.outstanding') }}
          </dt>
          <dd class="m-0 tabular-nums" data-test="dashboard-credit-cards-outstanding">
            {{ formatBRL(projection.outstanding_obligation.amount_centavos) }}
          </dd>
        </div>
        <div>
          <dt class="text-xs text-[var(--el-text-color-secondary)]">
            {{ t('creditCards.summary.cardCredit') }}
          </dt>
          <dd class="m-0 tabular-nums" data-test="dashboard-credit-cards-card-credit">
            {{ formatBRL(projection.card_credit.amount_centavos) }}
          </dd>
        </div>
        <div>
          <dt class="text-xs text-[var(--el-text-color-secondary)]">
            {{ t('creditCards.summary.available') }}
          </dt>
          <dd class="m-0 tabular-nums" data-test="dashboard-credit-cards-available">
            {{ formatBRL(projection.available_credit.amount_centavos) }}
          </dd>
        </div>
      </dl>

      <p class="text-[0.8125rem] text-[var(--el-text-color-secondary)]">
        {{ t('creditCards.dashboard.cashNote') }}
      </p>

      <p
        v-if="available.isOverLimit"
        class="m-0 font-semibold text-[var(--el-color-danger)]"
        data-test="dashboard-credit-cards-over-limit"
      >
        {{ t('creditCards.overLimit', { amount: available.formatted }) }}
      </p>

      <ul class="m-0 grid list-none gap-1.5 p-0">
        <li
          v-for="card in cards"
          :key="card.id"
          class="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--el-border-color)] px-2 py-1.5"
          :data-test="`dashboard-credit-card-${card.id}`"
        >
          <span class="font-semibold">{{ card.name }}</span>
          <span class="text-[0.8125rem] text-[var(--el-text-color-secondary)]">{{
            cardIdentityLabel(card)
          }}</span>
          <span data-test="dashboard-credit-card-used">{{
            formatBRL(card.summary.used_credit.amount_centavos)
          }}</span>
          <ElTag v-if="card.summary.is_over_limit" type="danger" size="small">{{
            t('creditCards.summary.overLimitTag')
          }}</ElTag>
        </li>
      </ul>

      <template v-if="upcoming.length > 0">
        <h3 class="m-0 text-base">{{ t('creditCards.dashboard.upcoming') }}</h3>
        <ul class="m-0 grid list-none gap-1.5 p-0">
          <li
            v-for="statement in upcoming"
            :key="statement.id"
            class="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--el-border-color)] px-2 py-1.5"
            :data-test="`dashboard-credit-card-statement-${statement.id}`"
          >
            <span>{{ statement.card.name }}</span>
            <span class="text-[0.8125rem] text-[var(--el-text-color-secondary)]">{{
              formatIsoDate(statement.due_date)
            }}</span>
            <ElTag :type="statementStatus(statement.status).tone" size="small">
              {{ t(statementStatus(statement.status).labelKey) }}
            </ElTag>
            <span>{{ formatBRL(statement.outstanding_amount.amount_centavos) }}</span>
          </li>
        </ul>
      </template>
    </template>
  </section>
</template>
