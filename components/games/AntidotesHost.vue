<template>
  <div class="slide-content">
    <div v-if="currentSlide.type === 'title'" class="text-center space-y-6">
      <div class="text-6xl mb-6">💊</div>
      <h1 class="text-5xl font-bold text-white">{{ currentSlide.title }}</h1>
      <p v-if="currentSlide.subtitle" class="text-2xl text-gray-400">{{ currentSlide.subtitle }}</p>
    </div>

    <div v-else-if="currentSlide.type === 'recap-validity'" class="space-y-8">
      <h2 class="text-3xl font-bold text-white text-center">What Makes an Argument Good?</h2>
      <div class="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        <div class="game-card border-indigo-500/30">
          <h3 class="text-xl font-semibold text-indigo-400 mb-3">Valid Structure</h3>
          <p class="text-gray-300">If premises are true, conclusion must follow</p>
        </div>
        <div class="game-card border-green-500/30">
          <h3 class="text-xl font-semibold text-green-400 mb-3">True Premises</h3>
          <p class="text-gray-300">The starting points are actually correct</p>
        </div>
      </div>
      <div class="game-card border-yellow-500/30 max-w-2xl mx-auto text-center">
        <h3 class="text-xl font-semibold text-yellow-400 mb-3">Valid + True = Sound</h3>
        <p class="text-gray-300">A sound argument is what we're aiming for!</p>
      </div>
    </div>

    <div v-else-if="currentSlide.type === 'antidote-intro'" class="space-y-8">
      <div class="flex items-center gap-6">
        <div class="text-7xl">💊</div>
        <div>
          <h2 class="text-4xl font-bold text-white">{{ currentAntidote?.name }}</h2>
          <p class="text-xl text-green-400 mt-2">Counters: {{ currentAntidote?.counters.join(', ') }}</p>
        </div>
      </div>
      <div class="game-card">
        <p class="text-xl text-gray-300">{{ currentAntidote?.definition }}</p>
      </div>
    </div>

    <div v-else-if="currentSlide.type === 'antidote-how'" class="space-y-8">
      <h2 class="text-3xl font-bold text-white">How to Apply: {{ currentAntidote?.name }}</h2>
      <div class="space-y-4">
        <div 
          v-for="(step, index) in currentAntidote?.howToApply" 
          :key="index"
          class="game-card flex items-start gap-4"
        >
          <div class="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 font-bold flex-shrink-0">
            {{ index + 1 }}
          </div>
          <p class="text-gray-300 text-lg">{{ step }}</p>
        </div>
      </div>
    </div>

    <div v-else-if="currentSlide.type === 'antidote-example'" class="space-y-8">
      <h2 class="text-2xl font-bold text-white">{{ currentAntidote?.name }} in Action</h2>
      <div class="grid md:grid-cols-2 gap-6">
        <div class="game-card border-red-500/30">
          <h3 class="text-lg font-semibold text-red-400 mb-3">❌ Before (Fallacious)</h3>
          <p class="text-gray-300 italic">"{{ currentExample?.before }}"</p>
        </div>
        <div class="game-card border-green-500/30">
          <h3 class="text-lg font-semibold text-green-400 mb-3">✓ After (Sound)</h3>
          <p class="text-gray-300 italic">"{{ currentExample?.after }}"</p>
        </div>
      </div>
    </div>

    <div v-else-if="currentSlide.type === 'discussion'" class="space-y-8 text-center">
      <div class="text-6xl mb-6">💬</div>
      <h2 class="text-3xl font-bold text-white">Discussion</h2>
      
      <div v-if="selectedParticipant" class="game-card inline-block">
        <div class="text-sm text-gray-500 mb-2">Randomly selected</div>
        <div class="text-3xl font-bold text-green-400">{{ selectedParticipant.name }}</div>
      </div>

      <div class="game-card max-w-2xl mx-auto">
        <p class="text-xl text-gray-300">{{ currentSlide.prompt }}</p>
      </div>

      <UButton variant="soft" @click="pickRandomParticipant">
        <UIcon name="i-heroicons-arrow-path" class="mr-2" />
        Pick Someone Else
      </UButton>
    </div>

    <div v-else-if="currentSlide.type === 'bonus'" class="space-y-8">
      <h2 class="text-3xl font-bold text-white text-center">Bonus Principles</h2>
      <div class="grid md:grid-cols-3 gap-6">
        <div class="game-card">
          <h3 class="text-lg font-semibold text-purple-400 mb-3">Principle of Charity</h3>
          <p class="text-gray-300 text-sm">Interpret arguments in the most favorable reasonable way before responding</p>
        </div>
        <div class="game-card">
          <h3 class="text-lg font-semibold text-blue-400 mb-3">Confidence Calibration</h3>
          <p class="text-gray-300 text-sm">Match your certainty to your evidence. "I'm pretty sure" vs "I'm certain"</p>
        </div>
        <div class="game-card">
          <h3 class="text-lg font-semibold text-yellow-400 mb-3">Update Publicly</h3>
          <p class="text-gray-300 text-sm">When someone changes your mind, say so. Changing your mind is strength.</p>
        </div>
      </div>
    </div>

    <div v-else-if="currentSlide.type === 'recap'" class="space-y-8">
      <h2 class="text-3xl font-bold text-white text-center">The 5 Antidotes</h2>
      <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div 
          v-for="antidote in contentStore.antidotes" 
          :key="antidote.id"
          class="game-card"
        >
          <div class="font-semibold text-white">{{ antidote.name }}</div>
          <div class="text-sm text-green-400">Counters: {{ antidote.counters.join(', ') }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useGameStore } from '~/stores/game'
import { useSessionStore } from '~/stores/session'
import { useContentStore } from '~/stores/content'
import type { Participant, Antidote, AntidoteExample } from '~/types'

const gameStore = useGameStore()
const sessionStore = useSessionStore()
const contentStore = useContentStore()

const selectedParticipant = ref<Participant | null>(null)

interface Slide {
  type: 'title' | 'recap-validity' | 'antidote-intro' | 'antidote-how' | 'antidote-example' | 'discussion' | 'bonus' | 'recap'
  title?: string
  subtitle?: string
  antidoteIndex?: number
  prompt?: string
}

const discussionPrompts = [
  "When was the last time someone actually changed your mind? What did they do differently?",
  "What's the difference between 'winning an argument' and 'getting closer to truth'?",
  "How do you signal that you're genuinely open to being wrong?"
]

const slides = computed((): Slide[] => {
  const result: Slide[] = [
    { type: 'title', title: 'The Antidotes', subtitle: 'What to use INSTEAD of fallacies' },
    { type: 'recap-validity' }
  ]

  contentStore.antidotes.forEach((antidote, aIndex) => {
    result.push({ type: 'antidote-intro', antidoteIndex: aIndex })
    result.push({ type: 'antidote-how', antidoteIndex: aIndex })
    if (antidote.examples.length > 0) {
      result.push({ type: 'antidote-example', antidoteIndex: aIndex })
    }
  })

  result.push({ type: 'bonus' })

  discussionPrompts.forEach((prompt, index) => {
    result.push({ type: 'discussion', prompt })
  })

  result.push({ type: 'recap' })

  return result
})

const currentSlide = computed(() => slides.value[gameStore.step] || slides.value[0])

const currentAntidote = computed((): Antidote | undefined => {
  if (currentSlide.value.antidoteIndex !== undefined) {
    return contentStore.antidotes[currentSlide.value.antidoteIndex]
  }
  return undefined
})

const currentExample = computed((): AntidoteExample | undefined => {
  return currentAntidote.value?.examples[0]
})

watch(() => gameStore.step, () => {
  if (currentSlide.value.type === 'discussion') {
    pickRandomParticipant()
  }
  updateHostContext()
})

function pickRandomParticipant() {
  const pool = sessionStore.participants
  if (pool.length > 0) {
    selectedParticipant.value = pool[Math.floor(Math.random() * pool.length)]
  }
}

function updateHostContext() {
  let context = ''
  if (currentSlide.value.type === 'antidote-intro' || currentSlide.value.type === 'antidote-how') {
    context = currentAntidote.value?.name || ''
  } else if (currentSlide.value.type === 'discussion') {
    context = 'Discussion'
  } else {
    context = currentSlide.value.title || 'The Antidotes'
  }
  gameStore.setHostContext(context)
}
</script>

