import { createComponentInstance, setupComponent } from './component'

export function render(vnode, rootContainer) {
  patch(vnode, rootContainer)
}

function patch(vnode, rootContainer) {
  // 通过type判断是去处理 Component 类型 or element 类型
  // TODO element

  // 渲染组件类型
  processComponent(vnode, rootContainer)
}

function processComponent(vnode, rootContainer) {
  mountComponent(vnode, rootContainer)
}

// 组件挂载
function mountComponent(vnode, rootContainer) {
  const instance = createComponentInstance(vnode)
  // 处理setup部分
  setupComponent(instance)
  // 处理render
  setupRenderEffect(instance, rootContainer)
}

function setupRenderEffect(instance, rootContainer) {
  // 组件实例的render属性挂载着组件内的render()，而组件内的render()返回一个h()，h()是用来创建虚拟节点的，但此时创建的虚拟节点的type类型就不再是Component，而是element，所以要再次调用render()进行element的渲染
  const subTree = instance.render()
  render(subTree, rootContainer)
}
