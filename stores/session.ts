import { defineStore } from 'pinia'
import type { SessionData, Participant, Team, GameStatus, GameId } from '~/types'
import { generateSessionCode, generateId, TEAM_COLORS } from '~/types'
import { useStorage } from '~/composables/useStorage'

interface SessionState extends SessionData {
  isHost: boolean
  currentParticipantId: string | null
  isConnected: boolean
}

export const useSessionStore = defineStore('session', {
  state: (): SessionState => ({
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
  }),

  getters: {
    currentParticipant: (state): Participant | null => {
      if (!state.currentParticipantId) return null
      return state.participants.find(p => p.id === state.currentParticipantId) || null
    },

    currentTeam: (state): Team | null => {
      const participant = state.participants.find(p => p.id === state.currentParticipantId)
      if (!participant?.teamId) return null
      return state.teams.find(t => t.id === participant.teamId) || null
    },

    participantCount: (state): number => state.participants.length,

    connectedParticipants: (state): Participant[] => {
      return state.participants.filter(p => p.isConnected)
    },

    unassignedParticipants: (state): Participant[] => {
      return state.participants.filter(p => !p.teamId)
    },

    getTeamMembers: (state) => (teamId: string): Participant[] => {
      return state.participants.filter(p => p.teamId === teamId)
    },

    getGameStatus: (state) => (gameId: GameId): GameStatus => {
      return state.gamesState[gameId] || { status: 'not_started' }
    },

    hasActiveGame: (state): boolean => {
      return Object.values(state.gamesState).some(g => g.status === 'in_progress')
    },

    completedGames: (state): string[] => {
      return Object.entries(state.gamesState)
        .filter(([_, status]) => status.status === 'completed')
        .map(([id]) => id)
    }
  },

  actions: {
    createSession(name: string = '') {
      const storage = useStorage()
      const code = generateSessionCode()
      const now = new Date().toISOString()
      
      this.code = code
      this.name = name || `Session ${code}`
      this.createdAt = now
      this.lastAccessedAt = now
      this.participants = []
      this.teams = []
      this.gamesState = {}
      this.isHost = true
      this.currentParticipantId = null
      this.isConnected = true

      storage.saveSession({
        code: this.code,
        name: this.name,
        createdAt: this.createdAt,
        lastAccessedAt: this.lastAccessedAt,
        participants: this.participants,
        teams: this.teams,
        gamesState: this.gamesState
      })

      return code
    },

    loadSession(code: string, asHost: boolean = false) {
      const storage = useStorage()
      const session = storage.getSession(code)
      
      if (!session) return false

      this.code = session.code
      this.name = session.name
      this.createdAt = session.createdAt
      this.lastAccessedAt = new Date().toISOString()
      this.participants = session.participants
      this.teams = session.teams
      this.gamesState = session.gamesState
      this.isHost = asHost
      this.isConnected = true

      storage.updateSession(code, { lastAccessedAt: this.lastAccessedAt })

      return true
    },

    addParticipant(name: string): Participant {
      const participant: Participant = {
        id: generateId(),
        name,
        joinedAt: new Date().toISOString(),
        teamId: null,
        isTeamDevice: false,
        isConnected: true
      }
      
      this.participants.push(participant)
      this.saveToStorage()
      
      return participant
    },

    removeParticipant(participantId: string) {
      this.participants = this.participants.filter(p => p.id !== participantId)
      this.teams.forEach(team => {
        team.memberIds = team.memberIds.filter(id => id !== participantId)
      })
      this.saveToStorage()
    },

    updateParticipant(participantId: string, updates: Partial<Participant>) {
      const index = this.participants.findIndex(p => p.id === participantId)
      if (index !== -1) {
        this.participants[index] = { ...this.participants[index], ...updates }
        this.saveToStorage()
      }
    },

    setParticipantConnected(participantId: string, connected: boolean) {
      this.updateParticipant(participantId, { isConnected: connected })
    },

    createTeam(name: string): Team {
      const usedColors = this.teams.map(t => t.color)
      const availableColor = TEAM_COLORS.find(c => !usedColors.includes(c)) || TEAM_COLORS[0]
      
      const team: Team = {
        id: generateId(),
        name,
        memberIds: [],
        color: availableColor
      }
      
      this.teams.push(team)
      this.saveToStorage()
      
      return team
    },

    assignToTeam(participantId: string, teamId: string) {
      this.teams.forEach(team => {
        team.memberIds = team.memberIds.filter(id => id !== participantId)
      })
      
      const team = this.teams.find(t => t.id === teamId)
      if (team) {
        team.memberIds.push(participantId)
      }
      
      const participant = this.participants.find(p => p.id === participantId)
      if (participant) {
        participant.teamId = teamId
      }
      
      this.saveToStorage()
    },

    setTeamDevice(participantId: string) {
      const participant = this.participants.find(p => p.id === participantId)
      if (!participant?.teamId) return
      
      this.participants
        .filter(p => p.teamId === participant.teamId)
        .forEach(p => {
          p.isTeamDevice = p.id === participantId
        })
      
      this.saveToStorage()
    },

    randomizeTeams(teamCount: number = 2, teamSize: number = 3) {
      this.teams = []
      
      for (let i = 0; i < teamCount; i++) {
        this.createTeam(`Team ${String.fromCharCode(65 + i)}`)
      }
      
      const shuffled = [...this.participants].sort(() => Math.random() - 0.5)
      
      shuffled.forEach((participant, index) => {
        const teamIndex = index % teamCount
        this.assignToTeam(participant.id, this.teams[teamIndex].id)
      })
      
      this.teams.forEach(team => {
        if (team.memberIds.length > 0) {
          this.setTeamDevice(team.memberIds[0])
        }
      })
    },

    updateGameStatus(gameId: GameId, status: GameStatus['status']) {
      const now = new Date().toISOString()
      if (!this.gamesState[gameId]) {
        this.gamesState[gameId] = { status }
      }
      
      this.gamesState[gameId].status = status
      
      if (status === 'in_progress' && !this.gamesState[gameId].startedAt) {
        this.gamesState[gameId].startedAt = now
      }
      if (status === 'completed') {
        this.gamesState[gameId].completedAt = now
      }
      
      this.saveToStorage()
    },

    saveToStorage() {
      const storage = useStorage()
      storage.saveSession({
        code: this.code,
        name: this.name,
        createdAt: this.createdAt,
        lastAccessedAt: new Date().toISOString(),
        participants: this.participants,
        teams: this.teams,
        gamesState: this.gamesState
      })
    },

    reset() {
      this.code = ''
      this.name = ''
      this.createdAt = ''
      this.lastAccessedAt = ''
      this.participants = []
      this.teams = []
      this.gamesState = {}
      this.isHost = false
      this.currentParticipantId = null
      this.isConnected = false
    }
  }
})

