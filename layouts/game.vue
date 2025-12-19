<template>
  <div class="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-indigo-950 flex flex-col">
    <header class="bg-neutral-900/80 backdrop-blur-sm border-b border-neutral-800 px-6 py-3">
      <div class="max-w-6xl mx-auto flex items-center justify-between">
        <div class="flex items-center gap-4">
          <UButton 
            variant="ghost" 
            size="sm"
            @click="exitGame"
          >
            <UIcon name="i-heroicons-arrow-left" class="mr-1" />
            Back to Lobby
          </UButton>
          
          <div class="h-6 w-px bg-neutral-700" />
          
          <div class="flex items-center gap-3">
            <span class="text-2xl">{{ gameInfo?.icon }}</span>
            <div>
              <h1 class="text-lg font-semibold text-white">{{ gameInfo?.name }}</h1>
              <div class="text-xs text-neutral-400">
                Step {{ gameStore.step + 1 }} of {{ gameStore.totalSteps }}
              </div>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-4">
          <div class="text-xs text-neutral-500">
            Code <span class="font-mono text-neutral-200">{{ sessionStore.code }}</span>
          </div>
          
          <div class="w-32 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
            <div 
              class="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
              :style="{ width: `${gameStore.progress}%` }"
            />
          </div>
          <span class="text-sm text-neutral-400">{{ Math.round(gameStore.progress) }}%</span>

          <UButton variant="ghost" size="sm" @click="showReference = true">
            <UIcon name="i-heroicons-book-open" />
          </UButton>
        </div>
      </div>
    </header>

    <main class="flex-1 flex flex-col">
      <slot />
    </main>

    <ReferencePanel v-model:open="showReference" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import ReferencePanel from '~/components/game/ReferencePanel.vue'
import { useHostId } from '~/composables/useHostId'
import { useWebSocket } from '~/composables/useWebSocket'
import { useGameStore } from '~/stores/game'
import { useSessionStore } from '~/stores/session'
import { GAMES, type HostNavigatePayload } from '~/types'

const gameStore = useGameStore()
const sessionStore = useSessionStore()
const ws = useWebSocket()
const hostId = useHostId()

const showReference = ref(false)

const gameInfo = computed(() => {
  return GAMES.find(g => g.id === gameStore.currentGameId)
})

function exitGame() {
  const targetRoute = `/host/${sessionStore.code}`

  const payload: HostNavigatePayload = {
    hostId: hostId.value || '',
    route: targetRoute
  }

  ws.send('host:navigate', payload)
  navigateTo(targetRoute)
}
</script>

