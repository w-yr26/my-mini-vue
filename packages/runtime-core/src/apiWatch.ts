// watchEffect 的执行是在组件渲染之前，而组件渲染之前已经处理成异步更新，
// 而想在组件渲染之前执行，应该是在异步队列执行之前，异步执行的逻辑在scheduler.ts中

import { ReactiveEffect } from '@my-mini-vue/reactivity'
import { queuePreFlushCb } from './scheduler'

export function watchEffect(fn) {
  function job() {
    // 注意，添加到 activePreFlushCbs 的应该得是run()，这样 activeEffect 才会有值，触发响应式数据的 getter 的时候依赖才会被正确收集
    effect.run()
  }
  const effect = new ReactiveEffect(fn, () => {
    queuePreFlushCb(job)
  })

  // 由于watchEffect不是懒加载的，也就是一上来就要执行，所以需要主动触发run()方法
  effect.run()

  // watchEffect return出去一个stop()方法，用于清除依赖的监听，其实就是 ReactiveEffect 类身上的 stop 方法
  return () => {
    effect.stop()
  }
}
