'use strict';

/**
 * 判断某个值是否为对象
 * @param value
 * @returns
 */
const isObject = (value) => {
    return value !== null && typeof value === 'object';
};
/**
 * 判断某个键是否在对象身上
 * @param val 对象
 * @param key 键值
 * @returns true/false
 */
const hasOwn = (val, key) => Object.prototype.hasOwnProperty.call(val, key);
/**
 * 处理形如add-foo的事件
 * @param str add-foo
 * @returns addFoo
 */
const camelize = (str) => {
    return str.replace(/-(\w)/g, (_, c) => {
        return c ? c.toUpperCase() : '';
    });
};
/**
 * 事件首字母大写
 * @param str 事件名 event
 * @returns Event
 */
const capitalize = (str) => {
    return str[0].toUpperCase() + str.slice(1);
};
/**
 * on Event
 * @param str Eventname
 * @returns 返回 on + Eventname
 */
const toHandlerKey = (str) => {
    return 'on' + capitalize(str);
};

const targetMap = new Map();
// 依赖的执行
function trigger(target, key) {
    let depsMap = targetMap.get(target);
    let dep = depsMap.get(key);
    triggerEffects(dep);
}
function triggerEffects(dep) {
    for (const effect of dep) {
        if (effect.scheduler) {
            effect.scheduler();
        }
        else {
            effect.run();
        }
    }
}

function createGetter(isReadOnly = false, shallow = false) {
    return function get(target, key) {
        // 判断是否为isReactive -> 如果访问的是ReactiveFlags.IS_REACTIVE属性，说明是在测试 isReactive
        if (key === "__v_isReactive" /* ReactiveFlags.IS_REACTIVE */)
            return !isReadOnly;
        else if (key === "__v_isReadonly" /* ReactiveFlags.IS_READONLY */)
            return isReadOnly;
        const res = Reflect.get(target, key);
        // 如果是shallowReadonly，直接返回结果(因为不需要对嵌套的数据进行处理)
        if (shallow)
            return res;
        // 如果是内层嵌套，递归处理成reactive/readonly
        if (isObject(res)) {
            return isReadOnly ? readonly(res) : reactive(res);
        }
        return res;
    };
}
function createSetter() {
    return function set(target, key, value) {
        const res = Reflect.set(target, key, value);
        trigger(target, key);
        return res;
    };
}
const get = createGetter();
const set = createSetter();
const readonlyGet = createGetter(true);
const shallowReadonlyGet = createGetter(true, true);
const mutableHandlers = {
    get,
    set
};
// 优化：createGetter/createSetter 没必要每次都执行，所以可以在最开始时就执行，并进行缓存
// const mutableHandlers = {
//   getL: createGetter(),
//   set: createSetter()
// }
const readonlyHandlers = {
    get: readonlyGet,
    set(target, key, value) {
        console.warn(key, `failed to set, because the ${target} is readonly`);
        return true;
    }
};
const shallowReadonlyHandlers = {
    get: shallowReadonlyGet,
    set(target, key, value) {
        console.warn(key, `failed to set, because the ${target} is readonly`);
        return true;
    }
};
function reactive(raw) {
    return new Proxy(raw, mutableHandlers);
}
// 只读，不需要进行依赖的收集，也不能执行setter
function readonly(raw) {
    return new Proxy(raw, readonlyHandlers);
}
// 只对第一层做readonly处理
function shallowReadonly(raw) {
    return new Proxy(raw, shallowReadonlyHandlers);
}

const emit = (instance, event, ...args) => {
    console.log('emit exe', event);
    // 拿到的是形如add、click、add-foo的事件，需要将其处理成 on + Event 的形式
    const { props } = instance;
    // 处理事件名
    const handlerName = toHandlerKey(camelize(event));
    const handler = props[handlerName];
    handler && handler(...args);
};

function initProps(instance, rawProps) {
    // 将组件的vnode的props挂载到组件实例对象的props上，方便后续访问
    // 但是对于有些组件而言(比如App根组件)它的vnode.type是空的，所以要给个空对象
    instance.props = rawProps || {};
    // TODO：atters
}

const publicPropertiesMap = {
    $el: (i) => i.vnode.el,
    $slots: (i) => i.slots
};
const componentPublicInstance = {
    get({ _: instance }, key) {
        const { setupState, props } = instance;
        if (key in setupState) {
            return setupState[key];
        }
        // 判断键值在setup return的对象身上还是props对象身上
        if (hasOwn(setupState, key)) {
            return setupState[key];
        }
        else if (hasOwn(props, key)) {
            return props[key];
        }
        // 使用Map的结构映射 $el、$data、 $props...
        const publicGetter = publicPropertiesMap[key];
        if (publicGetter) {
            return publicGetter(instance);
        }
    },
};

function initSlots(instance, children) {
    const { vnode } = instance;
    // shapeFlag对应slot类型时才进行slot的处理
    if (vnode.shapeFlag & 16 /* ShapeFlags.SLOT_CHILDREN */) {
        // 传递的时instance的slots的引用值
        normalizeObjectSlots(children, instance.slots);
    }
}
function normalizeObjectSlots(children, slots) {
    for (const key in children) {
        const value = children[key];
        slots[key] = (props) => normalizeSlotValue(value(props));
    }
}
function normalizeSlotValue(value) {
    return Array.isArray(value) ? value : [value];
}

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
        setupState: {},
        props: {},
        slots: {},
        emit: () => { },
    };
    // 将emit处理函数挂载到组件实例身上
    component.emit = emit.bind(null, component);
    return component;
}
// 组件初始化
function setupComponent(instance) {
    // 初始化传给组件的props -> 挂载到组件实例的props上
    initProps(instance, instance.vnode.props);
    // 初始化插槽
    initSlots(instance, instance.vnode.children);
    // 处理组件的setup部分
    setupStatefulComponent(instance);
}
function setupStatefulComponent(instance) {
    // 前面已经将 组件 挂载到组件实例instance的type属性身上
    // vnode.type是组件本身，而 instance.type = vnode.type
    const Component = instance.type;
    instance.proxy = new Proxy({ _: instance }, componentPublicInstance);
    const { setup } = Component;
    // 用户使用vue时，不一定会传入setup
    if (setup) {
        // 执行setup的时候，为currentInstance赋值
        setCurrentInstance(instance);
        const setupResult = setup(shallowReadonly(instance.props), {
            emit: instance.emit,
        });
        // 重置currentInstance
        setCurrentInstance(null);
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
let currentInstance = null;
function getCurrentInstance() {
    return currentInstance;
}
function setCurrentInstance(instance) {
    currentInstance = instance;
}

const Fragment = Symbol('Fragment');
const Text = Symbol('Text');
function createVNode(type, props, children) {
    const vnode = {
        type,
        props,
        children,
        el: null,
        shapeFlag: getShapeFlag(type),
    };
    if (typeof children === 'string') {
        vnode.shapeFlag = vnode.shapeFlag | 4 /* ShapeFlags.TEXT_CHILDREN */;
    }
    else if (Array.isArray(children)) {
        vnode.shapeFlag = vnode.shapeFlag | 8 /* ShapeFlags.ARRAY_CHILDREN */;
    }
    // 判断其是否有slot (组件 + children object)
    if (vnode.shapeFlag & 2 /* ShapeFlags.STATEFUL_COMPONENT */) {
        if (typeof children === 'object') {
            vnode.shapeFlag = vnode.shapeFlag | 16 /* ShapeFlags.SLOT_CHILDREN */;
        }
    }
    return vnode;
}
// 创建文本vnode
function createTextVNode(text) {
    return createVNode(Text, {}, text);
}
function getShapeFlag(type) {
    return typeof type === 'string'
        ? 1 /* ShapeFlags.ELEMENT */
        : 2 /* ShapeFlags.STATEFUL_COMPONENT */;
}

function render(vnode, container) {
    patch(vnode, container);
}
function patch(vnode, container) {
    // 通过type判断是去处理 Component 类型 or element 类型
    // 如果是组件，vnode.type是组件对象
    const { shapeFlag, type } = vnode;
    switch (type) {
        case Fragment:
            processFragment(vnode, container);
            break;
        case Text:
            processText(vnode, container);
            break;
        default:
            if (shapeFlag & 1 /* ShapeFlags.ELEMENT */) {
                // 渲染element类型
                processElement(vnode, container);
            }
            else if (shapeFlag & 2 /* ShapeFlags.STATEFUL_COMPONENT */) {
                // 渲染组件类型
                processComponent(vnode, container);
            }
            break;
    }
}
// 创建Fragment
function processFragment(vnode, container) {
    mountChildren(vnode, container);
}
// 创建文本节点
function processText(vnode, container) {
    // 此时的children就是纯文本
    const { children } = vnode;
    const textNode = (vnode.el = document.createTextNode(children));
    container.append(textNode);
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
    const el = (vnode.el = document.createElement(vnode.type));
    // children -> string or Array
    const { children, shapeFlag } = vnode;
    if (shapeFlag & 4 /* ShapeFlags.TEXT_CHILDREN */) {
        // string类型，直接设置内容
        el.textContent = children;
    }
    else if (shapeFlag & 8 /* ShapeFlags.ARRAY_CHILDREN */) {
        // Array类型，递归调用patch -> 进入patch后，再度判断是渲染Component or element
        mountChildren(vnode, el);
    }
    // props
    const { props } = vnode;
    for (const key in props) {
        const val = props[key];
        const isOn = (key) => /^on[A-Z]/.test(key);
        // 事件名称满足onClick、onMousedown...的形式 on Event name
        if (isOn(key)) {
            const event = key.slice(2).toLowerCase();
            el.addEventListener(event, val);
        }
        else {
            el.setAttribute(key, val);
        }
    }
    container.append(el);
}
function mountChildren(vnode, container) {
    vnode.children.forEach((v) => {
        patch(v, container);
    });
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
    setupRenderEffect(instance, vnode, container);
}
function setupRenderEffect(instance, vnode, container) {
    const { proxy } = instance;
    // 组件实例的render属性挂载着组件内的render()，而组件内的render()返回一个h()，h()是用来创建虚拟节点的，再度判断type的类型从而判断执行processComponent or processElement -> 开箱操作
    // subTree是根element返回的虚拟DOM结构，在它身上的el属性才是有值的
    const subTree = instance.render.call(proxy);
    // console.log('subTree', subTree)
    patch(subTree, container);
    // 等element patch完毕之后，再把它的vnode.el挂载到根组件的el身上
    vnode.el = subTree.el;
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

function renderSlots(slots, name, props) {
    const slot = slots[name];
    if (slot && typeof slot === 'function') {
        return createVNode(Fragment, {}, slot(props));
    }
}

exports.createApp = createApp;
exports.createTextVNode = createTextVNode;
exports.getCurrentInstance = getCurrentInstance;
exports.h = h;
exports.renderSlots = renderSlots;
