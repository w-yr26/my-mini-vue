/**
 * 注意，此时vnode的结构为：
 * vnode = {
 *    type: Component,
 *    prop: xxx,
 *    children: xxx
 * }
 */

import { shallowReadonly } from '../reactivity/reactive'
import { proxyRefs } from '../reactivity/ref'
import { emit } from './componentEmit'
import { initProps } from './componentProps'
import { componentPublicInstance } from './componentPublicInstance'
import { initSlots } from './componentSlots'

// 创建组件实例对象，挂载一些后续操作需要使用的东西
export function createComponentInstance(vnode, parent) {
  const component = {
    vnode,
    type: vnode.type,
    setupState: {},
    props: {},
    slots: {},
    provides: parent ? parent.provides : {},
    parent,
    isMounted: false,
    subTree: {},
    emit: () => {},
  }

  // 将emit处理函数挂载到组件实例身上
  component.emit = emit.bind(null, component) as any

  return component
}

// 组件初始化 -> 一个组件的setup()要处理:父组件传来的props、插槽内容、自身setup()返回的值
export function setupComponent(instance) {
  // 初始化传给组件的props -> 挂载到组件实例的props上
  initProps(instance, instance.vnode.props)

  // 初始化插槽
  initSlots(instance, instance.vnode.children)

  // 处理组件的setup部分
  setupStatefulComponent(instance)
}

function setupStatefulComponent(instance) {
  // 前面已经将 组件 挂载到组件实例instance的type属性身上
  // vnode.type是组件本身，而 instance.type = vnode.type
  const Component = instance.type

  instance.proxy = new Proxy({ _: instance }, componentPublicInstance)

  const { setup } = Component
  // 用户使用vue时，不一定会传入setup
  if (setup) {
    // 执行setup的时候，为currentInstance赋值
    setCurrentInstance(instance)
    const setupResult = setup(shallowReadonly(instance.props), {
      emit: instance.emit,
    })
    // 重置currentInstance
    setCurrentInstance(null)

    handleSetupResult(instance, setupResult)
  }
}

// 处理setup返回值
function handleSetupResult(instance, setupResult) {
  // setup可能是一个对象，也可能是一个函数。因为在vue3中，可以有函数式组件的写法
  // TODO function
  if (typeof setupResult === 'object') {
    instance.setupState = proxyRefs(setupResult)
  }

  // 处理完组件的setup之后，其实initProps、initSlots也处理完毕，此时要处理组件的render部分
  // 处理顺序也就是：
  // 一个组件传入：
  // 1. 处理setup()
  //  1.1 处理props
  //  1.2 处理slots
  //  1.3 处理setup()返回值
  // 2. 处理render()
  // 但.vue单文件组件中，编写的时候似乎都没有render()这部分，那是因为.vue文件中的<template></template>最终经过编译之后，也会转成render()的形式
  finishComponentSetup(instance)
}

// 把组件的render部分挂载至组件实例对象，方便后续执行setupRenderEffect的时候使用
function finishComponentSetup(instance) {
  const Component = instance.type
  const { render } = Component
  if (render) {
    instance.render = render
  }
}

let currentInstance = null
export function getCurrentInstance() {
  return currentInstance
}

function setCurrentInstance(instance) {
  currentInstance = instance
}
