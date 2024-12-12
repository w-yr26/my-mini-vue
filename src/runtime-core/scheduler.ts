const queue: any[] = []
let isFlushPending = false

export function nextTick(fn) {
  return fn ? Promise.resolve().then(fn) : Promise.resolve()
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
    let job
    while ((job = queue.shift())) {
      job && job()
    }
  })
}
