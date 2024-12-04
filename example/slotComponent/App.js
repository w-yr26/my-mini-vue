import { h, createTextVNode } from '../../lib/mini-vue.es.js'
import { Foo } from './Foo.js'

export const App = {
  name: 'App',
  render() {
    const app = h('div', {}, 'App')
    const foo = h(
      Foo,
      {},
      {
        first: ({ age }) => [h('p', {}, 'first-' + age), createTextVNode('this is Text')],
        last: () => h('p', {}, 'last'),
      }
    )
    // const foo = h(Foo, {}, h('p', {}, 'this is slot1'))
    return h('div', {}, [app, foo])
  },
  setup() {
    return {}
  },
}
