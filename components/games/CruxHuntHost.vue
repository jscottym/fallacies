<template>
  <div class="slide-content">
    <div v-if="phase === 'intro'" class="text-center space-y-6">
      <div class="text-6xl mb-6">🔍</div>
      <h1 class="text-4xl font-bold text-white">The Crux Hunt</h1>
      <p class="text-xl text-neutral-400">Find the ONE thing you actually disagree about</p>
      <div class="game-card max-w-2xl mx-auto text-left space-y-4">
        <h3 class="font-semibold text-white">What's a Crux?</h3>
        <p class="text-neutral-300">
          The core question that, if answered, would resolve the whole disagreement.
          Often we argue past each other—this exercise helps us find what we're really debating.
        </p>
      </div>
    </div>

    <div v-else-if="phase === 'pairing'" class="space-y-8">
      <h2 class="text-3xl font-bold text-white text-center">Pairs</h2>
      <div class="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        <div 
          v-for="(pair, index) in pairs" 
          :key="index"
          class="game-card"
        >
          <div class="flex items-center justify-between mb-3">
            <span class="text-neutral-400">Pair {{ index + 1 }}</span>
            <UBadge variant="soft">{{ pair.topic }}</UBadge>
          </div>
          <div class="flex items-center gap-4">
            <div class="text-center flex-1">
              <div class="text-lg font-medium text-white">{{ pair.person1 }}</div>
              <div class="text-sm text-indigo-400">Position A</div>
            </div>
            <div class="text-2xl text-neutral-600">↔</div>
            <div class="text-center flex-1">
              <div class="text-lg font-medium text-white">{{ pair.person2 }}</div>
              <div class="text-sm text-purple-400">Position B</div>
            </div>
          </div>
        </div>
      </div>
      <div class="text-center">
        <UButton size="lg" @click="startHunting">
          Start Crux Hunt
        </UButton>
      </div>
    </div>

    <div v-else-if="phase === 'hunting'" class="space-y-8">
      <div class="flex items-center justify-between">
        <h2 class="text-3xl font-bold text-white">Find Your Crux</h2>
        <Timer 
          v-if="timerActive"
          :remaining="timerRemaining"
          :show-controls="true"
          @extend="extendTimer"
          @stop="stopTimer"
        />
      </div>

      <div class="game-card max-w-2xl mx-auto">
        <div class="text-sm text-neutral-400 mb-2">Current Prompt ({{ currentPromptIndex + 1 }}/4)</div>
        <p class="text-xl text-white">{{ currentPrompt }}</p>
      </div>

      <div class="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        <div 
          v-for="(pair, index) in pairs" 
          :key="index"
          class="game-card"
        >
          <div class="text-neutral-400 mb-2">Pair {{ index + 1 }}: {{ pair.topic }}</div>
          <div class="text-sm text-neutral-500">
            Status: {{ getPairStatus(index) }}
          </div>
        </div>
      </div>

      <div class="flex justify-center gap-4">
        <UButton variant="soft" :disabled="currentPromptIndex === 0" @click="prevPrompt">
          Previous Prompt
        </UButton>
        <UButton 
          color="primary" 
          @click="currentPromptIndex < 3 ? nextPrompt() : showCruxes()"
        >
          {{ currentPromptIndex < 3 ? 'Next Prompt' : 'Reveal Cruxes' }}
        </UButton>
      </div>
    </div>

    <div v-else-if="phase === 'reveal'" class="space-y-8">
      <h2 class="text-3xl font-bold text-white text-center">Cruxes Found!</h2>
      
      <div class="space-y-6 max-w-3xl mx-auto">
        <div 
          v-for="(pair, index) in pairs" 
          :key="index"
          class="game-card"
        >
          <div class="flex items-center justify-between mb-3">
            <span class="text-white font-medium">{{ pair.person1 }} & {{ pair.person2 }}</span>
            <UBadge variant="soft">{{ pair.topic }}</UBadge>
          </div>
          <div class="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
            <div class="text-sm text-green-400 mb-1">Their Crux:</div>
            <p class="text-white italic">"{{ pair.crux || 'Still finding their crux...' }}"</p>
          </div>
        </div>
      </div>

      <div class="text-center space-y-4">
        <div class="game-card max-w-xl mx-auto">
          <h3 class="font-semibold text-white mb-2">Discussion Questions</h3>
          <ul class="text-neutral-300 text-sm space-y-1 text-left">
            <li>• Were you closer than you thought?</li>
            <li>• Is your crux factual (can look it up) or value-based?</li>
            <li>• What would resolve your crux?</li>
          </ul>
        </div>
        <UButton color="primary" @click="finishGame">
          Continue to Reflection
        </UButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useGameStore } from '~/stores/game'
import { useSessionStore } from '~/stores/session'
import { useContentStore } from '~/stores/content'
import { useTimer } from '~/composables/useTimer'
import Timer from '~/components/game/Timer.vue'

const gameStore = useGameStore()
const sessionStore = useSessionStore()
const contentStore = useContentStore()
const timer = useTimer()

const phase = ref('intro')
const currentPromptIndex = ref(0)

const prompts = [
  "What's your initial position on this topic?",
  "What would change your mind?",
  "What do you think THEY believe that you don't?",
  "What's the ONE factual or value question at the heart of this?"
]

const timerActive = computed(() => timer.isActive.value)
const timerRemaining = computed(() => timer.remaining.value)

const currentPrompt = computed(() => prompts[currentPromptIndex.value])

interface Pair {
  person1: string
  person2: string
  topic: string
  crux: string
}

const pairs = ref<Pair[]>([])

onMounted(() => {
  gameStore.setHostContext('The Crux Hunt - Introduction')
  generatePairs()
})

function generatePairs() {
  const participants = [...sessionStore.participants]
  const topics = contentStore.topics.slice(0, Math.ceil(participants.length / 2))
  
  participants.sort(() => Math.random() - 0.5)
  
  pairs.value = []
  for (let i = 0; i < participants.length - 1; i += 2) {
    pairs.value.push({
      person1: participants[i].name,
      person2: participants[i + 1]?.name || 'TBD',
      topic: topics[Math.floor(i / 2) % topics.length]?.name || 'Free Topic',
      crux: ''
    })
  }
}

function startHunting() {
  phase.value = 'hunting'
  currentPromptIndex.value = 0
  timer.start(240)
  gameStore.setHostContext('Finding your crux...')
}

function nextPrompt() {
  if (currentPromptIndex.value < 3) {
    currentPromptIndex.value++
    gameStore.setHostContext(`Prompt ${currentPromptIndex.value + 1}: ${currentPrompt.value}`)
  }
}

function prevPrompt() {
  if (currentPromptIndex.value > 0) {
    currentPromptIndex.value--
  }
}

function showCruxes() {
  phase.value = 'reveal'
  timer.stop()
  pairs.value.forEach(pair => {
    if (!pair.crux) {
      pair.crux = "We disagree about [specific question]. If we knew the answer, we'd agree."
    }
  })
  gameStore.setHostContext('Cruxes Revealed!')
}

function getPairStatus(index: number): string {
  return 'Working on prompt ' + (currentPromptIndex.value + 1)
}

function finishGame() {
  sessionStore.updateGameStatus('crux-hunt', 'completed')
  gameStore.endGame()
  navigateTo(`/host/lobby?code=${sessionStore.code}`)
}

function extendTimer(seconds: number) {
  timer.extend(seconds)
}

function stopTimer() {
  timer.stop()
}
</script>

