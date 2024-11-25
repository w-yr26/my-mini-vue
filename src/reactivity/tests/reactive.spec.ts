// 该测试文件已不再适用，只是一开始实现的时候适用，因为此处没有调用effect就直接访问响应式数据（没有进行依赖的收集）
import { reactive } from "../reactive"

describe("reactive", () => {
  it("happy path", () => {
    const original = { foo: 1 }
    const observed = reactive(original)
    expect(observed).not.toBe(original)
    expect(observed.foo).toBe(1)
  })
})