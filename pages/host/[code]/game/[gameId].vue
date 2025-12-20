<template>
  <div class="flex-1 flex flex-col">
    <div class="flex-1 max-w-6xl mx-auto w-full p-6">
      <component 
        :is="gameComponent" 
        v-if="gameComponent"
        mode="host"
        :timer="timer"
      />
    </div>

    <footer class="bg-neutral-900/80 backdrop-blur-sm border-t border-neutral-800 px-6 py-4">
      <div class="max-w-6xl mx-auto flex items-center justify-between">
        <UButton 
          variant="ghost" 
          :disabled="gameStore.step === 0"
          @click="handlePrevStep"
        >
          <UIcon name="i-heroicons-arrow-left" class="mr-2" />
          Back
        </UButton>

        <div v-if="timer.isActive.value" class="flex items-center gap-3">
          <div 
            class="text-2xl font-mono font-bold"
            :class="{
              'text-white': timer.status.value === 'normal',
              'text-yellow-500': timer.status.value === 'warning',
              'text-red-500': timer.status.value === 'critical'
            }"
          >
            {{ timer.formattedTime.value }}
          </div>
          <UButton size="xs" variant="soft" @click="timer.extend(30)">+30s</UButton>
          <UButton size="xs" variant="soft" @click="timer.stop()">Stop</UButton>
        </div>

        <UButton 
          color="primary"
          :disabled="gameStore.step >= gameStore.totalSteps - 1"
          @click="handleNextStep"
        >
          Next
          <UIcon name="i-heroicons-arrow-right" class="ml-2" />
        </UButton>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useHostId } from '~/composables/useHostId'
import { useTimer } from '~/composables/useTimer'
import { useWebSocket } from '~/composables/useWebSocket'
import { useGameStore } from '~/stores/game'
import { useSessionStore } from '~/stores/session'
import {
    GAMES,
    type GameId,
    type HostNavigatePayload,
    type HostSyncRequestPayload,
    type HostSyncResponsePayload,
    type ReviewSubmitPayload,
    type SessionSyncRequestPayload,
    type SessionTeamsUpdatedPayload,
    type StateUpdatePayload,
    type SubmitPayload,
    type TopicSelectPayload,
    type VotePayload,
    type WSMessage
} from '~/types'

definePageMeta({
  layout: 'game'
})

const route = useRoute()
const router = useRouter()
const gameStore = useGameStore()
const sessionStore = useSessionStore()
const timer = useTimer()
const ws = useWebSocket()
const hostId = useHostId()
const isReceivingRemoteUpdate = ref(false)

const code = computed(() => (route.params.code as string).toUpperCase())
const gameId = computed(() => route.params.gameId as GameId)

const gameComponent = computed(() => {
  const components: Record<string, ReturnType<typeof defineAsyncComponent>> = {
    'logic-traps': defineAsyncComponent(() => import('~/components/games/LogicTrapsHost.vue')),
    'warmup': defineAsyncComponent(() => import('~/components/games/WarmupHost.vue')),
    'prosecution': defineAsyncComponent(() => import('~/components/games/ProsecutionHost.vue')),
    'antidotes': defineAsyncComponent(() => import('~/components/games/AntidotesHost.vue')),
    'steelman': defineAsyncComponent(() => import('~/components/games/SteelmanHost.vue')),
    'crux-hunt': defineAsyncComponent(() => import('~/components/games/CruxHuntHost.vue')),
    'reflection': defineAsyncComponent(() => import('~/components/games/ReflectionHost.vue'))
  }
  return components[gameId.value]
})

function broadcastState() {
  if (!gameStore.currentGameId || !code.value || isReceivingRemoteUpdate.value) return

  const payload: StateUpdatePayload = {
    gameId: gameStore.currentGameId,
    phase: gameStore.phase,
    step: gameStore.step,
    context: gameStore.hostContext,
    data: { ...gameStore.gameData }
  }

  ws.send('game:state_update', payload)
}

function handleNextStep() {
  gameStore.nextStep()
  broadcastState()
}

function handlePrevStep() {
  gameStore.prevStep()
  broadcastState()
}

function sendSyncResponse() {
  const payload: HostSyncResponsePayload = {
    hostId: hostId.value,
    currentRoute: route.fullPath,
    gameId: gameStore.currentGameId,
    phase: gameStore.phase,
    step: gameStore.step,
    totalSteps: gameStore.totalSteps,
    hostContext: gameStore.hostContext,
    gameData: { ...gameStore.gameData }
  }
  ws.send('host:sync_response', payload)
}

function broadcastSessionState() {
  const payload: SessionTeamsUpdatedPayload = {
    participants: [...sessionStore.participants],
    teams: [...sessionStore.teams],
    argumentHistory: { ...sessionStore.argumentHistory }
  }
  ws.send('session:teams_updated', payload)
}

function applyRemoteHostState(payload: HostSyncResponsePayload | StateUpdatePayload) {
  isReceivingRemoteUpdate.value = true
  
  if ('totalSteps' in payload && payload.totalSteps) {
    gameStore.totalSteps = payload.totalSteps
  }
  
  if (payload.gameId) {
    gameStore.currentGameId = payload.gameId as GameId
  }
  gameStore.phase = payload.phase
  gameStore.step = payload.step
  
  if ('hostContext' in payload) {
    gameStore.hostContext = payload.hostContext
  } else if ('context' in payload) {
    gameStore.hostContext = payload.context
  }
  
  if ('gameData' in payload && payload.gameData) {
    gameStore.gameData = { ...gameStore.gameData, ...payload.gameData }
  } else if ('data' in payload && payload.data) {
    gameStore.gameData = { ...gameStore.gameData, ...payload.data }
  }
  
  setTimeout(() => {
    isReceivingRemoteUpdate.value = false
  }, 100)
}

onMounted(() => {
  // Hydrate session for this host from code in URL
  if (!sessionStore.code || sessionStore.code !== code.value) {
    const loaded = sessionStore.loadSession(code.value, true) || sessionStore.hydrateFromStorage()
    if (!loaded) {
      navigateTo('/host')
      return
    }
  }

  ws.connect(code.value)

  const game = GAMES.find(g => g.id === gameId.value)
  if (!game) {
    navigateTo(`/host/${code.value}`)
    return
  }

  const existingState = gameStore.loadState(code.value, gameId.value)
  if (!existingState) {
    const totalSteps = getTotalSteps(gameId.value)
    gameStore.startGame(code.value, gameId.value, totalSteps)
  }

  ws.on('host:sync_request', (message: WSMessage<HostSyncRequestPayload>) => {
    if (message.payload.hostId !== hostId.value) {
      sendSyncResponse()
    }
  })

  ws.on('session:sync_request', (message: WSMessage<SessionSyncRequestPayload>) => {
    if (message.payload.source === 'participant') {
      broadcastSessionState()
    }
  })

  ws.on('host:sync_response', (message: WSMessage<HostSyncResponsePayload>) => {
    const payload = message.payload
    if (payload.hostId === hostId.value) return
    
    if (payload.currentRoute !== route.fullPath) {
      router.push(payload.currentRoute)
    }
    
    applyRemoteHostState(payload)
  })

  ws.on('game:state_update', (message: WSMessage<StateUpdatePayload>) => {
    const payload = message.payload
    if (!payload || payload.gameId !== gameId.value) return
    
    applyRemoteHostState(payload)
  })

  ws.on('host:navigate', (message: WSMessage<HostNavigatePayload>) => {
    const payload = message.payload
    if (payload.hostId === hostId.value) return
    
    if (payload.route !== route.fullPath) {
      router.push(payload.route)
    }
  })

  ws.on('game:vote', (message: WSMessage<VotePayload>) => {
    const payload = message.payload
    if (!payload || payload.gameId !== gameId.value) return

    gameStore.addVote({
      participantId: payload.participantId,
      teamId: payload.teamId,
      vote: payload.vote,
      submittedAt: new Date().toISOString()
    })
  })

  ws.on('game:submit', (message: WSMessage<SubmitPayload>) => {
    const payload = message.payload
    if (!payload || payload.gameId !== gameId.value) return

    if (gameId.value === 'prosecution') {
      gameStore.submitArgument(
        payload.teamId,
        payload.submission.text,
        payload.submission.techniques
      )
    } else if (gameId.value === 'steelman') {
      gameStore.submitSteelmanArgument(
        payload.teamId,
        payload.submission
      )
    }
  })

  ws.on('game:topic_select', (message: WSMessage<TopicSelectPayload>) => {
    const payload = message.payload
    if (!payload || payload.gameId !== gameId.value) return

    const claimed = gameStore.selectTopic(payload.teamId, payload.topicId)
    if (claimed) {
      broadcastState()
    }
  })

  ws.on('game:review_submit', (message: WSMessage<ReviewSubmitPayload>) => {
    const payload = message.payload
    if (!payload || payload.gameId !== gameId.value) return

    gameStore.submitReview(
      payload.reviewingTeamId,
      payload.targetTeamId,
      payload.identifiedFallacies
    )
  })

  setTimeout(() => {
    ws.send('host:sync_request', { hostId: hostId.value } as HostSyncRequestPayload)
  }, 500)

  setTimeout(() => {
    broadcastState()
  }, 1000)

  setTimeout(() => {
    broadcastSessionState()
  }, 1200)
})

watch(
  () => [gameStore.phase, gameStore.hostContext, gameStore.gameData],
  () => {
    if (!isReceivingRemoteUpdate.value) {
      broadcastState()
    }
  },
  { deep: true }
)

watch(
  () => [sessionStore.participants, sessionStore.teams, sessionStore.argumentHistory],
  () => {
    broadcastSessionState()
  },
  { deep: true }
)

function getTotalSteps(gameId: GameId): number {
  switch (gameId) {
    case 'logic-traps': return 30
    case 'warmup': return 14
    case 'prosecution': return 20
    case 'antidotes': return 22
    case 'steelman': return 15
    case 'crux-hunt': return 10
    case 'reflection': return 8
    default: return 10
  }
}
</script>


