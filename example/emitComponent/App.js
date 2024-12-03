import { h } from '../../lib/mini-vue.es.js'
import { Foo } from './Foo.js'

export const App = {
  name: 'App',
  render() {
    return h('div', {}, [
      h('div', {}, 'App'),
      h(Foo, {
        onAdd(a, b) {
          console.log('onAdd exe', a, b)
        },
        onAddFoo(a, b) {
          console.log('onAddFoo exe', a, b)
        },
      }),
    ])
  },
  setup() {
    return {}
  },
}
