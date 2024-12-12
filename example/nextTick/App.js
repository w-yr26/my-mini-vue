import { ref, h, getCurrentInstance, nextTick } from '../../lib/mini-vue.es.js'

export const App = {
  name: 'App',
  setup() {
    const count = ref(0)
    const instance = getCurrentInstance()
    const handleClick = async () => {
      for (let index = 1; index < 100; index++) {
        count.value++
      }
      debugger
      console.log(instance)
      await nextTick()
      console.log(instance)
    }

    return {
      count,
      handleClick,
    }
  },
  render() {
    return h('div', {}, [
      h('button', { onClick: this.handleClick }, 'click me'),
      h('p', {}, 'count:' + this.count),
    ])
  },
}
