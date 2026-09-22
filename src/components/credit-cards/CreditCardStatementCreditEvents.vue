<script setup>
import { RefreshLeft } from '@element-plus/icons-vue'
import { ElEmpty, ElIcon } from 'element-plus'
import { useI18n } from 'vue-i18n'
import { formatBRL, formatIsoDate } from '@/utils/credit-cards/creditCardFormatters'

const props = defineProps({
  events: { type: Array, default: () => [] },
})

const { t } = useI18n()
</script>

<template>
  <section class="statement-credit-events" data-test="credit-card-statement-credit-events" aria-labelledby="statement-credit-events-title">
    <header class="section-header">
      <h2 id="statement-credit-events-title">{{ t('creditCards.statementDetail.creditEvents') }}</h2>
    </header>

    <ElEmpty
      v-if="props.events.length === 0"
      :image-size="48"
      :description="t('creditCards.statementDetail.creditEventsEmpty')"
    />
    <ul v-else class="event-list">
      <li
        v-for="event in props.events"
        :key="event.id"
        class="event-row"
        :data-test="`credit-card-credit-event-${event.id}`"
      >
        <ElIcon class="event-icon"><RefreshLeft /></ElIcon>
        <div class="event-details">
          <strong>{{ t(`creditCards.creditEventReason.${event.reason}`) }}</strong>
          <span>{{ formatIsoDate(event.event_date) }}</span>
        </div>
        <strong class="event-amount">{{ formatBRL(event.amount?.amount_centavos) }}</strong>
        <ul v-if="event.statementApplications.length > 0" class="application-list">
          <li
            v-for="application in event.statementApplications"
            :key="`${event.id}-${application.statement_id}-${application.installment_id}`"
            :data-test="`credit-card-credit-application-${event.id}-${application.statement_id}`"
          >
            {{
              t('creditCards.statementDetail.creditApplied', {
                amount: formatBRL(application.amount?.amount_centavos),
              })
            }}
          </li>
        </ul>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.statement-credit-events {
  display: grid;
  gap: 12px;
}

.section-header h2 {
  margin: 0;
  color: var(--color-text);
  font-size: 20px;
  font-weight: 600;
  line-height: 28px;
}

.event-list,
.application-list {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.event-row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  padding: 12px 16px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}

.event-icon,
.event-amount {
  color: var(--color-success);
}

.event-details {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.event-details strong,
.event-amount {
  color: var(--color-text);
  font-size: 14px;
  line-height: 20px;
}

.event-details span,
.application-list {
  color: var(--color-text-muted);
  font-size: 14px;
  line-height: 20px;
}

.event-amount {
  color: var(--color-success);
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  text-align: right;
}

.application-list {
  grid-column: 2 / -1;
  padding-top: 8px;
  border-top: 1px solid var(--color-border);
}

@media (max-width: 479px) {
  .event-row {
    grid-template-columns: auto minmax(0, 1fr) auto;
  }
}
</style>
