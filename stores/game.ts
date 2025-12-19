import { defineStore } from 'pinia'
import { useLocalStorage } from '@vueuse/core'
import type { 
  GameId, 
  GameState, 
  TimerState,
  VoteRecord,
  ProsecutionRound
} from '~/types'

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

export const useGameStore = defineStore('game', () => {
  const stored = useLocalStorage<GameStoreState | null>('fallacies:current-game', null)
  
  const state = reactive<GameStoreState>({
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
  })

  const isActive = computed(() => state.currentGameId !== null)
  
  const progress = computed(() => {
    if (state.totalSteps === 0) return 0
    return (state.step / state.totalSteps) * 100
  })

  const currentState = computed((): GameState | null => {
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
  })

  function syncToStorage() {
    stored.value = {
      currentGameId: state.currentGameId,
      sessionCode: state.sessionCode,
      phase: state.phase,
      step: state.step,
      totalSteps: state.totalSteps,
      hostContext: state.hostContext,
      timer: state.timer,
      gameData: state.gameData
    }
  }

  function getGameStorageKey(sessionCode: string, gameId: GameId): string {
    return `fallacies:session:${sessionCode}:game:${gameId}`
  }

  function startGame(sessionCode: string, gameId: GameId, totalSteps: number) {
    state.currentGameId = gameId
    state.sessionCode = sessionCode
    state.phase = 'intro'
    state.step = 0
    state.totalSteps = totalSteps
    state.hostContext = ''
    state.gameData = getInitialGameData(gameId)
    syncToStorage()
  }

  function getInitialGameData(gameId: GameId): Record<string, unknown> {
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
  }

  function setPhase(phase: string) {
    state.phase = phase
    syncToStorage()
  }

  function nextStep() {
    if (state.step < state.totalSteps) {
      state.step++
      syncToStorage()
    }
  }

  function prevStep() {
    if (state.step > 0) {
      state.step--
      syncToStorage()
    }
  }

  function setStep(step: number) {
    state.step = Math.max(0, Math.min(step, state.totalSteps))
    syncToStorage()
  }

  function setHostContext(context: string) {
    state.hostContext = context
    syncToStorage()
  }

  function updateGameData(updates: Record<string, unknown>) {
    state.gameData = { ...state.gameData, ...updates }
    syncToStorage()
  }

  function setTimer(seconds: number) {
    state.timer = {
      active: true,
      remaining: seconds,
      total: seconds
    }
  }

  function tickTimer() {
    if (state.timer.active && state.timer.remaining > 0) {
      state.timer.remaining--
    }
    if (state.timer.remaining <= 0) {
      state.timer.active = false
    }
  }

  function stopTimer() {
    state.timer.active = false
  }

  function addVote(vote: VoteRecord) {
    if (!state.gameData.votes) {
      state.gameData.votes = []
    }
    const votes = state.gameData.votes as VoteRecord[]
    const existingIndex = votes.findIndex(v => 
      v.participantId === vote.participantId || 
      (vote.teamId && v.teamId === vote.teamId)
    )
    if (existingIndex >= 0) {
      votes[existingIndex] = vote
    } else {
      votes.push(vote)
    }
    syncToStorage()
  }

  function initProsecutionRound(availableTopicIds: string[], teamIds: string[]) {
    const rounds = (state.gameData.rounds || []) as ProsecutionRound[]
    const newRound: ProsecutionRound = {
      roundNumber: rounds.length + 1,
      phase: 'topic_selection',
      topicSelections: {},
      arguments: {},
      reviews: [],
      currentReviewTargetIndex: 0
    }
    rounds.push(newRound)
    
    const scores = (state.gameData.scores || {}) as Record<string, number>
    teamIds.forEach(id => {
      if (scores[id] === undefined) scores[id] = 0
    })
    
    state.gameData = {
      ...state.gameData,
      rounds,
      currentRoundIndex: rounds.length - 1,
      scores,
      availableTopicIds
    }
    syncToStorage()
  }

  function selectTopic(teamId: string, topicId: string): boolean {
    const rounds = state.gameData.rounds as ProsecutionRound[]
    const currentRound = rounds[state.gameData.currentRoundIndex as number]
    if (!currentRound) return false
    
    const alreadySelected = Object.values(currentRound.topicSelections)
      .some(s => s.topicId === topicId)
    if (alreadySelected) return false
    
    currentRound.topicSelections[teamId] = {
      topicId,
      selectedAt: new Date().toISOString()
    }
    syncToStorage()
    return true
  }

  function submitArgument(teamId: string, text: string, fallaciesUsed: string[]) {
    const rounds = state.gameData.rounds as ProsecutionRound[]
    const currentRound = rounds[state.gameData.currentRoundIndex as number]
    if (!currentRound) return
    
    currentRound.arguments[teamId] = {
      text,
      fallaciesUsed,
      submittedAt: new Date().toISOString()
    }
    syncToStorage()
  }

  function submitReview(reviewingTeamId: string, targetTeamId: string, identifiedFallacies: string[]) {
    const rounds = state.gameData.rounds as ProsecutionRound[]
    const currentRound = rounds[state.gameData.currentRoundIndex as number]
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
    syncToStorage()
  }

  function loadState(sessionCode: string, gameId: GameId): boolean {
    if (stored.value && stored.value.currentGameId === gameId && stored.value.sessionCode === sessionCode) {
      Object.assign(state, stored.value)
      return true
    }
    
    const gameKey = getGameStorageKey(sessionCode, gameId)
    const gameStorage = useLocalStorage<GameStoreState | null>(gameKey, null)
    
    if (gameStorage.value) {
      Object.assign(state, gameStorage.value)
      syncToStorage()
      return true
    }
    
    return false
  }

  function saveState() {
    if (!state.currentGameId || !state.sessionCode) return
    syncToStorage()
    
    const gameKey = getGameStorageKey(state.sessionCode, state.currentGameId)
    const gameStorage = useLocalStorage<GameStoreState | null>(gameKey, null)
    gameStorage.value = { ...state }
  }

  function endGame() {
    state.currentGameId = null
    state.phase = ''
    state.step = 0
    state.totalSteps = 0
    state.hostContext = ''
    state.gameData = {}
    state.timer = { active: false, remaining: 0, total: 0 }
    stored.value = null
  }

  function reset() {
    Object.assign(state, {
      currentGameId: null,
      sessionCode: '',
      phase: '',
      step: 0,
      totalSteps: 0,
      hostContext: '',
      timer: { active: false, remaining: 0, total: 0 },
      gameData: {}
    })
    stored.value = null
  }

  return {
    ...toRefs(state),
    isActive,
    progress,
    currentState,
    startGame,
    setPhase,
    nextStep,
    prevStep,
    setStep,
    setHostContext,
    updateGameData,
    setTimer,
    tickTimer,
    stopTimer,
    addVote,
    initProsecutionRound,
    selectTopic,
    submitArgument,
    submitReview,
    loadState,
    saveState,
    endGame,
    reset
  }
})
