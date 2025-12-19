<template>
  <div class="h-full flex flex-col p-4">
    <div v-if="phase === 'hunting'" class="flex-1 flex flex-col">
      <div class="game-card mb-4">
        <div class="text-xs text-gray-500 uppercase tracking-wide mb-2">Current Prompt</div>
        <p class="text-white">{{ currentPrompt }}</p>
      </div>

      <div class="flex-1 flex flex-col">
        <label class="text-sm text-gray-400 mb-2">Your Response</label>
        <textarea
          v-model="response"
          class="flex-1 bg-gray-800 border border-gray-700 rounded-lg p-3 text-white resize-none focus:border-indigo-500 focus:outline-none"
          placeholder="Share your thoughts..."
        ></textarea>
        <UButton color="primary" class="mt-4" @click="submitResponse">
          Submit Response
        </UButton>
      </div>

      <div v-if="partnerResponse" class="mt-4 game-card border-purple-500/30">
        <div class="text-sm text-purple-400 mb-2">Partner's Response:</div>
        <p class="text-gray-300 text-sm">{{ partnerResponse }}</p>
      </div>
    </div>

    <div v-else class="flex-1 flex items-center justify-center">
      <div class="text-center space-y-4">
        <div class="text-5xl">🔍</div>
        <h2 class="text-xl font-bold text-white">The Crux Hunt</h2>
        <p class="text-gray-400">{{ gameStore.hostContext }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGameStore } from '~/stores/game'

const gameStore = useGameStore()

const response = ref('')
const partnerResponse = ref('')

const prompts = [
  "What's your initial position on this topic?",
  "What would change your mind?",
  "What do you think THEY believe that you don't?",
  "What's the ONE factual or value question at the heart of this?"
]

const phase = computed(() => {
  if (gameStore.hostContext.includes('Finding') || gameStore.hostContext.includes('Prompt')) {
    return 'hunting'
  }
  return 'waiting'
})

const currentPromptIndex = computed(() => {
  const match = gameStore.hostContext.match(/Prompt (\d)/)
  return match ? parseInt(match[1]) - 1 : 0
})

const currentPrompt = computed(() => prompts[currentPromptIndex.value] || prompts[0])

function submitResponse() {
  console.log('Response submitted:', response.value)
  response.value = ''
}
</script>

