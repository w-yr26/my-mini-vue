import { isChanged, isObject } from '../shared/index'
import { isTracking, trackEffects, triggerEffects } from './effect'
import { reactive } from './reactive'

class RefImpl {
  private _value: any
  private _rawValue: any
  private dep
  public __v_isRef = true
  constructor(value) {
    // _rawValue保留着未处理之前的数据(reactive处理的数据已变成Proxy对象)，用于后续比对是否前后一致
    this._rawValue = value
    // 使用ref包裹的数据可能是一个对象，对象需要使用reactive进行处理
    this._value = isObject(value) ? reactive(value) : value
    this.dep = new Set()
  }
  get value() {
    // 依赖收集前，activeEffect!==undefined && 未执行stop()
    // 不能写成 if (!isTracking()) return -> 因为这里是getter操作，不管isTracking()什么结果，都需要return this._value
    if (isTracking()) {
      trackEffects(this.dep)
    }
    return this._value
  }
  set value(newValue) {
    // ref声明的值如果修改的值和之前的不一样，才触发setter
    if (isChanged(this._rawValue, newValue)) {
      this._rawValue = newValue
      this._value = isObject(newValue) ? reactive(newValue) : newValue
      // 先修改值，再去触发依赖更新
      triggerEffects(this.dep)
    }
  }
}

export function ref(value) {
  return new RefImpl(value)
}

// 判断传入的数据是不是一个ref
export function isRef(ref) {
  return !!ref.__v_isRef
}

// isRef ? return ref.value : return 本身
export function unRef(ref) {
  return isRef(ref) ? ref.value : ref
}

// 对ref进行剥离，可以不通过.value进行访问
export function proxyRefs(objectWithRefs) {
  return new Proxy(objectWithRefs, {
    get(target, key) {
      return unRef(Reflect.get(target, key))
    },
    set(target, key, newValue) {
      const oldValue = target[key]
      if (isRef(oldValue) && !isRef(newValue)) {
        return (target[key].value = newValue)
        // 使用target[key]的形式而不是Reflect.set的形式的原因：
        // 这个分支对应target[key]为ref而newValue不是ref的情况，实际值存在.value中
        // newValue仅更新ref.value；如果使用Reflect.set，原先的target[key]就不再是ref而是一个普通值
        // 后续原对象再通过.value访问属性值就会报错
        // 总结来说，就是要保留ref本身，仅修改内部的.value
        // return Reflect.set(target, key, newValue)
      } else {
        return Reflect.set(target, key, newValue)
      }
    }
  })
}