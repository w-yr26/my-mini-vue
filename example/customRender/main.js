import { createRenderer } from '../../lib/mini-vue.es.js'
import { App } from './App.js'

const renderer = createRenderer({
  createElement(type) {
    console.log('createElement', type)

    if (type === 'rect') {
      const canvas = document.createElement('canvas')
      canvas.width = 80
      canvas.height = 80
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = 'red'
      ctx.fillRect(0, 0, 80, 80)
      return canvas
    }
  },
  patchProp(el, key, val) {
    if (key === 'id') {
      console.log(key + 'exe')
      el.id = val
    } else {
      el[key] = val
    }
  },
  insert(el, parent) {
    parent.appendChild(el)
  },
})

const rootContainer = document.querySelector('#app')
renderer.createApp(App).mount(rootContainer)
