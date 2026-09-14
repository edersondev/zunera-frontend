import { describe, expect, it } from 'vitest'
import { i18n } from '@/i18n'
import {
  accountLabel,
  formatCentavos,
  formatMovementLabel,
  formatTransferAmount,
  formatTransferDate,
  formatTransferLabel,
  formatTransferRoute,
  formatTransferStatus,
} from '../transferFormatters'

const t = i18n.global.t

const transfer = {
  id: 1,
  amount_centavos: 123_456,
  transfer_date: '2026-09-13',
  status: 'effective',
  source_financial_account: { id: 1, name: 'Conta corrente', status: 'active' },
  destination_financial_account: { id: 2, name: 'Poupança', status: 'archived' },
}

describe('transfer formatters', () => {
  it('formats the amount without any income or expense sign', () => {
    const amount = formatTransferAmount(transfer)

    expect(amount).toContain('1.234,56')
    expect(amount).not.toContain('+')
    expect(amount).not.toContain('−')
    expect(formatCentavos(0)).toContain('0,00')
  })

  it('labels both sides and marks an archived association', () => {
    expect(accountLabel(transfer.destination_financial_account, t)).toBe('Poupança (arquivada)')
    expect(formatTransferRoute(transfer, t)).toBe('Conta corrente → Poupança (arquivada)')
    expect(formatTransferLabel(transfer, t)).toBe('Transferência: Conta corrente → Poupança (arquivada)')
  })

  it('distinguishes transfer movements from income and expense in mixed history', () => {
    expect(formatMovementLabel({ movement_kind: 'transfer', source_financial_account: transfer.source_financial_account, destination_financial_account: transfer.destination_financial_account }, t)).toContain('Transferência')
    expect(formatMovementLabel({ movement_kind: 'income' }, t)).toBe('Receita')
    expect(formatMovementLabel({ movement_kind: 'expense' }, t)).toBe('Despesa')
  })

  it('formats calendar dates and lifecycle status in the active locale', () => {
    expect(formatTransferDate(transfer.transfer_date)).toContain('2026')
    expect(formatTransferStatus('pending', t)).toBe('Pendente')
  })
})
