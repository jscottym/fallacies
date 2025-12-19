import type { GameId, GameState, SessionData } from '~/types'

const STORAGE_PREFIX = 'fallacies'
const CURRENT_SESSION_KEY = 'fallacies:current-session'

function deepMerge<T extends Record<string, unknown>>(target: T, source: Partial<T>): T {
  const result = { ...target }
  for (const key in source) {
    if (source[key] !== undefined) {
      if (
        typeof source[key] === 'object' &&
        source[key] !== null &&
        !Array.isArray(source[key]) &&
        typeof result[key] === 'object' &&
        result[key] !== null &&
        !Array.isArray(result[key])
      ) {
        result[key] = deepMerge(
          result[key] as Record<string, unknown>,
          source[key] as Record<string, unknown>
        ) as T[Extract<keyof T, string>]
      } else {
        result[key] = source[key] as T[Extract<keyof T, string>]
      }
    }
  }
  return result
}

export function useStorage() {
  function getSessionKey(code: string): string {
    return `${STORAGE_PREFIX}:session:${code}`
  }

  function getGameKey(sessionCode: string, gameId: GameId): string {
    return `${STORAGE_PREFIX}:session:${sessionCode}:game:${gameId}`
  }

  function getAllSessionCodes(): string[] {
    if (typeof window === 'undefined') return []
    const codes: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(`${STORAGE_PREFIX}:session:`) && !key.includes(':game:')) {
        const code = key.replace(`${STORAGE_PREFIX}:session:`, '')
        codes.push(code)
      }
    }
    return codes
  }

  function getSession(code: string): SessionData | null {
    if (typeof window === 'undefined') return null
    const key = getSessionKey(code)
    const data = localStorage.getItem(key)
    return data ? JSON.parse(data) : null
  }

  function getCurrentSession(): SessionData | null {
    if (typeof window === 'undefined') return null
    const data = localStorage.getItem(CURRENT_SESSION_KEY)
    return data ? JSON.parse(data) : null
  }

  function saveSession(session: SessionData): void {
    if (typeof window === 'undefined') return
    const key = getSessionKey(session.code)
    session.lastAccessedAt = new Date().toISOString()
    localStorage.setItem(key, JSON.stringify(session))
  }

  function updateSession(code: string, updates: Partial<SessionData>): SessionData | null {
    const existing = getSession(code)
    if (!existing) return null
    const merged = deepMerge(existing, updates)
    saveSession(merged)
    return merged
  }

  function deleteSession(code: string): void {
    if (typeof window === 'undefined') return
    const sessionKey = getSessionKey(code)
    localStorage.removeItem(sessionKey)
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i)
      if (key?.startsWith(`${STORAGE_PREFIX}:session:${code}:game:`)) {
        localStorage.removeItem(key)
      }
    }
  }

  function getGameState<T extends GameState>(sessionCode: string, gameId: GameId): T | null {
    if (typeof window === 'undefined') return null
    const key = getGameKey(sessionCode, gameId)
    const data = localStorage.getItem(key)
    return data ? JSON.parse(data) : null
  }

  function saveGameState<T extends GameState>(state: T): void {
    if (typeof window === 'undefined') return
    const key = getGameKey(state.sessionCode, state.gameId)
    state.lastUpdatedAt = new Date().toISOString()
    localStorage.setItem(key, JSON.stringify(state))
  }

  function updateGameState<T extends GameState>(
    sessionCode: string,
    gameId: GameId,
    updates: Partial<T>
  ): T | null {
    const existing = getGameState<T>(sessionCode, gameId)
    if (!existing) return null
    const merged = deepMerge(existing as Record<string, unknown>, updates as Record<string, unknown>) as T
    saveGameState(merged)
    return merged
  }

  function getRecentSessions(limit = 5): SessionData[] {
    if (typeof window === 'undefined') return []
    
    const sessions: SessionData[] = []
    
    const currentSession = getCurrentSession()
    if (currentSession) {
      sessions.push(currentSession)
    }
    
    const codes = getAllSessionCodes()
    for (const code of codes) {
      if (!sessions.find(s => s.code === code)) {
        const session = getSession(code)
        if (session) {
          sessions.push(session)
        }
      }
    }
    
    return sessions
      .sort((a, b) => new Date(b.lastAccessedAt).getTime() - new Date(a.lastAccessedAt).getTime())
      .slice(0, limit)
  }

  return {
    getSession,
    getCurrentSession,
    saveSession,
    updateSession,
    deleteSession,
    getGameState,
    saveGameState,
    updateGameState,
    getAllSessionCodes,
    getRecentSessions
  }
}
