import { h } from "../../lib/mini-vue.es.js";

window.self = null;
export const App = {
  render() {
    window.self = this;
    // ui
    return h("div", {}, "hi " + this.count);
  },
  setup(props) {
    // 1. 通过setup拿到props(假设传下来的props是一个包含count属性的对象)
    console.log("props", props);
    // 2. props is shallowReadonly -> shallowReadonly
    props.count++;
    console.log("props", props);
    // 3. props内的值可以通过this访问
  },
};
