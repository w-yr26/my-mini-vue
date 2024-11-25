class ReactiveEffect {
  private _fn: any
  constructor(fn) {
    this._fn = fn
  }

  run() {
    activeEffect = this
    // 返回函数执行的结果
    const res = this._fn()
    return res
  }
}

let activeEffect
// effect 的作用就相当于watchFn，通过执行一次fn，触发对应的响应式数据的getter，从而进行依赖的收集ß
export function effect(fn) {
  const _effect = new ReactiveEffect(fn)
  _effect.run()

  // run()内部实现存在一个this的指向问题，所以要是有bind
  return _effect.run.bind(_effect)
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
}

// 依赖的执行
export function trigger(target, key) {
  let depsMap = targetMap.get(target)
  let dep = depsMap.get(key)
  for (const effect of dep) {
    effect.run()
  }
}