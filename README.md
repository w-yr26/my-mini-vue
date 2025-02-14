# mini-vue

## 已实现功能

**reactivity 模块：**

- effect
- ref/reactive
  > 1. 惰性递归处理成响应式，这一点有别于Vue2，只有拦截到的数据是引用型数据，才会接着处理下一层；Vue2是直接无脑递归<br/>
  > 2. Vue2基于Object.defineProperty，只会在初始化时进行拦截，对于后续响应式数据的删除、新增并无法拦截到；但Vue3使用Proxy拦截的是整一个对象，任何变化都可以监听到<br/>
  > 3. 但是Proxy只能拦截对象，对于基本类型的数据无法拦截。所以ref实现的原理其实是将声明的数据(不管是引用型数据还是基本类型的数据)都封装到一个**新的对象**身上，并暴露一个`.value`接口进行访问。但是对于引用型数据，还需借助`reactive`将其内部也处理成响应式数据<br/>
  > 4. 这也意味着，如果使用ref声明应用型数据进行watch监听时，需要使用深度监听

- readonly、shallowReadonly、isReactive、isReadOnly、isProxy
- isRef、proxyRefs(ref解包)
- computed(内部维护一个脏标记，当响应式数据变化，执行`scheduler`改变脏标记为`true`，下次再次访问时重新计算)

**runtime-core模块：**

- render -> path -> processFragment、processText、processComponent、processElement -> mountElement(挂载)/patchElement(更新)
  
  - mountElement -> mountChildren、hostPatchProp、hostInsert
  - patchElement -> patchProps、patchChildren -> TextToText、TextToArray、ArrayToText、ArrayToArray(diff:左侧对比、右侧对比、中间乱序部分使用最长递增子序列求出稳定部分`patchKeyedChildren` -> 删除、移动、新增)

- processComponent -> mountComponent(挂载)/patchComponent(更新) -> setupComponent(处理组件setup部分)、setupRenderEffect(处理组件render部分) -> 接收组件`render()`返回值**递归**调用patch() -> 组件不断“开箱”操作，最终回到processElement

- reactivity的effect将组件render()作为**依赖**进行收集并监听，实现响应式数据更新 -> 触发依赖更新 -> 触发视图更新

- 借助effect返回值以及Options传入调度器，将更新逻辑通过`Promise.then()`放置在异步更新队列中，实现`nextTick`

  > 注意：Vue2和Vue3`nextTick`实现的区别：在Vue2中会通过降级处理将更新操作放置在异步队列中；但Vue3中是直接使用Promise.then()。因为Vue3的响应式使用Proxy本身就存在一定的兼容性，可以支持Proxy也就意味着浏览器版本足够支持Promise.then()

- 父子组件之间的通信：props、emit
- 祖孙组件之间的通信：provide、inject(寄生式继承)

  > 为什么一定是寄生式继承？不能是原型链继承、构造函数继承、`extend`继承？
  > 1. 原型链继承会污染原型链，子组件provide的修改可能会改变父组件的provide
  > 2. 构造函数继承：需要显式调用父类构造函数，且父组件provide的修改无法实时响应给子组件
  > 3. extend：通常是进行复制实现的继承，创建独立的副本，内存开销大、无法基于原型链查找、无法实时响应给子组件
  > 4. Object.create()：轻量操作，不会复制父对象的属性，只是共享，可以实现父组件的provide改变实时响应给子组件，性能和内存占用上有较大优势；子组件provide的修改可以覆盖父组件但不会修改父组件已有的provide(符合provide-inject的功能)
- 默认插槽、具名插槽、作用域插槽(维护一张表进行查找获取)

**runtime-dom模块：**

- createRenderer实现自定义渲染器
- 抽象runtime-core，传入适用于Web的DOM API，实现渲染依赖于稳定的接口，而非具体的实现
- 自定义渲染器传入适用于Canvas平台的API，实现Canvas平台的渲染(测试用例)


## monorepo 处理各模块

### 步骤：

- `pnpm-workspace.yaml`声明工作空间
- 各子模块安装对应所依赖的其他子模块
  `pnpm i @my-mini-vue/shared --filter @my-mini-vue/reactivity --workspace`
- 替换引入路径为安装的子模块，eg:
  `import { isObject } from '@my-mini-vue/shared'`

**注意**：

1. 更新为`monorepo`之后到注意同步更新各子模块需要导出的东西
2. 对于测试文件，也要更新导入路径

### 各模块之间的依赖关系

![各模块依赖关系](https://github.com/user-attachments/assets/d00e9296-5e78-4992-a9b3-b1f45ba8a4d6)

## runtime-core 创建流程

![runtime-core流程图](https://github.com/user-attachments/assets/7528364a-1fca-4583-a844-654b8c6b351f)

## runtime-core 更新流程

![whiteboard_exported_image (2)](https://github.com/user-attachments/assets/259cd260-6a92-4a6d-b227-d4c634e38ccd)

**Q&A**: 视图创建如何知道需要进行更新？

也就是组件内的响应式数据发生改变之后，怎么通知组件这一个“依赖”重新执行？答案是`reactivity`模块的`effect`将组件的`render()`收集到`Dep`中，后续响应式数据发生变化，才会执行`Dep`通知依赖更新的逻辑

```vue
  // 示例代码
  function setupRenderEffect(instance, vnode, container) {
    effect(() => {
      if (!instance.isMounted) {
        // init
        const { proxy } = instance
        const subTree = (instance.subTree = instance.render.call(proxy))
        patch(null, subTree, container, instance)

        vnode.el = subTree.el

        instance.isMounted = true
      } else {
        // update
        const { proxy } = instance
        const subTree = instance.render.call(proxy)
        const preSubTree = instance.subTree
        // 更新组件实例身上的subTree -> 应该放当前的
        instance.subTree = subTree

        patch(preSubTree, subTree, container, instance)
      }
    })
  }
```
此处并未涉及异步更新的概念，异步更新可通过`effect()`的返回值 + `scheduler`调度器实现

```vue
  // 示例代码
  function setupRenderEffect(instance, vnode, container, anchor) {
    instance.update = effect(
      () => {
        if (!instance.isMounted) {
          // init
          const { proxy } = instance
          const subTree = (instance.subTree = instance.render.call(proxy))
          patch(null, subTree, container, instance, anchor)

          vnode.el = subTree.el

          instance.isMounted = true
        } else {
          console.log('exe')

          // 组件的更新逻辑是借助effect的返回值触发执行的
          // effect返回一个runner，当调用runner的时候，就可以再次执行传给effect的函数，当更新组件的时候调用runner，就能跳转到这里执行
          // console.log('update Component')

          // 更新组件的props,next是新的vnode，vnode是老的vnode
          const { next, vnode } = instance
          if (next) {
            next.el = vnode.el
            updateComponentPreRender(instance, next)
          }

          // 重新执行组件文件的render()方法
          const { proxy } = instance
          const subTree = instance.render.call(proxy)
          const preSubTree = instance.subTree
          // 更新组件实例身上的subTree -> 应该放当前的
          instance.subTree = subTree

          patch(preSubTree, subTree, container, instance, anchor)
        }
      },
      {
        scheduler: () => {
          console.log('exe scheduler')
          queueJobs(instance.update)
        },
      }
    )
  }

  // scheduler.ts
  const queue: any[] = []
  const activePreFlushCbs: any[] = []
  let isFlushPending = false

  // Vue3中，nextTick 是通过 Promise.then() 存入**微任务队列**，不再像 Vue2 一样进行降级处理
  export function nextTick(fn?) {
    return fn ? Promise.resolve().then(fn) : Promise.resolve()
  }

  function queueJobs() {
    // 更新任务加入队列
    if (!queue.includes(job)) {
      queue.push(job)
    }
  
    // 微任务队列中处理更新任务
    queueFlush()
  }

  function queueFlush() {
    if (isFlushPending) return
    isFlushPending = true
    nextTick(() => {
      isFlushPending = false
  
      let job
      while ((job = queue.shift())) {
        job && job()
      }
    })
  }
```
