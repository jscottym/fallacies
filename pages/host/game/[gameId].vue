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
          @click="gameStore.prevStep()"
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
          @click="gameStore.nextStep()"
        >
          Next
          <UIcon name="i-heroicons-arrow-right" class="ml-2" />
        </UButton>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, defineAsyncComponent, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useGameStore } from '~/stores/game'
import { useSessionStore } from '~/stores/session'
import { useTimer } from '~/composables/useTimer'
import { useWebSocket } from '~/composables/useWebSocket'
import { GAMES, type GameId, type StateUpdatePayload } from '~/types'

definePageMeta({
  layout: 'game'
})

const route = useRoute()
const gameStore = useGameStore()
const sessionStore = useSessionStore()
const timer = useTimer()
const ws = useWebSocket()

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
  if (!gameStore.currentGameId || !sessionStore.code) return

  const payload: StateUpdatePayload = {
    gameId: gameStore.currentGameId,
    phase: gameStore.phase,
    step: gameStore.step,
    context: gameStore.hostContext,
    data: { ...gameStore.gameData }
  }

  ws.send('game:state_update', payload)
}

onMounted(() => {
  if (sessionStore.code) {
    ws.connect(sessionStore.code)
  }

  const game = GAMES.find(g => g.id === gameId.value)
  if (!game) {
    navigateTo(`/host/lobby?code=${sessionStore.code}`)
    return
  }

  const existingState = gameStore.loadState(sessionStore.code, gameId.value)
  if (!existingState) {
    const totalSteps = getTotalSteps(gameId.value)
    gameStore.startGame(sessionStore.code, gameId.value, totalSteps)
  }

  // Send initial state to participants
  broadcastState()
})

watch(
  () => [gameStore.phase, gameStore.step, gameStore.hostContext, gameStore.gameData],
  () => {
    broadcastState()
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
