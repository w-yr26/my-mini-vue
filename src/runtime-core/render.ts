import { ShapeFlags } from '../shared/shapeFlags'
import { createComponentInstance, setupComponent } from './component'
import { Fragment, Text } from './vnode'

export function render(vnode, container, parentComponent) {
  patch(vnode, container, parentComponent)
}

function patch(vnode, container, parentComponent) {
  // 通过type判断是去处理 Component 类型 or element 类型
  // 如果是组件，vnode.type是组件对象
  const { shapeFlag, type } = vnode

  switch (type) {
    case Fragment:
      processFragment(vnode, container, parentComponent)
      break
    case Text:
      processText(vnode, container)
      break
    default:
      if (shapeFlag & ShapeFlags.ELEMENT) {
        // 渲染element类型
        processElement(vnode, container, parentComponent)
      } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
        // 渲染组件类型
        processComponent(vnode, container, parentComponent)
      }
      break
  }
}

// 创建Fragment
function processFragment(vnode, container, parentComponent) {
  mountChildren(vnode, container, parentComponent)
}

// 创建文本节点
function processText(vnode, container) {
  // 此时的children就是纯文本
  const { children } = vnode
  const textNode = (vnode.el = document.createTextNode(children))
  container.append(textNode)
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
function processElement(vnode, container, parentComponent) {
  //  创建节点
  const el = (vnode.el = document.createElement(vnode.type))
  // children -> string or Array
  const { children, shapeFlag } = vnode
  if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
    // string类型，直接设置内容
    el.textContent = children
  } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
    // Array类型，递归调用patch -> 进入patch后，再度判断是渲染Component or element
    mountChildren(vnode, el, parentComponent)
  }
  // props
  const { props } = vnode
  for (const key in props) {
    const val = props[key]
    const isOn = (key: string) => /^on[A-Z]/.test(key)
    // 事件名称满足onClick、onMousedown...的形式 on Event name
    if (isOn(key)) {
      const event = key.slice(2).toLowerCase()
      el.addEventListener(event, val)
    } else {
      el.setAttribute(key, val)
    }
  }

  container.append(el)
}

function mountChildren(vnode, container, parentComponent) {
  vnode.children.forEach((v) => {
    patch(v, container, parentComponent)
  })
}

function processComponent(vnode, container, parentComponent) {
  mountComponent(vnode, container, parentComponent)
}

// 组件挂载
function mountComponent(vnode, container, parentComponent) {
  const instance = createComponentInstance(vnode, parentComponent)
  // 处理setup部分
  setupComponent(instance)
  // 处理render
  setupRenderEffect(instance, vnode, container)
}

function setupRenderEffect(instance, vnode, container) {
  const { proxy } = instance
  // 组件实例的render属性挂载着组件内的render()，而组件内的render()返回一个h()，h()是用来创建虚拟节点的，再度判断type的类型从而判断执行processComponent or processElement -> 开箱操作
  // subTree是根element返回的虚拟DOM结构，在它身上的el属性才是有值的
  const subTree = instance.render.call(proxy)
  // console.log('subTree', subTree)
  // 此时的instance就是subTree的父节点的组件实例
  patch(subTree, container, instance)

  // 等element patch完毕之后，再把它的vnode.el挂载到根组件的el身上
  vnode.el = subTree.el
}
