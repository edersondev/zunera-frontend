<script setup>
import { computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import PageHeader from '@/components/layout/PageHeader.vue'
import DashboardPeriodSelector from '@/components/dashboard/DashboardPeriodSelector.vue'
import FinancialSummaryCards from '@/components/dashboard/FinancialSummaryCards.vue'
import ExpenseDistributionCard from '@/components/dashboard/ExpenseDistributionCard.vue'
import FinancialEvolutionCard from '@/components/dashboard/FinancialEvolutionCard.vue'
import AccountsOverviewCard from '@/components/dashboard/AccountsOverviewCard.vue'
import RecentActivityCard from '@/components/dashboard/RecentActivityCard.vue'
import UpcomingActivityCard from '@/components/dashboard/UpcomingActivityCard.vue'
import CreditCardSummary from '@/components/dashboard/CreditCardSummary.vue'
import { useDashboardStore } from '@/stores/dashboard/dashboardStore'
import { useCreditCardStore } from '@/stores/credit-cards/creditCardStore'
import { useLocale } from '@/composables/useLocale'
import { formatDashboardPeriod } from '@/utils/dashboard/dashboardFormatters'

const store = useDashboardStore()
const {
  period,
  summary,
  summaryLoading,
  summaryError,
  accounts,
  accountsLoading,
  accountsError,
  distribution,
  distributionLoading,
  distributionError,
  evolution,
  evolutionLoading,
  evolutionError,
  recentActivity,
  recentActivityLoading,
  recentActivityError,
  upcomingActivity,
  upcomingActivityLoading,
  upcomingActivityError,
} = storeToRefs(store)

const creditCardStore = useCreditCardStore()
const {
  dashboard: creditCardProjection,
  loading: creditCardLoading,
  error: creditCardError,
} = storeToRefs(creditCardStore)

const router = useRouter()
const { t } = useI18n()
const { activeLocale } = useLocale()

const resolvedPeriod = computed(
  () => summary.value?.period ?? evolution.value?.period ?? distribution.value?.period ?? null,
)
const rangeLabel = computed(() =>
  resolvedPeriod.value ? formatDashboardPeriod(resolvedPeriod.value, activeLocale.value) : '—',
)
const periodLoading = computed(
  () => summaryLoading.value || distributionLoading.value || evolutionLoading.value,
)

async function selectPreset(preset) {
  const keepsCustomRange = preset === 'custom'
  store.setPeriod({
    preset,
    from: keepsCustomRange ? period.value.from : null,
    to: keepsCustomRange ? period.value.to : null,
  })

  if (preset === 'custom') return

  await store.loadPeriodSections()
}

async function applyCustom({ from, to }) {
  store.setPeriod({ preset: 'custom', from, to })
  await store.loadPeriodSections()
}

async function openFinancialAccounts() {
  await router.push({ name: 'financial-accounts' })
}

onMounted(() => {
  store.refreshAll()
  creditCardStore.fetchDashboard()
})
</script>

<template>
  <div class="dashboard-view">
    <PageHeader :title="t('dashboard.title')" :description="t('dashboard.description')" />

    <DashboardPeriodSelector
      :preset="period.preset"
      :from="period.from ?? ''"
      :to="period.to ?? ''"
      :range-label="rangeLabel"
      :loading="periodLoading"
      @select-preset="selectPreset"
      @apply-custom="applyCustom"
    />

    <div class="dashboard-grid">
      <FinancialSummaryCards
        class="dashboard-summary-card"
        :summary="summary"
        :loading="summaryLoading"
        :error="summaryError"
        :locale="activeLocale"
        @retry="store.fetchSummary()"
      />

      <AccountsOverviewCard
        class="dashboard-accounts-card"
        :accounts="accounts"
        :loading="accountsLoading"
        :error="accountsError"
        :locale="activeLocale"
        @retry="store.fetchAccounts()"
        @create-account="openFinancialAccounts"
      />

      <ExpenseDistributionCard
        class="dashboard-distribution-card"
        :distribution="distribution"
        :loading="distributionLoading"
        :error="distributionError"
        :locale="activeLocale"
        @retry="store.fetchExpenseDistribution()"
      />

      <FinancialEvolutionCard
        class="dashboard-evolution-card"
        :evolution="evolution"
        :loading="evolutionLoading"
        :error="evolutionError"
        :locale="activeLocale"
        @retry="store.fetchEvolution()"
      />

      <UpcomingActivityCard
        class="dashboard-upcoming-card"
        :upcoming="upcomingActivity"
        :loading="upcomingActivityLoading"
        :error="upcomingActivityError"
        :locale="activeLocale"
        @retry="store.fetchUpcomingActivity()"
      />

      <CreditCardSummary
        class="dashboard-credit-cards-card"
        :projection="creditCardProjection"
        :loading="creditCardLoading"
        :error="creditCardError"
        @retry="creditCardStore.fetchDashboard()"
        @open-cards="router.push({ name: 'credit-cards' })"
      />
    </div>

    <RecentActivityCard
      :items="recentActivity"
      :loading="recentActivityLoading"
      :error="recentActivityError"
      :locale="activeLocale"
      @retry="store.fetchRecentActivity()"
    />
  </div>
</template>

<style scoped>
.dashboard-view {
  display: grid;
  gap: 24px;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 24px;
  align-items: start;
}

@media (min-width: 1024px) {
  .dashboard-grid {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    grid-template-areas:
      'summary summary'
      'evolution evolution'
      'distribution accounts'
      'upcoming upcoming';
  }

  .dashboard-summary-card {
    grid-area: summary;
  }

  .dashboard-accounts-card {
    grid-area: accounts;
  }

  .dashboard-distribution-card {
    grid-area: distribution;
  }

  .dashboard-evolution-card {
    grid-area: evolution;
  }

  .dashboard-upcoming-card {
    grid-area: upcoming;
  }

  .dashboard-credit-cards-card {
    grid-column: 1 / -1;
  }
}
</style>
