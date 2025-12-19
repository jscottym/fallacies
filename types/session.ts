export interface Participant {
  id: string
  name: string
  joinedAt: string
  teamId: string | null
  isTeamDevice: boolean
  isConnected: boolean
}

export interface Team {
  id: string
  name: string
  memberIds: string[]
  color: string
}

export interface GameStatus {
  status: 'not_started' | 'in_progress' | 'completed'
  startedAt?: string
  completedAt?: string
}

export interface SessionData {
  code: string
  name: string
  createdAt: string
  lastAccessedAt: string
  participants: Participant[]
  teams: Team[]
  gamesState: Record<string, GameStatus>
}

export interface SessionState extends SessionData {
  isHost: boolean
  currentParticipantId: string | null
}

export const TEAM_COLORS = [
  '#ef4444', // red
  '#3b82f6', // blue
  '#22c55e', // green
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ec4899', // pink
] as const

export function generateSessionCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 3; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15)
}

