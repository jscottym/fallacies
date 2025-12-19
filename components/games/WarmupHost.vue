<template>
  <div class="slide-content">
    <div v-if="phase === 'intro'" class="text-center space-y-6">
      <div class="text-6xl mb-6">🎯</div>
      <h1 class="text-4xl font-bold text-white">Warm-Up Round</h1>
      <p class="text-xl text-neutral-400">Let's practice spotting fallacies together</p>
      <div class="game-card max-w-xl mx-auto">
        <p class="text-neutral-300">
          You'll see quotes and statements. Vote on which fallacy you think is present.
          Some may have multiple—we'll discuss!
        </p>
      </div>
    </div>

    <div v-else-if="phase === 'quote'" class="space-y-8">
      <div class="flex items-center justify-between">
        <h2 class="text-2xl font-bold text-white">
          {{ isComplex ? 'Complex Example' : 'Quote' }} {{ displayIndex }}
        </h2>
        <Timer 
          v-if="timerActive"
          :remaining="timerRemaining"
          :show-controls="true"
          @extend="extendTimer"
          @stop="stopTimer"
        />
      </div>

      <div class="game-card border-indigo-500/30">
        <p class="text-xl text-white leading-relaxed italic">"{{ currentQuote?.text }}"</p>
      </div>

      <div v-if="!revealed" class="space-y-4">
        <div class="flex items-center justify-between">
          <span class="text-neutral-400">Votes received</span>
          <span class="text-white font-medium">{{ votesReceived }} / {{ totalVoters }}</span>
        </div>
        <div class="h-2 bg-neutral-800 rounded-full overflow-hidden">
          <div 
            class="h-full bg-indigo-500 transition-all duration-300"
            :style="{ width: `${(votesReceived / Math.max(totalVoters, 1)) * 100}%` }"
          ></div>
        </div>
        <div class="text-center">
          <UButton 
            size="lg" 
            :disabled="votesReceived === 0"
            @click="revealResults"
          >
            <UIcon name="i-heroicons-eye" class="mr-2" />
            Reveal Results
          </UButton>
        </div>
      </div>

      <div v-else class="space-y-6">
        <div class="game-card border-green-500/30">
          <h3 class="text-lg font-semibold text-green-400 mb-3">
            Correct Answer{{ isComplex ? 's' : '' }}
          </h3>
          <div class="flex flex-wrap gap-2">
            <UBadge 
              v-for="fallacyId in currentQuote?.correctFallacies" 
              :key="fallacyId"
              color="green"
              size="lg"
            >
              {{ getFallacyName(fallacyId) }}
            </UBadge>
          </div>
        </div>

        <div class="game-card">
          <h3 class="text-lg font-semibold text-white mb-3">How You Voted</h3>
          <div class="space-y-2">
            <div 
              v-for="(count, fallacyId) in voteDistribution" 
              :key="fallacyId"
              class="flex items-center gap-3"
            >
              <div class="w-32 text-sm text-neutral-400">{{ getFallacyName(fallacyId as string) }}</div>
              <div class="flex-1 h-6 bg-neutral-800 rounded overflow-hidden">
                <div 
                  class="h-full transition-all duration-500"
                  :class="isCorrect(fallacyId as string) ? 'bg-green-500' : 'bg-neutral-600'"
                  :style="{ width: `${(count / Math.max(votesReceived, 1)) * 100}%` }"
                ></div>
              </div>
              <div class="w-8 text-right text-white">{{ count }}</div>
              <UIcon 
                v-if="isCorrect(fallacyId as string)"
                name="i-heroicons-check"
                class="text-green-500"
              />
            </div>
          </div>
        </div>

        <div class="game-card border-blue-500/30">
          <h3 class="text-lg font-semibold text-blue-400 mb-3">Explanation</h3>
          <p class="text-neutral-300">{{ currentQuote?.explanation }}</p>
        </div>
      </div>
    </div>

    <div v-else-if="phase === 'recap'" class="text-center space-y-8">
      <div class="text-6xl mb-6">🏆</div>
      <h1 class="text-4xl font-bold text-white">Warm-Up Complete!</h1>
      <div class="game-card max-w-xl mx-auto">
        <div class="grid grid-cols-2 gap-6 text-center">
          <div>
            <div class="text-4xl font-bold text-indigo-400">{{ quotesCompleted }}</div>
            <div class="text-neutral-400">Quotes Analyzed</div>
          </div>
          <div>
            <div class="text-4xl font-bold text-green-400">{{ Math.round(accuracy) }}%</div>
            <div class="text-neutral-400">Group Accuracy</div>
          </div>
        </div>
      </div>
      <p class="text-neutral-400">Ready to put these skills to the test?</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import Timer from '~/components/game/Timer.vue'
import { useTimer } from '~/composables/useTimer'
import { useContentStore } from '~/stores/content'
import { useGameStore } from '~/stores/game'
import { useSessionStore } from '~/stores/session'

const gameStore = useGameStore()
const sessionStore = useSessionStore()
const contentStore = useContentStore()
const timer = useTimer(30)

const revealed = ref(false)

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

const displayIndex = computed(() => {
  if (isComplex.value) {
    return currentQuoteIndex.value - contentStore.warmupQuotes.length + 1
  }
  return currentQuoteIndex.value + 1
})

const timerActive = computed(() => timer.isActive.value)
const timerRemaining = computed(() => timer.remaining.value)

const votes = computed(() => (gameStore.gameData.votes as Array<{ participantId: string; vote: string | string[] }>) || [])
const votesReceived = computed(() => votes.value.length)
const totalVoters = computed(() => sessionStore.participants.length)

const voteDistribution = computed(() => {
  const dist: Record<string, number> = {}
  votes.value.forEach(v => {
    const voteArray = Array.isArray(v.vote) ? v.vote : [v.vote]
    voteArray.forEach(fallacyId => {
      dist[fallacyId] = (dist[fallacyId] || 0) + 1
    })
  })
  return dist
})

const quotesCompleted = computed(() => Math.min(gameStore.step - 1, allQuotes.value.length))

const accuracy = computed(() => {
  if (votes.value.length === 0) return 0
  let correct = 0
  let total = 0
  votes.value.forEach(v => {
    const voteArray = Array.isArray(v.vote) ? v.vote : [v.vote]
    const correctFallacies = currentQuote.value?.correctFallacies || []
    voteArray.forEach(fallacyId => {
      total++
      if (correctFallacies.includes(fallacyId)) correct++
    })
  })
  return total > 0 ? (correct / total) * 100 : 0
})

watch(() => gameStore.step, () => {
  revealed.value = false
  gameStore.updateGameData({ votes: [], revealed: false })
  if (phase.value === 'quote') {
    timer.start(isComplex.value ? 45 : 30)
    updateHostContext()
  }
})

onMounted(() => {
  updateHostContext()
})

function updateHostContext() {
  if (phase.value === 'intro') {
    gameStore.setHostContext('Warm-Up Round - Introduction')
  } else if (phase.value === 'quote') {
    const prefix = isComplex.value ? 'Complex Example' : 'Quote'
    gameStore.setHostContext(`${prefix} ${displayIndex.value}: "${currentQuote.value?.text?.slice(0, 50)}..."`)
  } else {
    gameStore.setHostContext('Warm-Up Complete!')
  }
}

function getFallacyName(id: string): string {
  return contentStore.getFallacyById(id)?.name || id
}

function isCorrect(fallacyId: string): boolean {
  return currentQuote.value?.correctFallacies.includes(fallacyId) || false
}

function revealResults() {
  revealed.value = true
  timer.stop()
  gameStore.updateGameData({ revealed: true })
}

function extendTimer(seconds: number) {
  timer.extend(seconds)
}

function stopTimer() {
  timer.stop()
}
</script>

