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
- computed

**runtime-core模块：**

- render -> path -> processFragment、processText、processComponent、processElement -> mountElement/patchElement
  
  - mountElement -> mountChildren、hostPatchProp、hostInsert
  - patchElement -> patchProps、patchChildren -> TextToText、TextToArray、ArrayToText、ArrayToArray(diff:左侧对比、右侧对比、中间乱序部分使用最长递增子序列求出稳定部分 -> 删除、移动、新增)

- processComponent -> mountComponent/updateComponent -> setupComponent(处理组件setup部分)、setupRenderEffect(处理组件render部分) -> 接收组件`render()`返回值递归调用patch() -> 组件不断“开箱”操作，最终回到processElement

- reactivity的effect将组件render()作为**依赖**进行收集并监听，实现响应式数据更新 -> 触发依赖更新 -> 触发视图更新

- 借助effect返回值以及Options调度器，将更新逻辑通过`Promise.then()`放置在异步更新队列中，实现`nextTick`

  > 注意：Vue2和Vue3`nextTick`实现的区别：在Vue2中会通过降级处理将更新操作放置在异步队列中；但Vue3中是直接使用Promise.then()。因为Vue3的响应式使用Proxy本身就存在一定的兼容性，可以支持Proxy也就意味着浏览器版本足够支持Promise.then()

- 父子组件之间的通信：props、emit
- 祖孙组件之间的通信：provide、inject(原型链)
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
