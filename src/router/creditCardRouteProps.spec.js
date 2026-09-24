import { describe, expect, it } from 'vitest'
import router from './index'

describe('credit card route props', () => {
  it.each([
    ['/app/credit-cards/2', { cardId: '2' }],
    ['/app/credit-card-statements/72', { statementId: '72' }],
  ])('passes params to required view props for %s', (path, expectedProps) => {
    const route = router.resolve(path)
    const routeRecord = route.matched.at(-1)

    expect(routeRecord.props.default(route)).toEqual(expectedProps)
  })
})
