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
    $slots: (i) => i.slots,
    $props: (i) => i.props,
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
        next: null,
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

function shouldUpdate(n1, n2) {
    const { props: prevProps } = n1;
    const { props: nextProps } = n2;
    for (const key in nextProps) {
        if (nextProps[key] !== prevProps[key])
            return true;
    }
    return false;
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
        component: null,
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

const queue = [];
const activePreFlushCbs = [];
let isFlushPending = false;
function nextTick(fn) {
    return fn ? Promise.resolve().then(fn) : Promise.resolve();
}
function queueJobs(job) {
    // 更新任务加入队列
    if (!queue.includes(job)) {
        queue.push(job);
    }
    // 微任务队列中处理更新任务
    queueFlush();
}
function queueFlush() {
    if (isFlushPending)
        return;
    isFlushPending = true;
    nextTick(() => {
        isFlushPending = false;
        // 在真正执行渲染之前，先执行watchEffect内的内容
        flushPreFlushCbs();
        let job;
        while ((job = queue.shift())) {
            job && job();
        }
    });
}
function flushPreFlushCbs() {
    for (let i = 0; i < activePreFlushCbs.length; i++) {
        activePreFlushCbs[i]();
    }
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
        const l2 = e2 + 1;
        // 判断两个vnode是否一致
        function isSomeVNodeType(n1, n2) {
            return n1.type === n2.type && n1.key === n2.key;
        }
        // 1. 左侧比较
        while (i <= e1 && i <= e2) {
            const n1 = c1[i];
            const n2 = c2[i];
            // 有关为什么要设置key的思考：
            // 在左侧比较中
            // 首先是根据vnode的type和key来进行判断新旧是否相同的。但由于一般开发中很少去修改type，所以此处就仅讨论key
            // 现在假设新旧的vnode的type都是相同的
            // 如果都不设置key，那么oldVnode.key === undefined === newVnode.key，也就意味这判断会认定他俩是相同的
            //  那么就会一直进入这个分支，递归调用patch -> 进而执行 patchElement
            // 但是存在一种情况就是当乱序的时候：
            // A B C D E
            // A B D C E
            // 前面两个(A B)递归调用patch()没毛病，但是到了 C -> D 进行比对的时候，会认为是同个类型(前面已经假定type一致)
            // 此时就会调用patch -> 进而把 C 换成 D；到了 D -> C 比对的时候，同样的逻辑，把 D 换成 C
            // 但其实 C D -> D C 是可以复用的，把 C 换成 D，再把 D 换成 C 其实是没必要的，所以说要加个 key
            // 在右侧比较中，key的作用同上
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
                const nextPos = l2;
                const anchor = l2 < c2.length ? c2[nextPos].el : null;
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
        else {
            // 乱序比较
            let s1 = i;
            let s2 = i;
            let toBePatched = e2 - s2 + 1; // 乱序部分待被处理的新结点个数
            let patched = 0; // 乱序部分已经处理的新结点个数
            const keyToNewIndexMap = new Map();
            // 新的vnode在老的vnodes中的位置，先都初始化为0，如果新的vnode映射到老的vnodes的时候位置为0，说明新结点在老节点中不存在，就需要创建新的vnode
            const newIndexToOldIndexMap = new Array(toBePatched).fill(0);
            let moved = false;
            let maxNewIndexSoFar = 0;
            // 再来说说乱序比较中，key的作用：帮助快速定位老的vnode在新的children中是否存在
            // 老的children: A B (C D) F G
            // 新的children: A B (E C) F G
            // 如果没有key，在前面左侧对比的时候，就已经被挨个替换了
            // 如果没有设置 key，那么最初在建立映射hash表的时候，得到的结果就是
            // { undefined -> index }
            // 等到老的children乱序部分来进行遍历的时候(也就是C D节点)，由于prevChild.key !== null始终不满足，
            // 所以对于老的乱序部分的每一个节点都会走else分支，也就是遍历新的乱序部分，看看老的vnode是否存在于新的children( C/D 是否存在于(E C))
            // 但是在比较的过程中，始终都认为它们是一致的(因为前面说type一致，而他们的key又都是undefined)
            // 就会拿到newIndex
            // 一拿到newIndex，就会走patch的逻辑。也就是 C 会被换成 E，D 会被换成 C
            // 但你发现 C 是没必要被换掉之后再换回来的，所以说要key
            // 先建立映射表，存放新的children有哪些节点
            for (let t = s2; t <= e2; t++) {
                const nextChild = c2[t];
                keyToNewIndexMap.set(nextChild.key, t);
            }
            // 遍历旧的vnodes，查看旧的vnode是否在新的vnodes中存在
            // 且使用最长递增子序列，求出新的vnodes中相对位置不变的部分
            for (let t = s1; t <= e1; t++) {
                const prevChild = c1[t];
                // 所有的新vnode都被处理完了 -> 多出来的旧的vnode直接移除
                if (patched >= toBePatched) {
                    hostRemove(prevChild.el);
                    continue;
                }
                let newIndex;
                // 对应 key 为null/undefined的情况
                if (prevChild.key !== null) {
                    // 有key，直接根据key进行比较
                    newIndex = keyToNewIndexMap.get(prevChild.key);
                }
                else {
                    // 没有key，遍历新的children，看看老的节点是否还在新的里面
                    for (let j = s2; j <= e2; j++) {
                        // isSomeVNodeType是根据key和type进行比较的，但由于此时都已经是老的vnode没有key的情况了，所以这个分支一定不会走
                        if (isSomeVNodeType(prevChild, c2[j])) {
                            newIndex = j;
                            break;
                        }
                    }
                }
                if (!newIndex) {
                    // 旧的节点在新的children中找不到 -> 移除
                    hostRemove(prevChild.el);
                }
                else {
                    // 旧的节点在新的vnods中找得到 -> 移动位置 -> 由于diff算法是在整个程序中频繁调用的，所以肯定不能直接暴力全部重新渲染，此时可以使用最长递增子序列，求出稳定不变的部分
                    // 由于newIndexToOldIndexMap[] = 0意味着vnode在老的中不存在，为了避免i=0，所以统一+1，反正后续进行最长递增子序列算法的时候也只是要得到对应的下标
                    newIndexToOldIndexMap[newIndex - s2] = t + 1;
                    // 旧的节点在新的children中找得到 -> 深度对比，对比完还要移动更新渲染位置(怎么理解深度对比的时候还是调用patch？因为进入patch之后，后续根据条件判断，最终会走到patchElement而不再是mountElement)
                    // 那么为什么此处已经执行了patch，后面在LIS的时候还要再度执行hostInsert？patch内部走到最后不是会执行hostSetElementText吗？这样不会导致重复创建child吗？
                    // 首先，patch -> patchElement -> patchChildren 内确实存在执行 hostSetElementText 的情况，但是对于新旧节点文本内容一致的情况，并不会走该分支
                    // 其次，hostInsert 是将元素插入文档、，不是创建创建元素，别搞混了！
                    // 再者，要知道为什么要是有LIS？是对于有些节点，它在新旧vnodes中并没有发生改变，但是它的顺序发生了改变，此时没必要暴力删除重建，而是可以通过移动实现未发生变化的vnode的复用
                    // 而移动到哪？怎么移，就需要使用LIS
                    if (newIndex > maxNewIndexSoFar) {
                        maxNewIndexSoFar = newIndex;
                    }
                    else {
                        moved = true;
                    }
                    patch(prevChild, c2[newIndex], container, parentComponent, null);
                    patched++;
                }
            }
            const increasingIndexSequence = moved
                ? getSequence(newIndexToOldIndexMap)
                : [];
            // 最长递增子序列指针
            let j = increasingIndexSequence.length - 1;
            for (let t = toBePatched - 1; t >= 0; t--) {
                const nextIndex = t + s2;
                const nextChild = c2[nextIndex];
                const anchor = nextIndex + 1 < l2 ? c2[nextIndex + 1].el : null;
                if (moved) {
                    if (newIndexToOldIndexMap[t] === 0) {
                        // 在老的里面不存在，在新的里面存在(注意，此处patch第一个参数为null，所以走到patch里面最后会执行创建逻辑而不是更新逻辑，也就是mountElement，mountElement内即会创建，还会插入)
                        patch(null, nextChild, container, parentComponent, anchor);
                    }
                    else {
                        // 在新的老的里面都存在
                        if (t !== increasingIndexSequence[j]) {
                            // console.log('移动位置')
                            // 明明前面newIndex不为空的时候已经调用patch了，为什么这里还要执行hostInsert？hostInsert不是会重复创建元素吗？
                            // 对于insertBefore来说，如果节点在容器内已经存在，则不会再创建，而是按照指定的位置进行移动；只有节点在容器内不存在，才会创建
                            hostInsert(nextChild.el, container, anchor);
                        }
                        else {
                            j--;
                        }
                    }
                }
            }
        }
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
        if (!n1) {
            mountComponent(n2, container, parentComponent, anchor);
        }
        else {
            updateComponent(n1, n2);
        }
    }
    // 更新组件 -> 更新组件的props、重新执行组件的render() ->进而触发更新element
    function updateComponent(n1, n2) {
        // if (shouldUpdate(n1, n2)) {
        //   const instance = (n2.component = n1.component)
        //   instance.next = n2
        //   instance.update()
        // } else {
        //   // 会有一种情况：先是更新和当前组件依赖的响应式数据无关的值，再更新和当前组件依赖的响应式数据有关的值
        //   // 但是此时在走shouldUpdate的分支的时候，n1.component为null，null身上就不再能访问next属性
        //   // 因为n1代表的是旧的vnode，只是一进来就更新和当前组件依赖的响应式数据的话，n1刚好就是最开始执行创建逻辑的vnode，身上的component就不为null(因为在mountComponent已经赋值)
        //   // 所以在此处也需要进行更新
        // }
        const instance = (n2.component = n1.component);
        if (shouldUpdate(n1, n2)) {
            instance.next = n2;
            instance.update();
        }
        else {
            // 会有一种情况：先是更新和当前组件依赖的响应式数据无关的值，再更新和当前组件依赖的响应式数据有关的值
            // 但是此时在走shouldUpdate的分支的时候，n1.component为null，null身上就不再能访问next属性
            // 因为n1代表的是旧的vnode，只是一进来就更新和当前组件依赖的响应式数据的话，n1刚好就是最开始执行创建逻辑的vnode，身上的component就不为null(因为在mountComponent已经赋值)
            // 所以在此处也需要进行更新
            // 要注意：第一次更新的n2在第二次更新会变成n1
            n2.el = n1.el;
            instance.vnode = n2;
        }
    }
    /**
     * instance和vnode的关联：
     * instance：组件实例对象，props代表父组件传给子组件的属性，身上的vnode属性代表上一个vnode对象，next属性代表下一个vnode对象
     * vnode：虚拟节点，props代表id、class等，身上的el属性代表根容器，身上的component属性代表组件实例对象
     * instance和vnode存在着能够相互引用的字段
     */
    // 组件挂载
    function mountComponent(initialVNode, container, parentComponent, anchor) {
        const instance = (initialVNode.component = createComponentInstance(initialVNode, parentComponent));
        // 处理setup部分
        setupComponent(instance);
        // 处理render
        setupRenderEffect(instance, initialVNode, container, anchor);
    }
    function setupRenderEffect(instance, vnode, container, anchor) {
        instance.update = effect(() => {
            if (!instance.isMounted) {
                // init
                const { proxy } = instance;
                const subTree = (instance.subTree = instance.render.call(proxy));
                patch(null, subTree, container, instance, anchor);
                vnode.el = subTree.el;
                instance.isMounted = true;
            }
            else {
                console.log('exe');
                // 组件的更新逻辑是借助effect的返回值触发执行的
                // effect返回一个runner，当调用runner的时候，就可以再次执行传给effect的函数，当更新组件的时候调用runner，就能跳转到这里执行
                // console.log('update Component')
                // 更新组件的props,next是新的vnode，vnode是老的vnode
                const { next, vnode } = instance;
                if (next) {
                    next.el = vnode.el;
                    updateComponentPreRender(instance, next);
                }
                // 重新执行组件文件的render()方法
                const { proxy } = instance;
                const subTree = instance.render.call(proxy);
                const preSubTree = instance.subTree;
                // 更新组件实例身上的subTree -> 应该放当前的
                instance.subTree = subTree;
                patch(preSubTree, subTree, container, instance, anchor);
            }
        }, {
            scheduler: () => {
                console.log('exe scheduler');
                queueJobs(instance.update);
            },
        });
    }
    return {
        createApp: createAppAPI(render),
    };
}
function updateComponentPreRender(instance, nextVNode) {
    instance.vnode = nextVNode;
    instance.next = null;
    instance.props = nextVNode.props;
}
function getSequence(arr) {
    const p = arr.slice();
    const result = [0];
    let i, j, u, v, c;
    const len = arr.length;
    for (i = 0; i < len; i++) {
        const arrI = arr[i];
        if (arrI !== 0) {
            j = result[result.length - 1];
            if (arr[j] < arrI) {
                p[i] = j;
                result.push(i);
                continue;
            }
            u = 0;
            v = result.length - 1;
            while (u < v) {
                c = (u + v) >> 1;
                if (arr[result[c]] < arrI) {
                    u = c + 1;
                }
                else {
                    v = c;
                }
            }
            if (arrI < arr[result[u]]) {
                if (u > 0) {
                    p[i] = result[u - 1];
                }
                result[u] = i;
            }
        }
    }
    u = result.length;
    v = result[u - 1];
    while (u-- > 0) {
        result[u] = v;
        v = p[v];
    }
    return result;
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

export { createApp, createRenderer, createTextVNode, getCurrentInstance, h, inject, nextTick, provide, ref, renderSlots };
