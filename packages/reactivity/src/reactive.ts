import { isObject } from '@my-mini-vue/shared'
import { track, trigger } from './effect'

function createGetter(isReadOnly = false, shallow = false) {
  return function get(target, key) {
    // 判断是否为isReactive -> 如果访问的是ReactiveFlags.IS_REACTIVE属性，说明是在测试 isReactive
    if (key === ReactiveFlags.IS_REACTIVE) return !isReadOnly
    else if (key === ReactiveFlags.IS_READONLY) return isReadOnly

    const res = Reflect.get(target, key)

    // 如果是shallowReadonly，直接返回结果(因为不需要对嵌套的数据进行处理)
    if (shallow) return res

    // 如果是内层嵌套，递归处理成reactive/readonly
    if (isObject(res)) {
      return isReadOnly ? readonly(res) : reactive(res)
    }

    // 依赖的收集(非readonly时才执行)
    !isReadOnly && track(target, key)
    return res
  }
}

function createSetter() {
  return function set(target, key, value) {
    const res = Reflect.set(target, key, value)
    trigger(target, key)
    return res
  }
}

const get = createGetter()
const set = createSetter()
const readonlyGet = createGetter(true)
const shallowReadonlyGet = createGetter(true, true)

const mutableHandlers = {
  get,
  set,
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
  },
}

const shallowReadonlyHandlers = {
  get: shallowReadonlyGet,
  set(target, key, value) {
    console.warn(key, `failed to set, because the ${target} is readonly`)
    return true
  },
}

export function reactive(raw) {
  return new Proxy(raw, mutableHandlers)
}

// 只读，不需要进行依赖的收集，也不能执行setter
export function readonly(raw) {
  return new Proxy(raw, readonlyHandlers)
}

// 只对第一层做readonly处理
export function shallowReadonly(raw) {
  return new Proxy(raw, shallowReadonlyHandlers)
}

const enum ReactiveFlags {
  IS_REACTIVE = '__v_isReactive',
  IS_READONLY = '__v_isReadonly',
}

// 判断是否为响应式对象 -> 让value访问某个对象，从而触发Proxy的getter操作，在getter操作内，通过createGetter的isReadOnly字段判断是否为isReactive/是否为isReadOnly
export function isReactive(value) {
  return !!value[ReactiveFlags.IS_REACTIVE]
}

export function isReadOnly(value) {
  return !!value[ReactiveFlags.IS_READONLY]
}

// 检查一个对象是否是由 reactive()、readonly()、shallowReactive() 或 shallowReadonly() 创建的代理
export function isProxy(value) {
  return isReactive(value) || isReadOnly(value)
}
