<script setup>
import { useI18n } from 'vue-i18n'
import LegalPageLayout from '@/layouts/LegalPageLayout.vue'

const { t } = useI18n()
</script>

<template>
  <LegalPageLayout :title="t('auth.privacyNotice')" :intro="t('legal.notice.intro')">
    <section aria-labelledby="data-collected">
      <h2 id="data-collected">{{ t('legal.notice.dataTitle') }}</h2>
      <ul>
        <li>{{ t('legal.notice.accountData') }}</li>
        <li>{{ t('legal.notice.financialData') }}</li>
        <li>{{ t('legal.notice.technicalData') }}</li>
      </ul>
    </section>
    <section aria-labelledby="data-use">
      <h2 id="data-use">{{ t('legal.notice.useTitle') }}</h2>
      <p>{{ t('legal.notice.useText') }}</p>
    </section>
    <section aria-labelledby="data-service-providers">
      <h2 id="data-service-providers">{{ t('legal.notice.providersTitle') }}</h2>
      <p>{{ t('legal.notice.providersText') }}</p>
    </section>
    <section aria-labelledby="data-security">
      <h2 id="data-security">{{ t('legal.notice.securityTitle') }}</h2>
      <p>{{ t('legal.notice.securityText') }}</p>
    </section>
    <section aria-labelledby="data-retention">
      <h2 id="data-retention">{{ t('legal.notice.retentionTitle') }}</h2>
      <p>{{ t('legal.notice.retentionText') }}</p>
    </section>
    <section aria-labelledby="data-rights">
      <h2 id="data-rights">{{ t('legal.notice.rightsTitle') }}</h2>
      <p>
        {{ t('legal.notice.rightsText') }}
        <RouterLink :to="{ name: 'privacy-rights' }">{{ t('auth.privacyRights') }}</RouterLink>.
      </p>
    </section>
  </LegalPageLayout>
</template>
