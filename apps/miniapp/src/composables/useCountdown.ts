import { ref, onUnmounted } from 'vue'

export function useCountdown(seconds = 60) {
  const count = ref(0)
  const counting = ref(false)
  let timer: ReturnType<typeof setInterval> | null = null

  const start = (): void => {
    if (counting.value) return
    count.value = seconds
    counting.value = true
    timer = setInterval(() => {
      count.value -= 1
      if (count.value <= 0) {
        stop()
      }
    }, 1000)
  }

  const stop = (): void => {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
    counting.value = false
    count.value = 0
  }

  onUnmounted(stop)

  return {
    count,
    counting,
    start,
    stop,
  }
}
