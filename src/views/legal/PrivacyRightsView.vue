<script setup>
import { useI18n } from 'vue-i18n'
import LegalPageLayout from '@/layouts/LegalPageLayout.vue'

const { t } = useI18n()
</script>

<template>
  <LegalPageLayout :title="t('auth.privacyRights')" :intro="t('legal.rights.intro')">
    <section aria-labelledby="your-rights">
      <h2 id="your-rights">{{ t('legal.rights.listTitle') }}</h2>
      <ul>
        <li>{{ t('legal.rights.access') }}</li>
        <li>{{ t('legal.rights.correct') }}</li>
        <li>{{ t('legal.rights.delete') }}</li>
        <li>{{ t('legal.rights.portability') }}</li>
        <li>{{ t('legal.rights.information') }}</li>
        <li>{{ t('legal.rights.object') }}</li>
        <li>{{ t('legal.rights.automated') }}</li>
      </ul>
      <p>{{ t('legal.rights.conditions') }}</p>
    </section>
    <section aria-labelledby="exercise-rights">
      <h2 id="exercise-rights">{{ t('legal.rights.exerciseTitle') }}</h2>
      <p>{{ t('legal.rights.editName') }}</p>
      <p>{{ t('legal.rights.formPending') }}</p>
      <p>{{ t('legal.rights.safety') }}</p>
    </section>
    <section aria-labelledby="authority">
      <h2 id="authority">{{ t('legal.rights.authorityTitle') }}</h2>
      <p>
        {{ t('legal.rights.authorityText') }}
        <a href="https://www.gov.br/anpd/pt-br/assuntos/titular-de-dados-1/direito-dos-titulares" target="_blank" rel="noopener noreferrer">
          {{ t('legal.rights.authorityLink') }}
        </a>.
      </p>
    </section>
  </LegalPageLayout>
</template>
