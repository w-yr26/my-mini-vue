import { reactive } from '../../reactivity/reactive'
import { watchEffect } from '../apiWatch'
import { nextTick } from '../scheduler'

describe('api watchEffect', () => {
  test('effect', async () => {
    const state = reactive({ count: 0 })
    let dummy
    watchEffect(() => {
      dummy = state.count
    })

    expect(dummy).toBe(0)

    state.count++
    // 为什么一定得先await一下？
    // 因为在第一次执行之后，响应式数据更新，schedule被调用，也就是 queuePreFlushCb() 被执行，
    // 而 queuePreFlushCb() 在添加完watchEffect的回调之后，在dom渲染之前执行watchEffect的回调，
    // 但是dom渲染之前执行watchEffect的回调和dom渲染是在异步队列，所以得先await一下，让watchEffect的回调执行完毕
    // 后续拿到的值才会是最新的
    await nextTick()
    expect(dummy).toBe(1)
  })

  test('stopping the watch (effect)', async () => {
    const state = reactive({ count: 0 })
    let dummy
    const stop: any = watchEffect(() => {
      dummy = state.count
    })

    expect(dummy).toBe(0)
    stop()
    state.count++
    await nextTick()
    expect(dummy).toBe(0)
  })
})
