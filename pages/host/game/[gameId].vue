<template>
  <GameWrapper ref="gameWrapper">
    <component 
      :is="gameComponent" 
      v-if="gameComponent"
      mode="host"
      :timer="gameWrapper?.timer"
    />
  </GameWrapper>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, defineAsyncComponent } from 'vue'
import { useRoute } from 'vue-router'
import { useGameStore } from '~/stores/game'
import { useSessionStore } from '~/stores/session'
import { GAMES, type GameId } from '~/types'
import GameWrapper from '~/components/game/GameWrapper.vue'

const route = useRoute()
const gameStore = useGameStore()
const sessionStore = useSessionStore()

const gameWrapper = ref<InstanceType<typeof GameWrapper>>()

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

onMounted(() => {
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
})

function getTotalSteps(gameId: GameId): number {
  switch (gameId) {
    case 'logic-traps':
      return 30
    case 'warmup':
      return 14
    case 'prosecution':
      return 20
    case 'antidotes':
      return 22
    case 'steelman':
      return 15
    case 'crux-hunt':
      return 10
    case 'reflection':
      return 8
    default:
      return 10
  }
}
</script>

