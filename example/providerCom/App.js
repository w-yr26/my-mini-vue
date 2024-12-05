import { h, provide, inject } from '../../lib/mini-vue.es.js'

export const Provider1 = {
  name: 'Provider1',
  setup() {
    provide('key1', 'val1')
    provide('key2', 'val2')
    return {}
  },
  render() {
    return h('div', {}, [h('p', {}, 'Provider1'), h(Provider2)])
  },
}

export const Provider2 = {
  name: 'Provider2',
  setup() {
    provide('key1', 'new val1')
    const val1 = inject('key1')

    return {
      val1,
    }
  },
  render() {
    return h('div', {}, [h('p', {}, `Provider2 - ${this.val1}`), h(Customer)])
  },
}

const Customer = {
  name: 'Customer',
  setup() {
    const val1 = inject('key1')
    const val2 = inject('key2')
    const val3 = inject('key3', 'val3')
    const val4 = inject('key4', () => 'val4')

    return {
      val1,
      val2,
      val3,
      val4,
    }
  },
  render() {
    return h(
      'div',
      {},
      `Custom - ${this.val1}  -  ${this.val2} -  ${this.val3} -  ${this.val4}`
    )
  },
}

// export const App = {
//   name: 'App',
//   setup() {
//     return {}
//   },
//   render() {
//     return h('div', {}, [h(Provider1)])
//   },
// }
