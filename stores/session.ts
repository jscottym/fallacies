import { defineStore } from 'pinia'
import { useLocalStorage } from '@vueuse/core'
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

export const useSessionStore = defineStore('session', () => {
  const stored = useLocalStorage<SessionData | null>('fallacies:current-session', null)
  
  const state = reactive<SessionState>({
    code: '',
    name: '',
    createdAt: '',
    lastAccessedAt: '',
    participants: [],
    teams: [],
    gamesState: {},
    isHost: false,
    currentParticipantId: null,
    isConnected: false
  })

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

  function syncToStorage() {
    stored.value = {
      code: state.code,
      name: state.name,
      createdAt: state.createdAt,
      lastAccessedAt: new Date().toISOString(),
      participants: state.participants,
      teams: state.teams,
      gamesState: state.gamesState
    }
  }

  function loadFromStorage(): boolean {
    if (stored.value) {
      Object.assign(state, {
        ...stored.value,
        isHost: false,
        currentParticipantId: null,
        isConnected: false
      })
      return true
    }
    return false
  }

  function createSession(name: string = ''): string {
    const code = generateSessionCode()
    const now = new Date().toISOString()
    
    Object.assign(state, {
      code,
      name: name || `Session ${code}`,
      createdAt: now,
      lastAccessedAt: now,
      participants: [],
      teams: [],
      gamesState: {},
      isHost: true,
      currentParticipantId: null,
      isConnected: true
    })

    syncToStorage()
    return code
  }

  function loadSession(code: string, asHost: boolean = false): boolean {
    const allSessions = useLocalStorage<Record<string, SessionData>>('fallacies:sessions', {})
    const session = allSessions.value[code] || stored.value
    
    if (!session || session.code !== code) {
      if (stored.value?.code === code) {
        Object.assign(state, {
          ...stored.value,
          lastAccessedAt: new Date().toISOString(),
          isHost: asHost,
          isConnected: true
        })
        syncToStorage()
        return true
      }
      return false
    }

    Object.assign(state, {
      ...session,
      lastAccessedAt: new Date().toISOString(),
      isHost: asHost,
      isConnected: true
    })

    syncToStorage()
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
    
    state.participants.push(participant)
    syncToStorage()
    
    return participant
  }

  function removeParticipant(participantId: string) {
    state.participants = state.participants.filter(p => p.id !== participantId)
    state.teams.forEach(team => {
      team.memberIds = team.memberIds.filter(id => id !== participantId)
    })
    syncToStorage()
  }

  function updateParticipant(participantId: string, updates: Partial<Participant>) {
    const index = state.participants.findIndex(p => p.id === participantId)
    if (index !== -1) {
      state.participants[index] = { ...state.participants[index], ...updates }
      syncToStorage()
    }
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
    
    state.teams.push(team)
    syncToStorage()
    
    return team
  }

  function assignToTeam(participantId: string, teamId: string) {
    state.teams.forEach(team => {
      team.memberIds = team.memberIds.filter(id => id !== participantId)
    })
    
    const team = state.teams.find(t => t.id === teamId)
    if (team) {
      team.memberIds.push(participantId)
    }
    
    const participant = state.participants.find(p => p.id === participantId)
    if (participant) {
      participant.teamId = teamId
    }
    
    syncToStorage()
  }

  function setTeamDevice(participantId: string) {
    const participant = state.participants.find(p => p.id === participantId)
    if (!participant?.teamId) return
    
    state.participants
      .filter(p => p.teamId === participant.teamId)
      .forEach(p => {
        p.isTeamDevice = p.id === participantId
      })
    
    syncToStorage()
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
    if (!state.gamesState[gameId]) {
      state.gamesState[gameId] = { status }
    }
    
    state.gamesState[gameId].status = status
    
    if (status === 'in_progress' && !state.gamesState[gameId].startedAt) {
      state.gamesState[gameId].startedAt = now
    }
    if (status === 'completed') {
      state.gamesState[gameId].completedAt = now
    }
    
    syncToStorage()
  }

  function reset() {
    Object.assign(state, {
      code: '',
      name: '',
      createdAt: '',
      lastAccessedAt: '',
      participants: [],
      teams: [],
      gamesState: {},
      isHost: false,
      currentParticipantId: null,
      isConnected: false
    })
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
    loadFromStorage,
    addParticipant,
    removeParticipant,
    updateParticipant,
    setParticipantConnected,
    createTeam,
    assignToTeam,
    setTeamDevice,
    randomizeTeams,
    updateGameStatus,
    syncToStorage,
    reset
  }
})
