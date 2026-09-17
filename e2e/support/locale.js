/**
 * Pins the application locale before the first navigation.
 *
 * Zunera resolves its locale from `zunera.locale` in localStorage and otherwise
 * defaults to pt-BR, so every spec states the copy language it asserts instead
 * of inheriting whatever the default happens to be.
 */
export async function pinLocale(page, locale = 'pt-BR') {
  await page.addInitScript((value) => window.localStorage.setItem('zunera.locale', value), locale)
}
