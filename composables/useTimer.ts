import { computed, onUnmounted, ref } from 'vue'

export function useTimer(initialSeconds: number = 0) {
  const remaining = ref(initialSeconds)
  const total = ref(initialSeconds)
  const isActive = ref(false)
  let intervalId: ReturnType<typeof setInterval> | null = null

  const progress = computed(() => {
    if (total.value === 0) return 0
    return ((total.value - remaining.value) / total.value) * 100
  })

  const formattedTime = computed(() => {
    const mins = Math.floor(remaining.value / 60)
    const secs = remaining.value % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  })

  const status = computed(() => {
    if (remaining.value <= 0) return 'expired'
    if (remaining.value <= 10) return 'critical'
    if (remaining.value <= 30) return 'warning'
    return 'normal'
  })

  function start(seconds?: number) {
    if (seconds !== undefined) {
      remaining.value = seconds
      total.value = seconds
    }
    if (intervalId) clearInterval(intervalId)
    isActive.value = true
    intervalId = setInterval(() => {
      if (remaining.value > 0) {
        remaining.value--
      } else {
        stop()
      }
    }, 1000)
  }

  function stop() {
    isActive.value = false
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }
  }

  function pause() {
    isActive.value = false
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }
  }

  function resume() {
    if (!isActive.value && remaining.value > 0) {
      start()
    }
  }

  function reset(seconds?: number) {
    stop()
    remaining.value = seconds ?? total.value
  }

  function extend(seconds: number) {
    remaining.value += seconds
    total.value += seconds
  }

  onUnmounted(() => {
    if (intervalId) clearInterval(intervalId)
  })

  return {
    remaining,
    total,
    isActive,
    progress,
    formattedTime,
    status,
    start,
    stop,
    pause,
    resume,
    reset,
    extend
  }
}

