import { StorageSerializers, useLocalStorage, watchDebounced } from '@vueuse/core'
import { defineStore } from 'pinia'
import { computed, reactive, toRefs } from 'vue'
import type {
    GameId,
    GameState,
    ProsecutionRound,
    StateUpdatePayload,
    SteelmanRound,
    TimerState,
    VoteRecord
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

const STORAGE_KEY = 'fallacies:current-game'

export const useGameStore = defineStore('game', () => {
  const stored = useLocalStorage<GameStoreState | null>(STORAGE_KEY, null, {
    deep: true,
    listenToStorageChanges: true,
    serializer: StorageSerializers.object
  })
  
  const state = reactive<GameStoreState>({
    currentGameId: stored.value?.currentGameId ?? null,
    sessionCode: stored.value?.sessionCode ?? '',
    phase: stored.value?.phase ?? '',
    step: stored.value?.step ?? 0,
    totalSteps: stored.value?.totalSteps ?? 0,
    hostContext: stored.value?.hostContext ?? '',
    timer: stored.value?.timer ?? {
      active: false,
      remaining: 0,
      total: 0
    },
    gameData: stored.value?.gameData ?? {}
  })

  watchDebounced(
    () => ({
      currentGameId: state.currentGameId,
      sessionCode: state.sessionCode,
      phase: state.phase,
      step: state.step,
      totalSteps: state.totalSteps,
      hostContext: state.hostContext,
      timer: { ...state.timer },
      gameData: { ...state.gameData }
    }),
    (newState) => {
      if (newState.currentGameId) {
        stored.value = { ...newState }
      }
    },
    { debounce: 100, deep: true }
  )

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
  }

  function nextStep() {
    if (state.step < state.totalSteps) {
      state.step++
    }
  }

  function prevStep() {
    if (state.step > 0) {
      state.step--
    }
  }

  function setStep(step: number) {
    state.step = Math.max(0, Math.min(step, state.totalSteps))
  }

  function setHostContext(context: string) {
    state.hostContext = context
  }

  function updateGameData(updates: Record<string, unknown>) {
    state.gameData = { ...state.gameData, ...updates }
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
    state.timer = { ...state.timer, active: false }
  }

  function addVote(vote: VoteRecord) {
    const votes = (state.gameData.votes || []) as VoteRecord[]
    const existingIndex = votes.findIndex(v => 
      v.participantId === vote.participantId || 
      (vote.teamId && v.teamId === vote.teamId)
    )
    if (existingIndex >= 0) {
      votes[existingIndex] = vote
    } else {
      votes.push(vote)
    }
    state.gameData = { ...state.gameData, votes: [...votes] }
  }

  function initProsecutionRound(availableTopicIds: string[], teamIds: string[]) {
    const rounds = (state.gameData.rounds || []) as ProsecutionRound[]
    const newRound: ProsecutionRound = {
      roundNumber: rounds.length + 1,
      phase: 'topic_selection',
      topicSelections: {},
      arguments: {},
      reviews: [],
      currentRevealIndex: 0
    }
    rounds.push(newRound)
    
    const scores = (state.gameData.scores || {}) as Record<string, number>
    teamIds.forEach(id => {
      if (scores[id] === undefined) scores[id] = 0
    })
    
    state.gameData = {
      ...state.gameData,
      rounds: [...rounds],
      currentRoundIndex: rounds.length - 1,
      scores: { ...scores },
      availableTopicIds
    }
  }

  function selectTopic(teamId: string, topicId: string): boolean {
    const rounds = [...(state.gameData.rounds as ProsecutionRound[])]
    const currentRound = rounds[state.gameData.currentRoundIndex as number]
    if (!currentRound) return false
    
    const alreadySelected = Object.values(currentRound.topicSelections)
      .some(s => s.topicId === topicId)
    if (alreadySelected) return false
    
    currentRound.topicSelections = {
      ...currentRound.topicSelections,
      [teamId]: {
        topicId,
        selectedAt: new Date().toISOString()
      }
    }
    state.gameData = { ...state.gameData, rounds }
    return true
  }

  function submitArgument(teamId: string, text: string, fallaciesUsed: string[]) {
    const rounds = [...(state.gameData.rounds as ProsecutionRound[])]
    const currentRound = rounds[state.gameData.currentRoundIndex as number]
    if (!currentRound) return
    
    currentRound.arguments = {
      ...currentRound.arguments,
      [teamId]: {
        text,
        fallaciesUsed,
        submittedAt: new Date().toISOString()
      }
    }
    state.gameData = { ...state.gameData, rounds }
  }

  function submitSteelmanArgument(
    teamId: string,
    submission: { text: string; techniques: string[]; topicId?: string; position?: string; sourceHistoryKey?: string }
  ) {
    const rounds = [...((state.gameData.rounds || []) as SteelmanRound[])]
    const round = rounds[rounds.length - 1]
    if (!round) return

    round.arguments = {
      ...round.arguments,
      [teamId]: {
        text: submission.text,
        antidotesUsed: [...submission.techniques],
        submittedAt: new Date().toISOString(),
        topicId: submission.topicId,
        position: submission.position,
        sourceHistoryKey: submission.sourceHistoryKey
      }
    }

    state.gameData = { ...state.gameData, rounds }
  }

  function submitReview(reviewingTeamId: string, targetTeamId: string, identifiedFallacies: string[]) {
    const rounds = [...(state.gameData.rounds as ProsecutionRound[])]
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
    
    const reviews = [...currentRound.reviews]
    if (existingIndex >= 0) {
      reviews[existingIndex] = review
    } else {
      reviews.push(review)
    }
    currentRound.reviews = reviews
    state.gameData = { ...state.gameData, rounds }
  }

  function loadState(sessionCode: string, gameId: GameId): boolean {
    if (stored.value && stored.value.currentGameId === gameId && stored.value.sessionCode === sessionCode) {
      state.currentGameId = stored.value.currentGameId
      state.sessionCode = stored.value.sessionCode
      state.phase = stored.value.phase
      state.step = stored.value.step
      state.totalSteps = stored.value.totalSteps
      state.hostContext = stored.value.hostContext
      state.timer = { ...stored.value.timer }
      state.gameData = { ...stored.value.gameData }
      return true
    }
    
    return false
  }

  function applyRemoteState(payload: StateUpdatePayload, sessionCode: string) {
    state.currentGameId = payload.gameId as GameId
    state.sessionCode = sessionCode
    state.phase = payload.phase
    state.step = payload.step
    state.hostContext = payload.context
    if (payload.data) {
      state.gameData = { ...state.gameData, ...payload.data }
    }
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
    state.currentGameId = null
    state.sessionCode = ''
    state.phase = ''
    state.step = 0
    state.totalSteps = 0
    state.hostContext = ''
    state.timer = { active: false, remaining: 0, total: 0 }
    state.gameData = {}
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
    submitSteelmanArgument,
    submitReview,
    loadState,
    applyRemoteState,
    endGame,
    reset
  }
})
