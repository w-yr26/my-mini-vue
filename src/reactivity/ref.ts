import { isChanged } from '../utils'
import { isTracking, trackEffects, triggerEffects } from './effect'

class RefImpl {
  private _value: any
  private dep
  constructor(value) {
    this._value = value
    this.dep = new Set()
  }
  get value() {
    // 依赖收集前，activeEffect!==undefined && 未执行stop()
    if (!isTracking()) return
    trackEffects(this.dep)
    return this._value
  }
  set value(newValue) {
    // ref声明的值如果修改的值和之前的不一样，才触发setter
    if (isChanged(this._value, newValue)) {
      this._value = newValue
      // 先修改值，再去触发依赖更新
      triggerEffects(this.dep)
    }
  }
}

export function ref(value) {
  return new RefImpl(value)
}
