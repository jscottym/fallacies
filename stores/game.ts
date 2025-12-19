import { defineStore } from 'pinia'
import type { 
  GameId, 
  GameState, 
  TimerState,
  LogicTrapsState,
  WarmupState,
  ProsecutionState,
  AntidotesState,
  SteelmanState,
  CruxHuntState,
  ReflectionState,
  VoteRecord,
  ProsecutionRound
} from '~/types'
import { useStorage } from '~/composables/useStorage'

interface GameStoreState {
  currentGameId: GameId | null
  sessionCode: string
  phase: string
  step: number
  totalSteps: number
  hostContext: string
  timer: TimerState
  gameData: Record<string, unknown>
}

export const useGameStore = defineStore('game', {
  state: (): GameStoreState => ({
    currentGameId: null,
    sessionCode: '',
    phase: '',
    step: 0,
    totalSteps: 0,
    hostContext: '',
    timer: {
      active: false,
      remaining: 0,
      total: 0
    },
    gameData: {}
  }),

  getters: {
    isActive: (state): boolean => state.currentGameId !== null,
    
    progress: (state): number => {
      if (state.totalSteps === 0) return 0
      return (state.step / state.totalSteps) * 100
    },

    currentState: (state): GameState | null => {
      if (!state.currentGameId || !state.sessionCode) return null
      return {
        gameId: state.currentGameId,
        sessionCode: state.sessionCode,
        status: 'in_progress',
        currentPhase: state.phase,
        currentStep: state.step,
        totalSteps: state.totalSteps,
        hostContext: state.hostContext,
        startedAt: '',
        lastUpdatedAt: new Date().toISOString(),
        ...state.gameData
      } as GameState
    }
  },

  actions: {
    startGame(sessionCode: string, gameId: GameId, totalSteps: number) {
      this.currentGameId = gameId
      this.sessionCode = sessionCode
      this.phase = 'intro'
      this.step = 0
      this.totalSteps = totalSteps
      this.hostContext = ''
      this.gameData = this.getInitialGameData(gameId)
      this.saveState()
    },

    getInitialGameData(gameId: GameId): Record<string, unknown> {
      switch (gameId) {
        case 'logic-traps':
          return {
            currentFallacyIndex: 0,
            selectedParticipantId: null,
            discussedParticipants: []
          }
        case 'warmup':
          return {
            currentQuoteIndex: 0,
            votes: [],
            revealed: false
          }
        case 'prosecution':
          return {
            rounds: [],
            currentRoundIndex: 0,
            scores: {},
            availableTopicIds: []
          }
        case 'antidotes':
          return {
            currentAntidoteIndex: 0,
            selectedParticipantId: null,
            discussedParticipants: []
          }
        case 'steelman':
          return {
            rounds: [],
            currentRoundIndex: 0,
            scores: {}
          }
        case 'crux-hunt':
          return {
            pairs: [],
            currentPromptIndex: 0
          }
        case 'reflection':
          return {
            commitments: {},
            currentParticipantIndex: 0,
            participantOrder: []
          }
        default:
          return {}
      }
    },

    setPhase(phase: string) {
      this.phase = phase
      this.saveState()
    },

    nextStep() {
      if (this.step < this.totalSteps) {
        this.step++
        this.saveState()
      }
    },

    prevStep() {
      if (this.step > 0) {
        this.step--
        this.saveState()
      }
    },

    setStep(step: number) {
      this.step = Math.max(0, Math.min(step, this.totalSteps))
      this.saveState()
    },

    setHostContext(context: string) {
      this.hostContext = context
      this.saveState()
    },

    updateGameData(updates: Record<string, unknown>) {
      this.gameData = { ...this.gameData, ...updates }
      this.saveState()
    },

    setTimer(seconds: number) {
      this.timer = {
        active: true,
        remaining: seconds,
        total: seconds
      }
    },

    tickTimer() {
      if (this.timer.active && this.timer.remaining > 0) {
        this.timer.remaining--
      }
      if (this.timer.remaining <= 0) {
        this.timer.active = false
      }
    },

    stopTimer() {
      this.timer.active = false
    },

    addVote(vote: VoteRecord) {
      if (!this.gameData.votes) {
        this.gameData.votes = []
      }
      const votes = this.gameData.votes as VoteRecord[]
      const existingIndex = votes.findIndex(v => 
        v.participantId === vote.participantId || 
        (vote.teamId && v.teamId === vote.teamId)
      )
      if (existingIndex >= 0) {
        votes[existingIndex] = vote
      } else {
        votes.push(vote)
      }
      this.saveState()
    },

    initProsecutionRound(availableTopicIds: string[], teamIds: string[]) {
      const rounds = (this.gameData.rounds || []) as ProsecutionRound[]
      const newRound: ProsecutionRound = {
        roundNumber: rounds.length + 1,
        phase: 'topic_selection',
        topicSelections: {},
        arguments: {},
        reviews: [],
        currentReviewTargetIndex: 0
      }
      rounds.push(newRound)
      
      const scores = (this.gameData.scores || {}) as Record<string, number>
      teamIds.forEach(id => {
        if (scores[id] === undefined) scores[id] = 0
      })
      
      this.gameData = {
        ...this.gameData,
        rounds,
        currentRoundIndex: rounds.length - 1,
        scores,
        availableTopicIds
      }
      this.saveState()
    },

    selectTopic(teamId: string, topicId: string) {
      const rounds = this.gameData.rounds as ProsecutionRound[]
      const currentRound = rounds[this.gameData.currentRoundIndex as number]
      if (!currentRound) return false
      
      const alreadySelected = Object.values(currentRound.topicSelections)
        .some(s => s.topicId === topicId)
      if (alreadySelected) return false
      
      currentRound.topicSelections[teamId] = {
        topicId,
        selectedAt: new Date().toISOString()
      }
      this.saveState()
      return true
    },

    submitArgument(teamId: string, text: string, fallaciesUsed: string[]) {
      const rounds = this.gameData.rounds as ProsecutionRound[]
      const currentRound = rounds[this.gameData.currentRoundIndex as number]
      if (!currentRound) return
      
      currentRound.arguments[teamId] = {
        text,
        fallaciesUsed,
        submittedAt: new Date().toISOString()
      }
      this.saveState()
    },

    submitReview(reviewingTeamId: string, targetTeamId: string, identifiedFallacies: string[]) {
      const rounds = this.gameData.rounds as ProsecutionRound[]
      const currentRound = rounds[this.gameData.currentRoundIndex as number]
      if (!currentRound) return
      
      const existingIndex = currentRound.reviews.findIndex(
        r => r.reviewingTeamId === reviewingTeamId && r.targetTeamId === targetTeamId
      )
      
      const review = {
        reviewingTeamId,
        targetTeamId,
        identifiedFallacies,
        submittedAt: new Date().toISOString()
      }
      
      if (existingIndex >= 0) {
        currentRound.reviews[existingIndex] = review
      } else {
        currentRound.reviews.push(review)
      }
      this.saveState()
    },

    loadState(sessionCode: string, gameId: GameId): boolean {
      const storage = useStorage()
      const state = storage.getGameState(sessionCode, gameId)
      if (!state) return false
      
      this.currentGameId = gameId
      this.sessionCode = sessionCode
      this.phase = state.currentPhase
      this.step = state.currentStep
      this.totalSteps = state.totalSteps
      this.hostContext = state.hostContext
      
      const { gameId: _, sessionCode: __, status, currentPhase, currentStep, totalSteps, hostContext, startedAt, lastUpdatedAt, ...rest } = state
      this.gameData = rest
      
      return true
    },

    saveState() {
      if (!this.currentGameId || !this.sessionCode) return
      
      const storage = useStorage()
      const state: GameState = {
        gameId: this.currentGameId,
        sessionCode: this.sessionCode,
        status: 'in_progress',
        currentPhase: this.phase,
        currentStep: this.step,
        totalSteps: this.totalSteps,
        hostContext: this.hostContext,
        startedAt: '',
        lastUpdatedAt: new Date().toISOString(),
        ...this.gameData
      } as GameState
      
      storage.saveGameState(state)
    },

    endGame() {
      if (this.currentGameId && this.sessionCode) {
        const storage = useStorage()
        const state = storage.getGameState(this.sessionCode, this.currentGameId)
        if (state) {
          state.status = 'completed'
          storage.saveGameState(state)
        }
      }
      
      this.currentGameId = null
      this.phase = ''
      this.step = 0
      this.totalSteps = 0
      this.hostContext = ''
      this.gameData = {}
      this.timer = { active: false, remaining: 0, total: 0 }
    },

    reset() {
      this.currentGameId = null
      this.sessionCode = ''
      this.phase = ''
      this.step = 0
      this.totalSteps = 0
      this.hostContext = ''
      this.timer = { active: false, remaining: 0, total: 0 }
      this.gameData = {}
    }
  }
})

