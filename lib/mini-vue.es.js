/**
 * 判断某个值是否为对象
 * @param value
 * @returns
 */
const isObject = (value) => {
    return value !== null && typeof value === 'object';
};

/**
 * 注意，此时vnode的结构为：
 * vnode = {
 *    type: Component,
 *    prop: xxx,
 *    children: xxx
 * }
 */
// 创建组件实例对象，挂载一些后续操作需要使用的东西
function createComponentInstance(vnode) {
    const component = {
        vnode,
        type: vnode.type,
    };
    return component;
}
// 组件初始化
function setupComponent(instance) {
    // TODO
    // initProps() -> 初始化传给组件的props
    // initSlots() -> 初始化插槽
    // 处理组件的setup部分
    setupStatefulComponent(instance);
}
function setupStatefulComponent(instance) {
    // 前面已经将 组件 挂载到组件实例instance的type属性身上
    // vnode.type是组件本身，而 instance.type = vnode.type
    const Component = instance.type;
    const { setup } = Component;
    // 用户使用vue时，不一定会传入setup
    if (setup) {
        const setupResult = setup();
        handleSetupResult(instance, setupResult);
    }
}
// 处理setup返回值
function handleSetupResult(instance, setupResult) {
    // setup可能是一个对象，也可能是一个函数。因为在vue3中，可以有函数式组件的写法
    // TODO function
    if (typeof setupResult === 'object') {
        instance.setupState = setupResult;
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
    finishComponentSetup(instance);
}
// 把组件的render部分挂载至组件实例对象，方便后续执行setupRenderEffect的时候使用
function finishComponentSetup(instance) {
    const Component = instance.type;
    const { render } = Component;
    if (render) {
        instance.render = render;
    }
}

function render(vnode, container) {
    patch(vnode, container);
}
function patch(vnode, container) {
    // 通过type判断是去处理 Component 类型 or element 类型
    // 如果是组件，vnode.type是组件对象
    if (typeof vnode.type === 'string') {
        // 渲染element类型
        processElement(vnode, container);
    }
    else if (isObject(vnode.type)) {
        // 渲染组件类型
        processComponent(vnode, container);
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
    const el = document.createElement(vnode.type);
    // children -> string or Array
    const { children } = vnode;
    if (typeof children === 'string') {
        // string类型，直接设置内容
        el.textContent = children;
    }
    else if (Array.isArray(children)) {
        // Array类型，递归调用patch -> 进入patch后，再度判断是渲染Component or element
        children.forEach((v) => {
            patch(v, el);
        });
    }
    // props
    const { props } = vnode;
    for (const key in props) {
        const val = props[key];
        el.setAttribute(key, val);
    }
    container.append(el);
}
function processComponent(vnode, container) {
    mountComponent(vnode, container);
}
// 组件挂载
function mountComponent(vnode, container) {
    const instance = createComponentInstance(vnode);
    // 处理setup部分
    setupComponent(instance);
    // 处理render
    setupRenderEffect(instance, container);
}
function setupRenderEffect(instance, container) {
    // 组件实例的render属性挂载着组件内的render()，而组件内的render()返回一个h()，h()是用来创建虚拟节点的，但此时创建的虚拟节点的type类型就不再是Component，而是element，所以要再次调用render()进行element的渲染
    const subTree = instance.render();
    patch(subTree, container);
}

function createVNode(type, props, children) {
    const vnode = {
        type,
        props,
        children,
    };
    return vnode;
}

function createApp(rootComponent) {
    return {
        mount(rootContainer) {
            // 传进来的组件都会先处理成虚拟节点，后续都是对vnode进行操作
            const vnode = createVNode(rootComponent);
            // 基于vnode进行渲染
            render(vnode, rootContainer);
        }
    };
}

function h(type, props, children) {
    return createVNode(type, props, children);
}

export { createApp, h };
