import { track, trigger } from './effect'

function createGetter(isReadOnly = false) {
  return function get(target, key) {
    const res = Reflect.get(target, key)
    // 依赖的收集(非readonly时才执行)
    !isReadOnly && track(target, key)
    return res
  }
}

function createSetter(){
  return function set(target, key, value) {
    const res = Reflect.set(target, key, value)
    trigger(target, key)
    return res
  }
}

const get = createGetter()
const set = createSetter()
const readonlyGet = createGetter(true)

const mutableHandlers = {
  get,
  set
}

// 优化：createGetter/createSetter 没必要每次都执行，所以可以在最开始时就执行，并进行缓存
// const mutableHandlers = {
//   getL: createGetter(),
//   set: createSetter()
// }

const readonlyHandlers = {
  get: readonlyGet,
  set(target, key, value) {
    console.warn(key, `failed to set, because the ${target} is readonly`)
    return true
  }
}

export function reactive(raw) {
  return new Proxy(raw, mutableHandlers)
}

// 只读，不需要进行依赖的收集，也不能执行setter
export function readonly(raw) {
  return new Proxy(raw, readonlyHandlers)
}
