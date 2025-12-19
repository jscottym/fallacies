import { ref, onUnmounted } from 'vue'
import type { WSMessage, WSEventType } from '~/types'

type MessageHandler = (message: WSMessage) => void

export function useWebSocket() {
  const ws = ref<WebSocket | null>(null)
  const isConnected = ref(false)
  const sessionCode = ref('')
  const handlers = new Map<WSEventType, Set<MessageHandler>>()
  let reconnectTimeout: ReturnType<typeof setTimeout> | null = null
  let pingInterval: ReturnType<typeof setInterval> | null = null

  function connect(code: string) {
    if (ws.value?.readyState === WebSocket.OPEN) {
      return
    }

    sessionCode.value = code
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const url = `${protocol}//${window.location.host}/api/ws?session=${code}`
    
    ws.value = new WebSocket(url)

    ws.value.onopen = () => {
      isConnected.value = true
      startPing()
    }

    ws.value.onmessage = (event) => {
      try {
        const message: WSMessage = JSON.parse(event.data)
        const typeHandlers = handlers.get(message.type)
        if (typeHandlers) {
          typeHandlers.forEach(handler => handler(message))
        }
      } catch (e) {
        console.error('Failed to parse WebSocket message:', e)
      }
    }

    ws.value.onclose = () => {
      isConnected.value = false
      stopPing()
      scheduleReconnect()
    }

    ws.value.onerror = () => {
      isConnected.value = false
    }
  }

  function disconnect() {
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout)
      reconnectTimeout = null
    }
    stopPing()
    if (ws.value) {
      ws.value.close()
      ws.value = null
    }
    isConnected.value = false
  }

  function scheduleReconnect() {
    if (reconnectTimeout) return
    reconnectTimeout = setTimeout(() => {
      reconnectTimeout = null
      if (sessionCode.value) {
        connect(sessionCode.value)
      }
    }, 3000)
  }

  function startPing() {
    if (pingInterval) return
    pingInterval = setInterval(() => {
      send('ping', {})
    }, 30000)
  }

  function stopPing() {
    if (pingInterval) {
      clearInterval(pingInterval)
      pingInterval = null
    }
  }

  function send<T>(type: WSEventType, payload: T) {
    if (ws.value?.readyState === WebSocket.OPEN) {
      const message: WSMessage<T> = {
        type,
        sessionCode: sessionCode.value,
        payload,
        timestamp: new Date().toISOString()
      }
      ws.value.send(JSON.stringify(message))
    }
  }

  function on(type: WSEventType, handler: MessageHandler) {
    if (!handlers.has(type)) {
      handlers.set(type, new Set())
    }
    handlers.get(type)!.add(handler)
  }

  function off(type: WSEventType, handler: MessageHandler) {
    handlers.get(type)?.delete(handler)
  }

  onUnmounted(() => {
    disconnect()
  })

  return {
    isConnected,
    connect,
    disconnect,
    send,
    on,
    off
  }
}

