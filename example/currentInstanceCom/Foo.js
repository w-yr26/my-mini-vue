import { h, getCurrentInstance } from '../../lib/mini-vue.es.js'

export const Foo = {
  name: 'Foo',
  render() {
    const foo = h('p', { class: 'foo' }, 'this is foo')

    return h('div', {}, [foo])
  },
  setup() {
    const instance = getCurrentInstance()
    console.log('instance', instance)
    return {}
  },
}
