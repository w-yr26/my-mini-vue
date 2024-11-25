class ReactiveEffect {
  private _fn: any
  deps = []
  constructor(fn, public scheduler?) {
    this._fn = fn
  }

  run() {
    activeEffect = this
    // 返回函数执行的结果
    const res = this._fn()
    return res
  }

  stop() {
    this.deps.forEach((dep: any) => {
      dep.delete(this)
    })
  }
}

let activeEffect
// effect 的作用就相当于watchFn，通过执行一次fn，触发对应的响应式数据的getter，从而进行依赖的收集ß
export function effect(fn, options: any = {}) {
  const { scheduler } = options
  const _effect = new ReactiveEffect(fn, scheduler)
  _effect.run()

  // return出去一个runner函数
  // run()内部实现存在一个this的指向问题，所以要是有bind
  const runner: any = _effect.run.bind(_effect)
  runner.effect = _effect
  return runner
}

const targetMap = new Map()
// 收集依赖
export function track(target, key) {
  let depsMap = targetMap.get(target)
  if (!depsMap) {
    depsMap = new Map()
    targetMap.set(target, depsMap)
  }
  let dep = depsMap.get(key)
  if (!dep) {
    dep = new Set()
    depsMap.set(key, dep)
  }

  dep.add(activeEffect)
  // activeEffect -> 当前的effect实例
  activeEffect.deps.push(dep)
}

// 依赖的执行
export function trigger(target, key) {
  let depsMap = targetMap.get(target)
  let dep = depsMap.get(key)
  for (const effect of dep) {
    if (effect.scheduler) {
      effect.scheduler()
    } else {
      effect.run()
    }
  }
}

export function stop(runner: any) {
  runner.effect.stop()
}