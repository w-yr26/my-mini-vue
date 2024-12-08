/**
 * 判断某个值是否为对象
 * @param value
 * @returns
 */
const isObject = (value) => {
    return value !== null && typeof value === 'object';
};
/**
 * 判断某个值是否发生改变
 * @param oldValue 旧值
 * @param newValue 新值
 * @returns true -> 发生改变；false -> 没有改变
 */
const isChanged = (oldValue, newValue) => {
    return !Object.is(oldValue, newValue);
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

let activeEffect;
let shouldTrack = false;
class ReactiveEffect {
    constructor(fn, scheduler) {
        this.scheduler = scheduler;
        this.deps = [];
        this.active = true;
        this._fn = fn;
    }
    run() {
        if (!this.active) {
            return this._fn();
        }
        shouldTrack = true;
        activeEffect = this;
        // 返回函数执行的结果
        const res = this._fn();
        // 重置状态
        shouldTrack = false;
        return res;
    }
    stop() {
        // 清除过一次之后，后续再执行时已经被清除
        if (this.active) {
            this.deps.forEach((dep) => {
                dep.delete(this);
            });
            // 此时this.deps内所收集的dep已经和自身无关，所以可以直接置空
            this.deps.length = 0;
            this.onStop && this.onStop();
            this.active = false;
        }
    }
}
// effect 的作用就相当于watchFn，通过执行一次fn，触发对应的响应式数据的getter，从而进行依赖的收集ß
function effect(fn, options = {}) {
    const { scheduler } = options;
    const _effect = new ReactiveEffect(fn, scheduler);
    // _effect.onStop = onStop
    // 后续可能还要从options中获取其他东西挂载到_effect身上，所以可以适用Object.assign
    Object.assign(_effect, options);
    _effect.run();
    // return出去一个runner函数
    // run()内部实现存在一个this的指向问题，所以要是有bind
    const runner = _effect.run.bind(_effect);
    runner.effect = _effect;
    return runner;
}
const targetMap = new Map();
// 收集依赖
function track(target, key) {
    if (!isTracking())
        return;
    let depsMap = targetMap.get(target);
    if (!depsMap) {
        depsMap = new Map();
        targetMap.set(target, depsMap);
    }
    let dep = depsMap.get(key);
    if (!dep) {
        dep = new Set();
        depsMap.set(key, dep);
    }
    trackEffects(dep);
}
function trackEffects(dep) {
    dep.add(activeEffect);
    // activeEffect -> 当前的effect实例
    activeEffect.deps.push(dep);
}
// 依赖收集前，activeEffect!==undefined && 未执行stop()
function isTracking() {
    return activeEffect !== undefined && shouldTrack;
}
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
        // 依赖的收集(非readonly时才执行)
        !isReadOnly && track(target, key);
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

class RefImpl {
    constructor(value) {
        this.__v_isRef = true;
        // _rawValue保留着未处理之前的数据(reactive处理的数据已变成Proxy对象)，用于后续比对是否前后一致
        this._rawValue = value;
        // 使用ref包裹的数据可能是一个对象，对象需要使用reactive进行处理
        this._value = isObject(value) ? reactive(value) : value;
        this.dep = new Set();
    }
    get value() {
        // 依赖收集前，activeEffect!==undefined && 未执行stop()
        // 不能写成 if (!isTracking()) return -> 因为这里是getter操作，不管isTracking()什么结果，都需要return this._value
        if (isTracking()) {
            trackEffects(this.dep);
        }
        return this._value;
    }
    set value(newValue) {
        // ref声明的值如果修改的值和之前的不一样，才触发setter
        if (isChanged(this._rawValue, newValue)) {
            this._rawValue = newValue;
            this._value = isObject(newValue) ? reactive(newValue) : newValue;
            // 先修改值，再去触发依赖更新
            triggerEffects(this.dep);
        }
    }
}
function ref(value) {
    return new RefImpl(value);
}
// 判断传入的数据是不是一个ref
function isRef(ref) {
    return !!ref.__v_isRef;
}
// isRef ? return ref.value : return 本身
function unRef(ref) {
    return isRef(ref) ? ref.value : ref;
}
// 对ref进行剥离，可以不通过.value进行访问
function proxyRefs(objectWithRefs) {
    return new Proxy(objectWithRefs, {
        get(target, key) {
            return unRef(Reflect.get(target, key));
        },
        set(target, key, newValue) {
            const oldValue = target[key];
            if (isRef(oldValue) && !isRef(newValue)) {
                return (target[key].value = newValue);
                // 使用target[key]的形式而不是Reflect.set的形式的原因：
                // 这个分支对应target[key]为ref而newValue不是ref的情况，实际值存在.value中
                // newValue仅更新ref.value；如果使用Reflect.set，原先的target[key]就不再是ref而是一个普通值
                // 后续原对象再通过.value访问属性值就会报错
                // 总结来说，就是要保留ref本身，仅修改内部的.value
                // return Reflect.set(target, key, newValue)
            }
            else {
                return Reflect.set(target, key, newValue);
            }
        }
    });
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
function createComponentInstance(vnode, parent) {
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
        emit: () => { },
    };
    // 将emit处理函数挂载到组件实例身上
    component.emit = emit.bind(null, component);
    return component;
}
// 组件初始化 -> 一个组件的setup()要处理:父组件传来的props、插槽内容、自身setup()返回的值
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
        instance.setupState = proxyRefs(setupResult);
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
        key: props && props.key,
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

function createAppAPI(render) {
    return function createApp(rootComponent) {
        return {
            mount(rootContainer) {
                // 传进来的组件都会先处理成虚拟节点，后续都是对vnode进行操作
                const vnode = createVNode(rootComponent);
                // 基于vnode进行渲染
                render(vnode, rootContainer, null);
            },
        };
    };
}

function createRenderer(options) {
    const { createElement: hostCreateElement, patchProp: hostPatchProp, insert: hostInsert, remove: hostRemove, setElementText: hostSetElementText, } = options;
    function render(vnode, container, parentComponent) {
        patch(null, vnode, container, parentComponent, null);
    }
    // n1 -> 老的vnode
    // n2 -> 新的vnode
    function patch(n1, n2, container, parentComponent, anchor) {
        // 通过type判断是去处理 Component 类型 or element 类型
        // 如果是组件，n2.type是组件对象
        const { shapeFlag, type } = n2;
        switch (type) {
            case Fragment:
                processFragment(n1, n2, container, parentComponent, anchor);
                break;
            case Text:
                processText(n1, n2, container);
                break;
            default:
                if (shapeFlag & 1 /* ShapeFlags.ELEMENT */) {
                    // 渲染element类型
                    processElement(n1, n2, container, parentComponent, anchor);
                }
                else if (shapeFlag & 2 /* ShapeFlags.STATEFUL_COMPONENT */) {
                    // 渲染组件类型
                    processComponent(n1, n2, container, parentComponent, anchor);
                }
                break;
        }
    }
    // 创建Fragment
    function processFragment(n1, n2, container, parentComponent, anchor) {
        mountChildren(n2.children, container, parentComponent, anchor);
    }
    // 创建文本节点
    function processText(n1, n2, container) {
        // 此时的children就是纯文本
        const { children } = n2;
        const textNode = (n2.el = document.createTextNode(children));
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
    function processElement(n1, n2, container, parentComponent, anchor) {
        if (!n1) {
            // 初始化element
            mountElement(n2, container, parentComponent, anchor);
        }
        else {
            // 更新element
            patchElement(n1, n2, container, parentComponent, anchor);
        }
    }
    function patchElement(n1, n2, container, parentComponent, anchor) {
        // 更新props
        const oldProps = n1.props || {};
        const newProps = n2.props || {};
        // 第一次是初始化，走mountElement(里面会将创建的元素挂载到vnode.el身上)
        // 第二次是更新，走的是patchElement(此时n2身上的el就不再会进行赋值)，所以此处要把上一个(也就是n1)的el先给n2
        // 再接着走一次，第二次的n2已经变成第一次的n1了，所以此时就不会没有值
        // 而且这个el是引用型数据，做出修改时n1、n2的el都会同步做出修改
        const el = (n2.el = n1.el);
        // 处理新旧children
        patchChildren(n1, n2, el, parentComponent, anchor);
        // 处理新旧props
        patchProps(el, oldProps, newProps);
    }
    function patchChildren(n1, n2, container, parentComponent, anchor) {
        const prevShapeFlag = n1.shapeFlag;
        const c1 = n1.children;
        const shapeFlag = n2.shapeFlag;
        const c2 = n2.children;
        if (shapeFlag & 4 /* ShapeFlags.TEXT_CHILDREN */) {
            // 新的为text、旧的为array
            if (prevShapeFlag & 8 /* ShapeFlags.ARRAY_CHILDREN */) {
                // 旧的为array、新的为text
                // 清空老的children
                unmountChildren(n1.children);
            }
            // 如果新旧children不同(不管是旧的为array、新的为text；还是新旧都是text)
            if (c1 !== c2) {
                hostSetElementText(container, c2);
            }
        }
        else {
            if (prevShapeFlag & 4 /* ShapeFlags.TEXT_CHILDREN */) {
                // 新的为array、旧的为text
                // 把老的内容置空
                hostSetElementText(container, '');
                // 把新的children挂上
                mountChildren(c2, container, parentComponent, anchor);
            }
            else {
                // 新的为array、旧的为array -> diff
                patchKeyedChildren(c1, c2, container, parentComponent, anchor);
            }
        }
    }
    function patchKeyedChildren(c1, c2, container, parentComponent, parentAnchor) {
        let i = 0;
        let e1 = c1.length - 1;
        let e2 = c2.length - 1;
        // 判断两个vnode是否一致
        function isSomeVNodeType(n1, n2) {
            return n1.type === n2.type && n1.key === n2.key;
        }
        // 1. 左侧比较
        while (i <= e1 && i <= e2) {
            const n1 = c1[i];
            const n2 = c2[i];
            if (isSomeVNodeType(n1, n2)) {
                // 调用patch()递归执行 -> 因为拿到的n1 n2可能是element、也可能是component
                patch(n1, n2, container, parentComponent, parentAnchor);
            }
            else {
                break;
            }
            i++;
        }
        // 2. 右侧比较
        while (i <= e1 && i <= e2) {
            const n1 = c1[e1];
            const n2 = c2[e2];
            if (isSomeVNodeType(n1, n2)) {
                patch(n1, n2, container, parentComponent, parentAnchor);
            }
            else {
                break;
            }
            e1--;
            e2--;
        }
        // 3. 创建
        if (i > e1) {
            if (i <= e2) {
                const nextPos = e2 + 1;
                const anchor = e2 + 1 < c2.length ? c2[nextPos].el : null;
                while (i <= e2) {
                    patch(null, c2[i], container, parentComponent, anchor);
                    i++;
                }
            }
        }
        else if (i > e2) {
            // 4. 删除
            while (i <= e1) {
                hostRemove(c1[i].el);
                i++;
            }
        }
        else ;
    }
    function unmountChildren(children) {
        for (let index = 0; index < children.length; index++) {
            const el = children[index];
            hostRemove(el);
        }
    }
    function patchProps(el, oldProps, newProps) {
        // 新旧props的key-value都一样时，不需要再执行。但这里是错误写法，因为比较的是地址
        // if (oldProps === newProps) return console.log('无需执行')
        for (const key in newProps) {
            const prevProp = oldProps[key];
            const nextProp = newProps[key];
            hostPatchProp(el, key, prevProp, nextProp);
        }
        for (const key in oldProps) {
            if (!(key in newProps))
                hostPatchProp(el, key, oldProps[key], null);
        }
    }
    function mountElement(vnode, container, parentComponent, anchor) {
        //  创建节点
        const el = (vnode.el = hostCreateElement(vnode.type));
        // children -> string or Array
        const { children, shapeFlag } = vnode;
        if (shapeFlag & 4 /* ShapeFlags.TEXT_CHILDREN */) {
            // string类型，直接设置内容
            el.textContent = children;
        }
        else if (shapeFlag & 8 /* ShapeFlags.ARRAY_CHILDREN */) {
            // Array类型，递归调用patch -> 进入patch后，再度判断是渲染Component or element
            mountChildren(vnode.children, el, parentComponent, anchor);
        }
        // props
        const { props } = vnode;
        for (const key in props) {
            const val = props[key];
            hostPatchProp(el, key, null, val);
        }
        hostInsert(el, container, anchor);
    }
    function mountChildren(children, container, parentComponent, anchor) {
        children.forEach((v) => {
            patch(null, v, container, parentComponent, anchor);
        });
    }
    function processComponent(n1, n2, container, parentComponent, anchor) {
        mountComponent(n2, container, parentComponent, anchor);
    }
    // 组件挂载
    function mountComponent(vnode, container, parentComponent, anchor) {
        const instance = createComponentInstance(vnode, parentComponent);
        // 处理setup部分
        setupComponent(instance);
        // 处理render
        setupRenderEffect(instance, vnode, container, anchor);
    }
    function setupRenderEffect(instance, vnode, container, anchor) {
        effect(() => {
            if (!instance.isMounted) {
                // init
                const { proxy } = instance;
                const subTree = (instance.subTree = instance.render.call(proxy));
                patch(null, subTree, container, instance, anchor);
                vnode.el = subTree.el;
                instance.isMounted = true;
            }
            else {
                // update
                const { proxy } = instance;
                const subTree = instance.render.call(proxy);
                const preSubTree = instance.subTree;
                // 更新组件实例身上的subTree -> 应该放当前的
                instance.subTree = subTree;
                patch(preSubTree, subTree, container, instance, anchor);
            }
        });
    }
    return {
        createApp: createAppAPI(render),
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

function provide(key, value) {
    // 存 -> 在组件实例身上存一个provides
    const currentInstance = getCurrentInstance();
    if (currentInstance) {
        let { provides } = currentInstance;
        const parentProvides = currentInstance.parent
            ? currentInstance.parent.provides
            : {};
        if (provides === parentProvides) {
            provides = currentInstance.provides = Object.create(parentProvides);
        }
        provides[key] = value;
    }
}
function inject(key, defaultVal) {
    // 取 -> 组件实例身上的parent字段存着它的父组件实例，应该从它的父组件实例身上的provides取值
    const currentInstance = getCurrentInstance();
    if (currentInstance) {
        const parentProvides = currentInstance.parent.provides;
        if (key in parentProvides) {
            return parentProvides[key];
        }
        else if (defaultVal) {
            if (typeof defaultVal === 'function')
                return defaultVal();
            return defaultVal;
        }
    }
}

function createElement(type) {
    return document.createElement(type);
}
function patchProp(el, key, prevVal, nextVal) {
    const isOn = (key) => /^on[A-Z]/.test(key);
    // 事件名称满足onClick、onMousedown...的形式 on Event name
    if (isOn(key)) {
        const event = key.slice(2).toLowerCase();
        el.addEventListener(event, nextVal);
    }
    else {
        if (!nextVal) {
            el.removeAttribute(key);
        }
        else {
            el.setAttribute(key, nextVal);
        }
    }
}
function insert(el, parent, anchor) {
    // parent.append(el)
    parent.insertBefore(el, anchor || null);
}
function remove(child) {
    const parent = child.parentNode;
    if (parent) {
        parent.removeChild(child);
    }
}
function setElementText(el, text) {
    el.textContent = text;
}
const renderer = createRenderer({
    createElement,
    patchProp,
    insert,
    remove,
    setElementText,
});
function createApp(...args) {
    return renderer.createApp(...args);
}

export { createApp, createTextVNode, getCurrentInstance, h, inject, provide, ref, renderSlots };
