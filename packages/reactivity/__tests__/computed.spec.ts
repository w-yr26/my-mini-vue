import { reactive } from '../src/reactive'
import { computed } from '../src/computed'

describe('computed', () => {
  it('happy path', () => {
    const value = reactive({
      foo: 1,
    })

    const getter = computed(() => {
      return value.foo
    })

    expect(getter.value).toBe(1)
    // value.foo = 2;
    // expect(getter.value).toBe(2);
  })

  it('should compute lazily', () => {
    const value = reactive({
      foo: 1,
    })
    const getter = jest.fn(() => {
      return value.foo
    })
    const cValue = computed(getter)

    // lazy -> 懒执行，只有当访问cValue.value的时候，才会触发ComputedRefImpl类中的get -> 进而触发传给computed的回调(也就是此处的getter)
    expect(getter).not.toHaveBeenCalled()
    expect(cValue.value).toBe(1)
    expect(getter).toHaveBeenCalledTimes(1)

    // should not compute again -> 再次访问，被锁住
    cValue.value
    expect(getter).toHaveBeenCalledTimes(1)

    // should not compute until needed -> 触发setter，优先执行scheduler -> 把_dirty的状态修改为true -> 这样以后再访问.value的时候，才能进入对应的逻辑
    value.foo = 2
    expect(getter).toHaveBeenCalledTimes(1)

    // now it should compute -> cValue.value被访问，ComputedRefImpl的get再次执行
    expect(cValue.value).toBe(2)
    expect(getter).toHaveBeenCalledTimes(2)

    // should not compute again -> 再次执行cValue.value，但这次并没有触发setter，也就无法执行scheduler -> 无法修改_dirty的状态 -> 无法执行ComputedRefImpl的get
    cValue.value
    expect(getter).toHaveBeenCalledTimes(2)
  })
})
