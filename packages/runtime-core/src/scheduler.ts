const queue: any[] = []
const activePreFlushCbs: any[] = []
let isFlushPending = false

export function nextTick(fn?) {
  return fn ? Promise.resolve().then(fn) : Promise.resolve()
}

// 添加watchEffect的回调
export function queuePreFlushCb(cb) {
  activePreFlushCbs.push(cb)
  // 添加完watchEffect的回调之后，一定得去触发queueFlush，最终才会执行 flushPreFlushCbs()
  queueFlush()
}

export function queueJobs(job) {
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

    // 在真正执行渲染之前，先执行watchEffect内的内容
    flushPreFlushCbs()

    let job
    while ((job = queue.shift())) {
      job && job()
    }
  })
}

function flushPreFlushCbs() {
  for (let i = 0; i < activePreFlushCbs.length; i++) {
    activePreFlushCbs[i]()
  }
}
