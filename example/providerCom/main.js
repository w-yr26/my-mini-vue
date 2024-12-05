import { createApp } from '../../lib/mini-vue.es.js'
import { Provider1 } from './App.js'
const rootContainer = document.querySelector('#app')
createApp(Provider1).mount(rootContainer)
