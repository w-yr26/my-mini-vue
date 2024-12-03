export function initProps(instance, rawProps) {
  // 将组件的vnode的props挂载到组件实例对象的props上，方便后续访问
  // 但是对于有些组件而言(比如App根组件)它的vnode.type是空的，所以要给个空对象
  instance.props = rawProps || {}

  // TODO：atters
}