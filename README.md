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

![whiteboard_exported_image (1)](https://github.com/user-attachments/assets/6998a496-74da-41d8-8e92-0081a5390816)

### diff算法
两侧对比(先左侧再右侧)，得到中间乱序部分
1. 左侧对比：
  根据`type`和`key`判断当前newVNode和oldVNode是否相同，是就指针往后走；反之指针跳转至右侧
2. 右侧对比：
  根据`type`和`key`判断当前newVNode和oldVNode是否相同，是就指针往前走；反之进入中间乱序比较
3. 中间比较(暂定旧的中间乱序部分是`oldChildren`，新的中间乱序部分是`newChildren`)
  遍历`newChildren`，维护一张`keyToNewIndexMap`映射表，根据`key`快速查找`VNode`在`newChildren`中的位置
  遍历`oldChildren`，如果在`keyToNewIndexMap`查找得到，说明是新旧都存在，先递归调用patch()更新内容(后续需要移动位置)；如果查找不到，说明需要**删除**
  创建`newIndexToOldIndexMap`(一个数组，长度为乱序部分的长度，初始值为-1)用于记录乱序部分新的`VNode`在旧的中的下标索引，执行最长递增子序列算法，求出`increaingIndexSequence`变化前后相对位置不变的部分
  从后往前遍历新的中间乱序部分，如果当前`increaingIndexSequence`有值且不为-1，说明变化前后是稳定的部分，不处理；如果不在`increaingIndexSequence`内，则进行**移动**；如果`increaingIndexSequence`有值但是等于-1，说明是新的才存在，需要**新增**

  ### key值的作用：
  在mini-vue的实现中，我们根据type和key判断是否属于同一元素，是否可以不要key只要type？

  结合到具体的开发场景中，一般我们不会去修改元素的标签类型，而是修改内容，所以我们假设新旧vnodes的标签类型都是一致的

  假设新旧分别为

  旧：A、B

  新：B、A

  如果没有key，左侧对比过程中，由于标签类型一致，就会认为是同一元素，那么进入patch后，A→B，B→A，但是你会发现它们就是位置不一样而已，完全没必要两个都执行替换(如果是右侧对比，道理一致)

  另外，在**中间乱序对比**的过程中，我们需要使用key建立映射表用于快速查找元素，如果没有key就会进行二次循环，提高了时间复杂度