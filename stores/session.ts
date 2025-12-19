import { reactive, computed, toRefs } from 'vue'
import { defineStore } from 'pinia'
import { useLocalStorage, watchDebounced } from '@vueuse/core'
import type { SessionData, Participant, Team, GameStatus, GameId } from '~/types'
import { generateSessionCode, generateId, TEAM_COLORS } from '~/types'
import { useStorage } from '~/composables/useStorage'

interface SessionState {
  code: string
  name: string
  createdAt: string
  lastAccessedAt: string
  participants: Participant[]
  teams: Team[]
  gamesState: Record<string, GameStatus>
  isHost: boolean
  currentParticipantId: string | null
  isConnected: boolean
}

const STORAGE_KEY = 'fallacies:current-session'

function coerceParticipants(value: unknown): Participant[] {
  return Array.isArray(value) ? (value as Participant[]) : []
}

function coerceTeams(value: unknown): Team[] {
  return Array.isArray(value) ? (value as Team[]) : []
}

function coerceGamesState(value: unknown): Record<string, GameStatus> {
  return value && typeof value === 'object'
    ? (value as Record<string, GameStatus>)
    : {}
}

function normalizeStoredSession(raw: unknown): SessionData | null {
  if (!raw || typeof raw !== 'object') return null
  const value = raw as Partial<SessionData> & Record<string, unknown>

  if (typeof value.code !== 'string') return null

  return {
    code: value.code,
    name: typeof value.name === 'string' ? value.name : '',
    createdAt: typeof value.createdAt === 'string' ? value.createdAt : '',
    lastAccessedAt: typeof value.lastAccessedAt === 'string' ? value.lastAccessedAt : '',
    participants: coerceParticipants((value as Record<string, unknown>).participants),
    teams: coerceTeams((value as Record<string, unknown>).teams),
    gamesState: coerceGamesState((value as Record<string, unknown>).gamesState)
  }
}

export const useSessionStore = defineStore('session', () => {
  const stored = useLocalStorage<SessionData | null>(STORAGE_KEY, null, {
    deep: true,
    listenToStorageChanges: true
  })
  const storage = useStorage()

  const initialStored = normalizeStoredSession(stored.value)
  
  const state = reactive<SessionState>({
    code: initialStored?.code ?? '',
    name: initialStored?.name ?? '',
    createdAt: initialStored?.createdAt ?? '',
    lastAccessedAt: initialStored?.lastAccessedAt ?? '',
    participants: initialStored?.participants ?? [],
    teams: initialStored?.teams ?? [],
    gamesState: initialStored?.gamesState ?? {},
    isHost: false,
    currentParticipantId: null,
    isConnected: false
  })

  watchDebounced(
    () => ({
      code: state.code,
      name: state.name,
      createdAt: state.createdAt,
      lastAccessedAt: state.lastAccessedAt,
      participants: [...state.participants],
      teams: [...state.teams],
      gamesState: { ...state.gamesState }
    }),
    (newState) => {
      if (!newState.code) return

      const snapshot: SessionData = {
        code: newState.code,
        name: newState.name,
        createdAt: newState.createdAt || new Date().toISOString(),
        lastAccessedAt: new Date().toISOString(),
        participants: newState.participants,
        teams: newState.teams,
        gamesState: newState.gamesState
      }

      stored.value = snapshot
      storage.saveSession(snapshot)
    },
    { debounce: 100, deep: true }
  )

  const currentParticipant = computed((): Participant | null => {
    if (!state.currentParticipantId) return null
    return state.participants.find(p => p.id === state.currentParticipantId) || null
  })

  const currentTeam = computed((): Team | null => {
    const participant = state.participants.find(p => p.id === state.currentParticipantId)
    if (!participant?.teamId) return null
    return state.teams.find(t => t.id === participant.teamId) || null
  })

  const participantCount = computed(() => state.participants.length)

  const connectedParticipants = computed(() => state.participants.filter(p => p.isConnected))

  const unassignedParticipants = computed(() => state.participants.filter(p => !p.teamId))

  function getTeamMembers(teamId: string): Participant[] {
    return state.participants.filter(p => p.teamId === teamId)
  }

  function getGameStatus(gameId: GameId): GameStatus {
    return state.gamesState[gameId] || { status: 'not_started' }
  }

  const hasActiveGame = computed(() => Object.values(state.gamesState).some(g => g.status === 'in_progress'))

  const completedGames = computed(() => 
    Object.entries(state.gamesState)
      .filter(([_, status]) => status.status === 'completed')
      .map(([id]) => id)
  )

  function hydrateFromStorage(): boolean {
    const normalized = normalizeStoredSession(stored.value)
    if (!normalized) return false

    state.code = normalized.code
    state.name = normalized.name
    state.createdAt = normalized.createdAt
    state.lastAccessedAt = normalized.lastAccessedAt
    state.participants = [...normalized.participants]
    state.teams = [...normalized.teams]
    state.gamesState = { ...normalized.gamesState }

    return true
  }

  function createSession(name: string = ''): string {
    const code = generateSessionCode()
    const now = new Date().toISOString()
    
    state.code = code
    state.name = name || `Session ${code}`
    state.createdAt = now
    state.lastAccessedAt = now
    state.participants = []
    state.teams = []
    state.gamesState = {}
    state.isHost = true
    state.currentParticipantId = null
    state.isConnected = true

    return code
  }

  function loadSession(code: string, asHost: boolean = false): boolean {
    const fromStorage = storage.getSession(code)
    const fallback = normalizeStoredSession(stored.value)
    const session = fromStorage || (fallback && fallback.code === code ? fallback : null)

    if (!session || session.code !== code) {
      return false
    }

    state.code = session.code
    state.name = session.name
    state.createdAt = session.createdAt
    state.lastAccessedAt = new Date().toISOString()
    state.participants = [...session.participants]
    state.teams = [...session.teams]
    state.gamesState = { ...session.gamesState }
    state.isHost = asHost
    state.isConnected = true

    const snapshot: SessionData = {
      code: state.code,
      name: state.name,
      createdAt: state.createdAt,
      lastAccessedAt: state.lastAccessedAt,
      participants: state.participants,
      teams: state.teams,
      gamesState: state.gamesState
    }

    stored.value = snapshot
    storage.saveSession(snapshot)

    return true
  }

  function addParticipant(name: string): Participant {
    const participant: Participant = {
      id: generateId(),
      name,
      joinedAt: new Date().toISOString(),
      teamId: null,
      isTeamDevice: false,
      isConnected: true
    }
    
    state.participants = [...state.participants, participant]
    
    return participant
  }

  function removeParticipant(participantId: string) {
    state.participants = state.participants.filter(p => p.id !== participantId)
    state.teams = state.teams.map(team => ({
      ...team,
      memberIds: team.memberIds.filter(id => id !== participantId)
    }))
  }

  function updateParticipant(participantId: string, updates: Partial<Participant>) {
    state.participants = state.participants.map(p => 
      p.id === participantId ? { ...p, ...updates } : p
    )
  }

  function setParticipantConnected(participantId: string, connected: boolean) {
    updateParticipant(participantId, { isConnected: connected })
  }

  function createTeam(name: string): Team {
    const usedColors = state.teams.map(t => t.color)
    const availableColor = TEAM_COLORS.find(c => !usedColors.includes(c)) || TEAM_COLORS[0]
    
    const team: Team = {
      id: generateId(),
      name,
      memberIds: [],
      color: availableColor
    }
    
    state.teams = [...state.teams, team]
    
    return team
  }

  function assignToTeam(participantId: string, teamId: string) {
    state.teams = state.teams.map(team => ({
      ...team,
      memberIds: team.id === teamId 
        ? [...team.memberIds.filter(id => id !== participantId), participantId]
        : team.memberIds.filter(id => id !== participantId)
    }))
    
    state.participants = state.participants.map(p =>
      p.id === participantId ? { ...p, teamId } : p
    )
  }

  function setTeamDevice(participantId: string) {
    const participant = state.participants.find(p => p.id === participantId)
    if (!participant?.teamId) return
    
    state.participants = state.participants.map(p => ({
      ...p,
      isTeamDevice: p.teamId === participant.teamId ? p.id === participantId : p.isTeamDevice
    }))
  }

  function randomizeTeams(teamCount: number = 2, teamSize: number = 3) {
    state.teams = []
    
    for (let i = 0; i < teamCount; i++) {
      createTeam(`Team ${String.fromCharCode(65 + i)}`)
    }
    
    const shuffled = [...state.participants].sort(() => Math.random() - 0.5)
    
    shuffled.forEach((participant, index) => {
      const teamIndex = index % teamCount
      const team = state.teams[teamIndex]
      if (team) {
        assignToTeam(participant.id, team.id)
      }
    })
    
    state.teams.forEach(team => {
      const firstMemberId = team.memberIds[0]
      if (firstMemberId) {
        setTeamDevice(firstMemberId)
      }
    })
  }

  function updateGameStatus(gameId: GameId, status: GameStatus['status']) {
    const now = new Date().toISOString()
    const existing = state.gamesState[gameId] || { status: 'not_started' }
    
    state.gamesState = {
      ...state.gamesState,
      [gameId]: {
        ...existing,
        status,
        startedAt: status === 'in_progress' && !existing.startedAt ? now : existing.startedAt,
        completedAt: status === 'completed' ? now : existing.completedAt
      }
    }
  }

  function reset() {
    state.code = ''
    state.name = ''
    state.createdAt = ''
    state.lastAccessedAt = ''
    state.participants = []
    state.teams = []
    state.gamesState = {}
    state.isHost = false
    state.currentParticipantId = null
    state.isConnected = false
    stored.value = null
  }

  return {
    ...toRefs(state),
    currentParticipant,
    currentTeam,
    participantCount,
    connectedParticipants,
    unassignedParticipants,
    hasActiveGame,
    completedGames,
    getTeamMembers,
    getGameStatus,
    createSession,
    loadSession,
    hydrateFromStorage,
    addParticipant,
    removeParticipant,
    updateParticipant,
    setParticipantConnected,
    createTeam,
    assignToTeam,
    setTeamDevice,
    randomizeTeams,
    updateGameStatus,
    reset
  }
})
