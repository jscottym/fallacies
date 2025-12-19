<template>
  <div class="slide-content">
    <div v-if="phase === 'intro'" class="text-center space-y-6">
      <div class="text-6xl mb-6">🌟</div>
      <h1 class="text-4xl font-bold text-white">Closing Reflection</h1>
      <p class="text-xl text-gray-400">What are we taking away?</p>
    </div>

    <div v-else-if="phase === 'commitments'" class="space-y-8 text-center">
      <h2 class="text-3xl font-bold text-white">Personal Commitments</h2>
      
      <div v-if="currentParticipant" class="game-card inline-block">
        <div class="text-sm text-gray-500 mb-2">Your turn</div>
        <div class="text-3xl font-bold text-indigo-400">{{ currentParticipant.name }}</div>
      </div>

      <div class="game-card max-w-2xl mx-auto">
        <p class="text-xl text-gray-300">
          "What's ONE thing you'll do differently in arguments or discussions after today?"
        </p>
      </div>

      <div v-if="sharedCommitments.length > 0" class="max-w-2xl mx-auto text-left">
        <div class="text-sm text-gray-500 mb-3">Already shared:</div>
        <div class="space-y-2">
          <div 
            v-for="c in sharedCommitments" 
            :key="c.name"
            class="flex items-start gap-3 p-3 bg-gray-800/50 rounded-lg"
          >
            <UIcon name="i-heroicons-check-circle" class="text-green-500 mt-0.5" />
            <div>
              <div class="font-medium text-white">{{ c.name }}</div>
              <div class="text-sm text-gray-400">{{ c.commitment }}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="flex justify-center gap-4">
        <UButton variant="soft" @click="pickNextParticipant">
          <UIcon name="i-heroicons-arrow-path" class="mr-2" />
          Next Person
        </UButton>
        <UButton 
          color="primary" 
          v-if="sharedCommitments.length >= sessionStore.participants.length - 1"
          @click="showStats"
        >
          View Session Stats
        </UButton>
      </div>
    </div>

    <div v-else-if="phase === 'stats'" class="space-y-8 text-center">
      <div class="text-6xl mb-6">🎉</div>
      <h1 class="text-4xl font-bold text-white">Session Complete!</h1>

      <div class="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
        <div class="game-card">
          <div class="text-4xl font-bold text-indigo-400">7</div>
          <div class="text-gray-400">Fallacies Learned</div>
        </div>
        <div class="game-card">
          <div class="text-4xl font-bold text-green-400">5</div>
          <div class="text-gray-400">Antidotes Mastered</div>
        </div>
        <div class="game-card">
          <div class="text-4xl font-bold text-purple-400">{{ sessionStore.participants.length }}</div>
          <div class="text-gray-400">Truth Seekers</div>
        </div>
      </div>

      <div class="game-card max-w-2xl mx-auto">
        <h3 class="font-semibold text-white mb-4">Remember:</h3>
        <p class="text-gray-300 text-lg italic">
          "The goal isn't to win arguments. The goal is to have fewer false beliefs 
          tomorrow than you have today."
        </p>
      </div>

      <div class="flex justify-center gap-4">
        <UButton variant="soft" @click="createSafeWord">
          Create Family Safe Word
        </UButton>
        <UButton color="primary" @click="finishSession">
          End Session
        </UButton>
      </div>
    </div>

    <div v-else-if="phase === 'safeword'" class="space-y-8 text-center">
      <h2 class="text-3xl font-bold text-white">Family Safe Word</h2>
      <p class="text-gray-400">A gentle way to flag when someone might be using a fallacy</p>
      
      <div class="grid md:grid-cols-3 gap-4 max-w-3xl mx-auto">
        <button
          v-for="word in safeWordOptions"
          :key="word"
          class="game-card cursor-pointer hover:border-indigo-500/50 transition-colors"
          :class="selectedSafeWord === word ? 'border-indigo-500' : ''"
          @click="selectedSafeWord = word"
        >
          <div class="text-2xl mb-2">{{ word.split(' ')[0] }}</div>
          <div class="text-white">{{ word }}</div>
        </button>
      </div>

      <UInput 
        v-model="customSafeWord" 
        placeholder="Or create your own..."
        size="lg"
        class="max-w-sm mx-auto"
      />

      <UButton color="primary" @click="phase = 'stats'">
        Save & Continue
      </UButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useGameStore } from '~/stores/game'
import { useSessionStore } from '~/stores/session'
import type { Participant } from '~/types'

const gameStore = useGameStore()
const sessionStore = useSessionStore()

const phase = ref('intro')
const currentParticipantIndex = ref(0)
const sharedCommitments = ref<{ name: string; commitment: string }[]>([])
const selectedSafeWord = ref('')
const customSafeWord = ref('')

const safeWordOptions = [
  '🧐 "Interesting logic..."',
  '🤔 "Help me understand..."',
  '⚡ "Logic check!"',
  '🎯 "Steelman that?"',
  '🔍 "What\'s the crux?"'
]

const participantOrder = computed(() => {
  return [...sessionStore.participants].sort(() => Math.random() - 0.5)
})

const currentParticipant = computed((): Participant | undefined => {
  return participantOrder.value[currentParticipantIndex.value]
})

onMounted(() => {
  gameStore.setHostContext('Closing Reflection')
})

function pickNextParticipant() {
  if (currentParticipant.value) {
    sharedCommitments.value.push({
      name: currentParticipant.value.name,
      commitment: 'Shared their commitment'
    })
  }
  currentParticipantIndex.value++
  if (currentParticipantIndex.value >= participantOrder.value.length) {
    currentParticipantIndex.value = 0
  }
}

function showStats() {
  phase.value = 'stats'
  gameStore.setHostContext('Session Complete!')
}

function createSafeWord() {
  phase.value = 'safeword'
}

function finishSession() {
  sessionStore.updateGameStatus('reflection', 'completed')
  gameStore.endGame()
  navigateTo(`/host/lobby?code=${sessionStore.code}`)
}
</script>

