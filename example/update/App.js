import { h, ref } from '../../lib/mini-vue.es.js'

window.self = null
export const App = {
  name: 'App',
  setup() {
    const count = ref(0)
    const onClick = () => {
      count.value++
    }

    return {
      count,
      onClick,
    }
  },
  render() {
    console.log(this.count)
    // 此时的count已经是一个响应式对象，但是我们在runtime-core处理组件文件的setup()的时候，
    // 还未对setup()内的值做处理
    // 而在render中通过this.xxx访问setup()内的值又是指向组件实例身上的setupState的，所以要去runtime-core的setupState部分做处理
    
    // 在哪里收集组件文件内的render()使用了哪些响应式对象？
    // 追踪到runtime-core的setupRenderEffect -> setupRenderEffect就是用来执行组件文件render()的
    return h(
      'div',
      {
        id: 'root',
      },
      [
        h('p', {}, 'count:' + this.count),
        h(
          'button',
          {
            onClick: this.onClick,
          },
          'click me'
        ),
      ]
    )
  },
}
