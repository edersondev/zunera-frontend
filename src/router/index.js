import { createRouter, createWebHistory } from 'vue-router'
import { authGuard } from './authGuard'
import AppShell from '@/layouts/AppShell.vue'
import { i18n } from '@/i18n'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: { name: 'sign-in' },
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('@/views/auth/RegisterView.vue'),
      meta: { guestOnly: true, titleKey: 'auth.createAccount' },
    },
    {
      path: '/login',
      name: 'sign-in',
      component: () => import('@/views/auth/SignInView.vue'),
      meta: { guestOnly: true, titleKey: 'common.signIn' },
    },
    {
      path: '/forgot-password',
      name: 'forgot-password',
      component: () => import('@/views/auth/ForgotPasswordView.vue'),
      meta: { guestOnly: true, titleKey: 'auth.recoverPassword' },
    },
    {
      path: '/reset-password',
      name: 'reset-password',
      component: () => import('@/views/auth/ResetPasswordView.vue'),
      meta: { guestOnly: true, titleKey: 'auth.resetPassword' },
    },
    {
      path: '/app',
      component: AppShell,
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'dashboard',
          component: () => import('@/views/dashboard/FinancialDashboardView.vue'),
          meta: { requiresAuth: true, titleKey: 'dashboard.title' },
        },
        {
          path: 'financial-accounts',
          name: 'financial-accounts',
          component: () => import('@/views/financial-accounts/FinancialAccountsListView.vue'),
          meta: { requiresAuth: true, titleKey: 'app.financialAccounts' },
        },
        {
          path: 'budgets',
          name: 'budgets',
          component: () => import('@/views/budgets/BudgetsView.vue'),
          meta: { requiresAuth: true, titleKey: 'budgets.title' },
        },
        {
          path: 'credit-cards',
          name: 'credit-cards',
          component: () => import('@/views/credit-cards/CreditCardsListView.vue'),
          meta: { requiresAuth: true, titleKey: 'app.creditCards' },
        },
        {
          path: 'credit-cards/archived',
          name: 'credit-cards-archived',
          component: () => import('@/views/credit-cards/ArchivedCreditCardsView.vue'),
          meta: { requiresAuth: true, titleKey: 'creditCards.archivedTitle' },
        },
        {
          path: 'credit-cards/:card_id',
          name: 'credit-card-detail',
          component: () => import('@/views/credit-cards/CreditCardDetailView.vue'),
          props: true,
          meta: { requiresAuth: true, titleKey: 'creditCards.detail.title' },
        },
        {
          path: 'credit-card-statements/:statement_id',
          name: 'credit-card-statement-detail',
          component: () => import('@/views/credit-cards/CreditCardStatementView.vue'),
          props: true,
          meta: { requiresAuth: true, titleKey: 'creditCards.statementDetail.title' },
        },
        {
          path: 'financial-accounts/archived',
          name: 'financial-accounts-archived',
          component: () => import('@/views/financial-accounts/ArchivedFinancialAccountsView.vue'),
          meta: { requiresAuth: true, titleKey: 'app.archivedAccounts' },
        },
        {
          path: 'categories',
          name: 'categories',
          component: () => import('@/views/categories/CategoriesListView.vue'),
          meta: { requiresAuth: true, titleKey: 'app.categories' },
        },
        {
          path: 'categories/archived',
          name: 'categories-archived',
          component: () => import('@/views/categories/ArchivedCategoriesView.vue'),
          meta: { requiresAuth: true, titleKey: 'app.archivedCategories' },
        },
        {
          path: 'transactions',
          name: 'transactions',
          component: () => import('@/views/transactions/TransactionsListView.vue'),
          meta: { requiresAuth: true, titleKey: 'app.transactions' },
        },
        {
          path: 'transactions/removed',
          name: 'transactions-removed',
          component: () => import('@/views/transactions/RemovedTransactionsView.vue'),
          meta: { requiresAuth: true, titleKey: 'app.removedTransactions' },
        },
        {
          path: 'transfers',
          name: 'transfers',
          component: () => import('@/views/transfers/TransfersListView.vue'),
          meta: { requiresAuth: true, titleKey: 'app.transfers' },
        },
        {
          path: 'transfers/removed',
          name: 'transfers-removed',
          component: () => import('@/views/transfers/RemovedTransfersView.vue'),
          meta: { requiresAuth: true, titleKey: 'app.removedTransfers' },
        },
        {
          path: 'recurring-transactions',
          name: 'recurring-transactions',
          component: () => import('@/views/recurring-transactions/RecurringTransactionsListView.vue'),
          meta: { requiresAuth: true, titleKey: 'recurringTransactions.title' },
        },
      ],
    },
  ],
})

router.beforeEach(authGuard)

router.afterEach((to) => {
  document.title = to.meta.titleKey ? `${i18n.global.t(to.meta.titleKey)} | Zunera` : 'Zunera'

  queueMicrotask(() => {
    document.getElementById('main-content')?.focus()
  })
})

export default router
