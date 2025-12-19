import { defineStore } from 'pinia'
import { useLocalStorage, watchDebounced } from '@vueuse/core'
import type { SessionData, Participant, Team, GameStatus, GameId } from '~/types'
import { generateSessionCode, generateId, TEAM_COLORS } from '~/types'

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

export const useSessionStore = defineStore('session', () => {
  const stored = useLocalStorage<SessionData | null>(STORAGE_KEY, null, {
    deep: true,
    listenToStorageChanges: true
  })
  
  const state = reactive<SessionState>({
    code: stored.value?.code ?? '',
    name: stored.value?.name ?? '',
    createdAt: stored.value?.createdAt ?? '',
    lastAccessedAt: stored.value?.lastAccessedAt ?? '',
    participants: stored.value?.participants ?? [],
    teams: stored.value?.teams ?? [],
    gamesState: stored.value?.gamesState ?? {},
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
      if (newState.code) {
        stored.value = {
          code: newState.code,
          name: newState.name,
          createdAt: newState.createdAt,
          lastAccessedAt: new Date().toISOString(),
          participants: newState.participants,
          teams: newState.teams,
          gamesState: newState.gamesState
        }
      }
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
    if (stored.value) {
      state.code = stored.value.code
      state.name = stored.value.name
      state.createdAt = stored.value.createdAt
      state.lastAccessedAt = stored.value.lastAccessedAt
      state.participants = [...stored.value.participants]
      state.teams = [...stored.value.teams]
      state.gamesState = { ...stored.value.gamesState }
      return true
    }
    return false
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
    if (stored.value?.code === code) {
      hydrateFromStorage()
      state.isHost = asHost
      state.isConnected = true
      state.lastAccessedAt = new Date().toISOString()
      return true
    }
    return false
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
      assignToTeam(participant.id, state.teams[teamIndex].id)
    })
    
    state.teams.forEach(team => {
      if (team.memberIds.length > 0) {
        setTeamDevice(team.memberIds[0])
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
