import { h, getCurrentInstance } from '../../lib/mini-vue.es.js'
import { Foo } from './Foo.js'

export const App = {
  name: 'App',
  render() {
    const app = h('div', {}, 'app')

    return h('div', {}, [app, h(Foo)])
  },
  setup() {
    const instance = getCurrentInstance()
    console.log('instance', instance)
    return {}
  },
}
