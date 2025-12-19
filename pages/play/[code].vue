<template>
  <div class="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-indigo-950">
    <div v-if="!hasJoined" class="flex items-center justify-center min-h-screen p-6">
      <div class="max-w-md w-full">
        <div class="text-center mb-8">
          <div class="text-5xl mb-4">🧠</div>
          <h1 class="text-3xl font-bold text-white">Join Session</h1>
          <p class="text-neutral-400 mt-2">Session: <span class="text-indigo-400 font-mono">{{ sessionCode }}</span></p>
        </div>

        <div class="game-card space-y-6">
          <UFormField label="Your Name">
            <UInput
              v-model="participantName"
              placeholder="Enter your name"
              size="lg"
              @keyup.enter="joinSession"
            />
          </UFormField>

          <UButton
            color="primary"
            size="lg"
            block
            :disabled="!participantName.trim()"
            @click="joinSession"
          >
            Join Session
          </UButton>
        </div>
      </div>
    </div>

    <div v-else class="min-h-screen flex flex-col">
      <header class="context-bar flex items-center justify-between">
        <div>
          <div class="flex items-center gap-3">
            <div class="text-sm text-neutral-400">{{ sessionStore.name }}</div>
            <div class="text-xs text-neutral-500">
              Code <span class="font-mono text-indigo-400">{{ sessionCode }}</span>
            </div>
          </div>
          <div class="text-white font-medium">{{ currentParticipant?.name }}</div>
        </div>
        <div class="flex items-center gap-3">
          <UBadge v-if="currentTeam" :style="{ backgroundColor: currentTeam.color + '30', color: currentTeam.color }">
            {{ currentTeam.name }}
          </UBadge>
          <UButton size="xs" variant="ghost" @click="showReference = true">
            <UIcon name="i-heroicons-book-open" />
          </UButton>
        </div>
      </header>

      <div v-if="gameStore.isActive" class="flex-1 flex flex-col">
        <div class="context-bar border-t-0">
          <div class="text-xs text-neutral-500 uppercase tracking-wide">Currently Viewing</div>
          <div class="text-white truncate">{{ gameStore.hostContext || 'Waiting for host...' }}</div>
        </div>

        <div class="flex-1 p-4">
          <component 
            :is="currentGameComponent" 
            v-if="currentGameComponent"
            mode="participant"
          />
          <div v-else class="flex items-center justify-center h-full">
            <div class="text-center text-neutral-400">
              <UIcon name="i-heroicons-clock" class="text-4xl mb-4" />
              <p>Waiting for host to start the game...</p>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="flex-1 flex items-center justify-center p-6">
        <div class="text-center">
          <div class="text-6xl mb-6">⏳</div>
          <h2 class="text-2xl font-bold text-white mb-2">Waiting for Game</h2>
          <p class="text-neutral-400">The host will start the game soon</p>
          <div class="mt-8 p-4 bg-neutral-800/50 rounded-xl">
            <div class="text-sm text-neutral-500 mb-2">Connected as</div>
            <div class="text-xl text-white">{{ currentParticipant?.name }}</div>
            <div v-if="currentTeam" class="mt-2">
              <UBadge :style="{ backgroundColor: currentTeam.color + '30', color: currentTeam.color }">
                {{ currentTeam.name }}
              </UBadge>
            </div>
          </div>
        </div>
      </div>
    </div>

    <ReferencePanel v-model:open="showReference" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import ReferencePanel from '~/components/game/ReferencePanel.vue'
import { useWebSocket } from '~/composables/useWebSocket'
import { useGameStore } from '~/stores/game'
import { useSessionStore } from '~/stores/session'
import type { StateUpdatePayload } from '~/types'

const route = useRoute()
const sessionStore = useSessionStore()
const gameStore = useGameStore()
const ws = useWebSocket()

const sessionCode = computed(() => (route.params.code as string).toUpperCase())
const participantName = ref('')
const hasJoined = ref(false)
const showReference = ref(false)

const currentParticipant = computed(() => sessionStore.currentParticipant)
const currentTeam = computed(() => sessionStore.currentTeam)

const currentGameComponent = computed(() => {
  if (!gameStore.currentGameId) return null
  const components: Record<string, unknown> = {
    'logic-traps': defineAsyncComponent(() => import('~/components/games/LogicTrapsParticipant.vue')),
    'warmup': defineAsyncComponent(() => import('~/components/games/WarmupParticipant.vue')),
    'prosecution': defineAsyncComponent(() => import('~/components/games/ProsecutionParticipant.vue')),
    'antidotes': defineAsyncComponent(() => import('~/components/games/AntidotesParticipant.vue')),
    'steelman': defineAsyncComponent(() => import('~/components/games/SteelmanParticipant.vue')),
    'crux-hunt': defineAsyncComponent(() => import('~/components/games/CruxHuntParticipant.vue')),
    'reflection': defineAsyncComponent(() => import('~/components/games/ReflectionParticipant.vue'))
  }
  return components[gameStore.currentGameId]
})

onMounted(() => {
  if (!sessionStore.loadSession(sessionCode.value, false)) {
    console.warn('Session not found, creating new one for participant')
  }

  // Listen for game state updates from host
  ws.on('game:state_update', (message) => {
    const payload = message.payload as StateUpdatePayload
    if (payload && payload.gameId) {
      gameStore.applyRemoteState(payload, sessionCode.value)
    }
  })
})

function joinSession() {
  if (!participantName.value.trim()) return
  
  const participant = sessionStore.addParticipant(participantName.value.trim())
  sessionStore.currentParticipantId = participant.id
  hasJoined.value = true
  
  ws.connect(sessionCode.value)
  ws.send('session:join', {
    participantName: participant.name,
    participantId: participant.id
  })
}
</script>

