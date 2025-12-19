import type { Peer } from 'crossws'

interface SessionPeers {
  [sessionCode: string]: Set<Peer>
}

const sessions: SessionPeers = {}

export default defineWebSocketHandler({
  open(peer) {
    const url = new URL(peer.request?.url || '', 'http://localhost')
    const sessionCode = url.searchParams.get('session')
    
    if (sessionCode) {
      if (!sessions[sessionCode]) {
        sessions[sessionCode] = new Set()
      }
      sessions[sessionCode].add(peer)
      peer.ctx = { sessionCode }
      console.log(`Peer joined session ${sessionCode}`)
    }
  },

  message(peer, message) {
    try {
      const data = JSON.parse(message.text())
      const sessionCode = data.sessionCode || peer.ctx?.sessionCode
      
      if (!sessionCode) return
      
      if (data.type === 'ping') {
        peer.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }))
        return
      }
      
      const sessionPeers = sessions[sessionCode]
      if (sessionPeers) {
        const messageStr = JSON.stringify({
          ...data,
          timestamp: new Date().toISOString()
        })
        
        sessionPeers.forEach((p) => {
          if (p !== peer) {
            p.send(messageStr)
          }
        })
      }
    } catch (e) {
      console.error('WebSocket message error:', e)
    }
  },

  close(peer) {
    const sessionCode = peer.ctx?.sessionCode
    if (sessionCode && sessions[sessionCode]) {
      sessions[sessionCode].delete(peer)
      if (sessions[sessionCode].size === 0) {
        delete sessions[sessionCode]
      }
      console.log(`Peer left session ${sessionCode}`)
    }
  },

  error(peer, error) {
    console.error('WebSocket error:', error)
  }
})

