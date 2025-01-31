# mini-vue
## monorepo处理各模块
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


## runtime-core创建流程
![runtime-core流程图](https://github.com/user-attachments/assets/7528364a-1fca-4583-a844-654b8c6b351f)

## runtime-core更新流程
![whiteboard_exported_image (1)](https://github.com/user-attachments/assets/6998a496-74da-41d8-8e92-0081a5390816)
