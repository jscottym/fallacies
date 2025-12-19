<template>
  <div class="h-full flex flex-col p-4">
    <div v-if="phase === 'intro'" class="flex-1 flex items-center justify-center">
      <div class="text-center space-y-4">
        <div class="text-5xl">🎯</div>
        <h2 class="text-xl font-bold text-white">Warm-Up Round</h2>
        <p class="text-gray-400">Get ready to identify fallacies!</p>
      </div>
    </div>

    <div v-else-if="phase === 'quote'" class="flex-1 flex flex-col">
      <div class="game-card mb-4">
        <div class="text-xs text-gray-500 uppercase tracking-wide mb-2">Current Quote</div>
        <p class="text-white text-sm leading-relaxed">"{{ truncatedQuote }}"</p>
        <UButton 
          v-if="fullQuote.length > 100" 
          size="xs" 
          variant="link" 
          class="mt-2"
          @click="showFullQuote = true"
        >
          View Full Quote
        </UButton>
      </div>

      <div v-if="!hasVoted && !revealed" class="flex-1 overflow-y-auto">
        <div class="text-sm text-gray-400 mb-3">
          {{ isComplex ? 'Select ALL fallacies present:' : 'Which fallacy is this?' }}
        </div>
        <div class="space-y-2">
          <button
            v-for="fallacy in contentStore.fallacies"
            :key="fallacy.id"
            class="w-full p-3 rounded-lg border transition-all text-left"
            :class="selectedFallacies.includes(fallacy.id) 
              ? 'border-indigo-500 bg-indigo-500/20 text-white' 
              : 'border-gray-700 bg-gray-800/50 text-gray-300 hover:border-gray-600'"
            @click="toggleFallacy(fallacy.id)"
          >
            <div class="font-medium">{{ fallacy.name }}</div>
            <div class="text-sm text-gray-500">"{{ fallacy.nickname }}"</div>
          </button>
        </div>
        <div class="mt-4 sticky bottom-0 bg-gray-900/90 backdrop-blur-sm p-2 -mx-2">
          <UButton 
            color="primary" 
            block 
            :disabled="selectedFallacies.length === 0"
            @click="submitVote"
          >
            Submit Vote
          </UButton>
        </div>
      </div>

      <div v-else-if="hasVoted && !revealed" class="flex-1 flex items-center justify-center">
        <div class="text-center space-y-4">
          <UIcon name="i-heroicons-check-circle" class="text-5xl text-green-500" />
          <h3 class="text-xl font-bold text-white">Vote Submitted!</h3>
          <p class="text-gray-400">Waiting for results...</p>
        </div>
      </div>

      <div v-else class="flex-1 overflow-y-auto">
        <div class="space-y-4">
          <div class="game-card border-green-500/30">
            <div class="text-sm text-green-400 font-medium mb-2">Correct Answer</div>
            <div class="flex flex-wrap gap-2">
              <UBadge 
                v-for="fallacyId in correctFallacies" 
                :key="fallacyId"
                color="green"
              >
                {{ getFallacyName(fallacyId) }}
              </UBadge>
            </div>
          </div>
          <div class="game-card">
            <div class="text-sm text-gray-400 mb-2">Your Vote</div>
            <div class="flex flex-wrap gap-2">
              <UBadge 
                v-for="fallacyId in selectedFallacies" 
                :key="fallacyId"
                :color="correctFallacies.includes(fallacyId) ? 'green' : 'red'"
              >
                {{ getFallacyName(fallacyId) }}
              </UBadge>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="flex-1 flex items-center justify-center">
      <div class="text-center space-y-4">
        <div class="text-5xl">🏆</div>
        <h2 class="text-xl font-bold text-white">Great Work!</h2>
        <p class="text-gray-400">Warm-up complete</p>
      </div>
    </div>

    <UModal v-model:open="showFullQuote">
      <template #content>
        <div class="p-6">
          <p class="text-white leading-relaxed">"{{ fullQuote }}"</p>
          <div class="mt-4 text-right">
            <UButton variant="ghost" @click="showFullQuote = false">Close</UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useWebSocket } from '~/composables/useWebSocket'
import { useContentStore } from '~/stores/content'
import { useGameStore } from '~/stores/game'
import { useSessionStore } from '~/stores/session'
import type { VotePayload } from '~/types'

const gameStore = useGameStore()
const sessionStore = useSessionStore()
const contentStore = useContentStore()
const ws = useWebSocket()

const selectedFallacies = ref<string[]>([])
const showFullQuote = ref(false)

const allQuotes = computed(() => [
  ...contentStore.warmupQuotes,
  ...contentStore.complexExamples
])

const phase = computed(() => {
  if (gameStore.step === 0) return 'intro'
  if (gameStore.step > allQuotes.value.length) return 'recap'
  return 'quote'
})

const currentQuoteIndex = computed(() => gameStore.step - 1)
const currentQuote = computed(() => allQuotes.value[currentQuoteIndex.value])
const isComplex = computed(() => currentQuoteIndex.value >= contentStore.warmupQuotes.length)

const fullQuote = computed(() => currentQuote.value?.text || '')
const truncatedQuote = computed(() => {
  if (fullQuote.value.length <= 100) return fullQuote.value
  return fullQuote.value.slice(0, 100) + '...'
})

const correctFallacies = computed(() => currentQuote.value?.correctFallacies || [])

const revealed = computed(() => gameStore.gameData.revealed as boolean || false)

const votes = computed(() => (gameStore.gameData.votes as Array<{ participantId: string; vote: string[] }>) || [])

const hasVoted = computed(() => {
  return votes.value.some(v => v.participantId === sessionStore.currentParticipantId)
})

function toggleFallacy(id: string) {
  if (isComplex.value) {
    const index = selectedFallacies.value.indexOf(id)
    if (index >= 0) {
      selectedFallacies.value.splice(index, 1)
    } else {
      selectedFallacies.value.push(id)
    }
  } else {
    selectedFallacies.value = [id]
  }
}

function submitVote() {
  if (selectedFallacies.value.length === 0) return
  
  const participantId = sessionStore.currentParticipantId
  if (!participantId) return

  // Update local view so this participant sees \"Vote submitted\" immediately
  gameStore.addVote({
    participantId,
    teamId: sessionStore.currentTeam?.id,
    vote: selectedFallacies.value,
    submittedAt: new Date().toISOString()
  })

  // Notify host via WebSocket so host vote counts update
  const payload: VotePayload = {
    gameId: gameStore.currentGameId || 'warmup',
    participantId,
    teamId: sessionStore.currentTeam?.id,
    vote: [...selectedFallacies.value]
  }

  ws.send('game:vote', payload)
}

function getFallacyName(id: string): string {
  return contentStore.getFallacyById(id)?.name || id
}

// When the host advances to a new quote, clear prior selection highlighting
watch(
  () => gameStore.step,
  () => {
    selectedFallacies.value = []
  }
)
</script>

