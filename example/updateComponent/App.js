import { h, ref } from '../../lib/mini-vue.es.js'

import { Child } from './Child.js'

export const App = {
  name: 'App',
  setup() {
    const msg = ref('123')
    const count = ref(10)

    window.msg = msg

    const changeChildProps = () => {
      msg.value = '456'
    }

    const changeCount = () => {
      count.value++
    }

    return {
      msg,
      count,
      changeChildProps,
      changeCount,
    }
  },
  render() {
    return h('div', {}, [
      h('div', {}, 'hello'),
      h('button', { onClick: this.changeChildProps }, 'change child props'),
      h(Child, { msg: this.msg }),
      h('button', { onClick: this.changeCount }, 'change count'),
      h('div', {}, 'count:' + this.count),
    ])
  },
}

/**
 * 不加处理的情况下，执行changeCount，虽然Child组件个该响应式数据，但是
 * 对于整个<App />组件而言，使用了这个响应式数据，所以count改变的时候，<Child />
 * 也就不得不执行
 */