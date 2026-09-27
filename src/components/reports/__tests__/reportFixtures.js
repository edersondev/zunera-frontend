export const money = (amount_centavos) => ({ amount_centavos, currency_code: 'BRL' })
export const category = { id: 3, name: 'Food', classification: 'expense', status: 'archived' }
export const account = { id: 7, name: 'Main account', type: 'checking', status: 'archived' }
export const scope = { preset: 'custom', month: null, current_period: { from: '2026-03-01', to: '2026-03-31', day_count: 31 }, previous_period: { from: '2026-01-29', to: '2026-02-28', day_count: 31 }, filters: { account_id: null, category_id: null, transaction_type: null }, is_filtered: false }
export const summary = { realized_income: money(500000), realized_expenses: money(300000), financial_result: money(200000) }
export const buttonStub = { name: 'ElButton', emits: ['click'], template: '<button @click="$emit(\'click\')"><slot /></button>' }
