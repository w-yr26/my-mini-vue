import { effect } from '../effect';
import { reactive } from '../reactive'

describe("effect", () => {
  it("happy path", () => {
    const user = reactive({
      age: 10
    })

    // 这一步，相当于第一次触发执行，从而进行依赖的收集
    let nextAge;
    effect(() => {
      nextAge = user.age + 1
    })
    expect(nextAge).toBe(11)

    // update(响应式数据更新，原先收集的依赖的订阅者都要触发执行)
    user.age++
    expect(nextAge).toBe(12)
  })

  it("should return runner when call effect", () => {
    // 希望effect(fn)的执行 -> return fn -> exe fn -> return val
    let foo = 10
    const runner = effect(() => {
      foo++
      return 'foo'
    })
    expect(foo).toBe(11)

    const r = runner()
    expect(foo).toBe(12)
    expect(r).toBe("foo")
  })
})