import { NodeTypes } from '../src/ast'
import { baseParse } from '../src/parse'
import { transform } from '../src/transform'
describe('transform', () => {
  test('simple interpolation', () => {
    const ast = baseParse('<div>hi,{{ message }}</div>')
    const plugin = (node) => {
      if (node.type === NodeTypes.TEXT) {
        node.content += ' mini-vue'
      }
    }
    // 插件体系
    transform(ast, {
      nodeTransforms: [plugin],
    })
    let nodeText = ast.children[0].children[0].content
    expect(nodeText).toBe('hi, mini-vue')
  })
})
