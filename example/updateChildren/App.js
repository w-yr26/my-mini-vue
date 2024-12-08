import { h, ref } from '../../lib/mini-vue.es.js'
import { ArrayToArray } from './ArrayToArray.js'
import { ArrayToText } from './ArrayToText.js'
import { TextToArray } from './TextToArray.js'
import { TextToText } from './TextToText.js'

export const App = {
  name: 'App',
  setup() {
    return {}
  },
  render() {
    return h('div', { id: 'app' }, [
      h('p', {}, '主页'),
      // h(ArrayToText),
      // h(TextToText),
      // h(TextToArray),
      h(ArrayToArray),
    ])
  },
}
