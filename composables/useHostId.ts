import { ref } from 'vue'

const hostIdRef = ref<string | null>(null)

export function useHostId() {
  if (!hostIdRef.value) {
    hostIdRef.value = Math.random().toString(36).substring(2, 10)
  }
  return hostIdRef
}


