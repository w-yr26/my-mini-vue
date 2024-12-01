import { isObject } from '../shared/index'
import { createComponentInstance, setupComponent } from './component'

export function render(vnode, container) {
  patch(vnode, container)
}

function patch(vnode, container) {
  // 通过type判断是去处理 Component 类型 or element 类型
  // 如果是组件，vnode.type是组件对象

  if (typeof vnode.type === 'string') {
    // 渲染element类型
    processElement(vnode, container)
  } else if (isObject(vnode.type)) {
    // 渲染组件类型
    processComponent(vnode, container)
  }
}

/**
 * 此时的vnode结构类似于：
 * vnode = {
 *  type: 'div',
 *  props: {
 *    class: '',
 *    id: ''
 *  },
 *  children: 'string' or [ h(), h(), 'string' ]
 * }
 *
 */
function processElement(vnode, container) {
  //  创建节点
  const el = document.createElement(vnode.type)
  // children -> string or Array
  const { children } = vnode
  if (typeof children === 'string') {
    // string类型，直接设置内容
    el.textContent = children
  } else if (Array.isArray(children)) {
    // Array类型，递归调用patch -> 进入patch后，再度判断是渲染Component or element
    children.forEach((v) => {
      patch(v, el)
    })
  }
  // props
  const { props } = vnode
  for (const key in props) {
    const val = props[key]
    el.setAttribute(key, val)
  }

  container.append(el)
}

function processComponent(vnode, container) {
  mountComponent(vnode, container)
}

// 组件挂载
function mountComponent(vnode, container) {
  const instance = createComponentInstance(vnode)
  // 处理setup部分
  setupComponent(instance)
  // 处理render
  setupRenderEffect(instance, container)
}

function setupRenderEffect(instance, container) {
  const { proxy } = instance
  // 组件实例的render属性挂载着组件内的render()，而组件内的render()返回一个h()，h()是用来创建虚拟节点的，再度判断type的类型从而判断执行processComponent or processElement -> 开箱操作
  const subTree = instance.render.call(proxy)
  patch(subTree, container)
}
