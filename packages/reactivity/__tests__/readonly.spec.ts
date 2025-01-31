import { isReadOnly, readonly } from '../src/reactive'

describe('readonly', () => {
  it('readonly', () => {
    const original = { foo: 1, bar: { baz: 2 } }
    const wrapped = readonly(original)
    expect(wrapped).not.toBe(original)
    expect(isReadOnly(wrapped)).toBe(true)
    expect(isReadOnly(original)).toBe(false)
    expect(isReadOnly(wrapped.bar)).toBe(true)
    expect(isReadOnly(original.bar)).toBe(false)
    // get
    expect(wrapped.foo).toBe(1)
  })
})
