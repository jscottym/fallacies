<template>
  <div class="slide-content">
    <div v-if="currentSlide.type === 'title'" class="text-center space-y-6">
      <h1 class="text-5xl font-bold text-white">{{ currentSlide.title }}</h1>
      <p v-if="currentSlide.subtitle" class="text-2xl text-neutral-400">{{ currentSlide.subtitle }}</p>
    </div>

    <div v-else-if="currentSlide.type === 'intro'" class="space-y-8">
      <h2 class="text-3xl font-bold text-white">{{ currentSlide.title }}</h2>
      <div class="grid md:grid-cols-2 gap-8">
        <div class="game-card">
          <h3 class="text-xl font-semibold text-indigo-400 mb-4">Valid Argument</h3>
          <p class="text-neutral-300">If the premises are true, the conclusion <strong>must</strong> follow. The structure is correct.</p>
        </div>
        <div class="game-card">
          <h3 class="text-xl font-semibold text-green-400 mb-4">Sound Argument</h3>
          <p class="text-neutral-300">Valid <strong>AND</strong> the premises are actually true. This is what we're aiming for.</p>
        </div>
      </div>
      <div class="game-card border-red-500/30">
        <h3 class="text-xl font-semibold text-red-400 mb-4">Fallacy</h3>
        <p class="text-neutral-300">A flaw in reasoning that makes an argument <strong>invalid</strong>—the conclusion doesn't actually follow, even if it sounds persuasive.</p>
      </div>
    </div>

    <div v-else-if="currentSlide.type === 'intro-examples'" class="space-y-6">
      <h2 class="text-3xl font-bold text-white text-center">Let's See Some Examples</h2>
      <div class="grid md:grid-cols-2 gap-6">
        <div class="game-card border-green-500/30">
          <div class="flex items-center gap-2 mb-3">
            <span class="text-2xl">✅</span>
            <h3 class="text-lg font-semibold text-green-400">Valid AND Sound</h3>
          </div>
          <div class="space-y-2 text-neutral-300 text-sm">
            <p class="italic border-l-2 border-green-500/50 pl-3">All dogs are mammals.</p>
            <p class="italic border-l-2 border-green-500/50 pl-3">Buddy is a dog.</p>
            <p class="font-semibold text-green-300">→ Buddy is a mammal.</p>
          </div>
          <p class="text-xs text-neutral-500 mt-3">Structure is correct + premises are true = Sound!</p>
        </div>
        <div class="game-card border-indigo-500/30">
          <div class="flex items-center gap-2 mb-3">
            <span class="text-2xl">⚠️</span>
            <h3 class="text-lg font-semibold text-indigo-400">Valid but NOT Sound</h3>
          </div>
          <div class="space-y-2 text-neutral-300 text-sm">
            <p class="italic border-l-2 border-indigo-500/50 pl-3">All birds can fly.</p>
            <p class="italic border-l-2 border-indigo-500/50 pl-3">Penguins are birds.</p>
            <p class="font-semibold text-indigo-300">→ Penguins can fly.</p>
          </div>
          <p class="text-xs text-neutral-500 mt-3">Structure is correct, but first premise is false!</p>
        </div>
        <div class="game-card border-red-500/30">
          <div class="flex items-center gap-2 mb-3">
            <span class="text-2xl">❌</span>
            <h3 class="text-lg font-semibold text-red-400">INVALID (Fallacy!)</h3>
          </div>
          <div class="space-y-2 text-neutral-300 text-sm">
            <p class="italic border-l-2 border-red-500/50 pl-3">I studied for the test.</p>
            <p class="italic border-l-2 border-red-500/50 pl-3">I got an A on the test.</p>
            <p class="font-semibold text-red-300">→ Studying always leads to A's.</p>
          </div>
          <p class="text-xs text-neutral-500 mt-3">The conclusion doesn't follow! Maybe it was easy, or you got lucky.</p>
        </div>
        <div class="game-card border-yellow-500/30">
          <div class="flex items-center gap-2 mb-3">
            <span class="text-2xl">🎯</span>
            <h3 class="text-lg font-semibold text-yellow-400">The Goal</h3>
          </div>
          <div class="space-y-3 text-neutral-300 text-sm">
            <p><strong class="text-green-400">Sound</strong> = Valid structure + True premises</p>
            <p><strong class="text-red-400">Fallacy</strong> = Broken logic that tricks you</p>
            <p class="text-yellow-300 font-medium mt-2">Today we'll learn 7 common fallacies so you can spot them!</p>
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="currentSlide.type === 'fallacy-intro'" class="space-y-8">
      <div class="flex items-center gap-6">
        <div class="text-7xl">{{ getFallacyIcon(currentFallacy?.id) }}</div>
        <div>
          <h2 class="text-4xl font-bold text-white">{{ currentFallacy?.name }}</h2>
          <p class="text-2xl text-indigo-400 mt-2">"{{ currentFallacy?.nickname }}"</p>
        </div>
      </div>
      <div class="game-card">
        <p class="text-xl text-neutral-300">{{ currentFallacy?.definition }}</p>
      </div>
    </div>

    <div v-else-if="currentSlide.type === 'fallacy-why'" class="space-y-8">
      <div class="flex items-center gap-6">
        <div class="text-5xl">{{ getFallacyIcon(currentFallacy?.id) }}</div>
        <div>
          <h2 class="text-3xl font-bold text-white">{{ currentFallacy?.name }}</h2>
          <p class="text-xl text-indigo-400 mt-1">"{{ currentFallacy?.nickname }}"</p>
        </div>
      </div>
      <div class="flex items-center gap-4 mb-4">
        <h3 class="text-2xl font-bold text-white">Why It Works</h3>
      </div>
      <div class="game-card">
        <p class="text-xl text-neutral-300 leading-relaxed">{{ currentFallacy?.whyItWorks }}</p>
      </div>
    </div>

    <div v-else-if="currentSlide.type === 'fallacy-example'" class="space-y-8">
      <div class="flex items-center gap-6">
        <div class="text-5xl">{{ getFallacyIcon(currentFallacy?.id) }}</div>
        <div>
          <h2 class="text-3xl font-bold text-white">{{ currentFallacy?.name }}</h2>
          <p class="text-xl text-indigo-400 mt-1">"{{ currentFallacy?.nickname }}"</p>
        </div>
      </div>
      <div class="flex items-center gap-4 mb-4">
        <h3 class="text-2xl font-bold text-white">Example {{ currentExampleIndex + 1 }}</h3>
      </div>
      <div class="game-card border-indigo-500/30">
        <p class="text-2xl text-white italic leading-relaxed">"{{ currentExample?.text }}"</p>
      </div>
      <div v-if="showAnalysis" class="game-card border-green-500/30 animate-fade-in">
        <h3 class="text-lg font-semibold text-green-400 mb-3">Analysis</h3>
        <p class="text-neutral-300">{{ currentExample?.analysis }}</p>
      </div>
      <div v-else class="text-center">
        <UButton size="lg" @click="showAnalysis = true">
          <UIcon name="i-heroicons-eye" class="mr-2" />
          Reveal Analysis
        </UButton>
      </div>
    </div>

    <div v-else-if="currentSlide.type === 'discussion'" class="space-y-8 text-center">
      <div class="flex items-center justify-center gap-4">
        <div class="text-4xl">{{ getFallacyIcon(currentFallacy?.id) }}</div>
        <div>
          <h2 class="text-2xl font-bold text-white">{{ currentFallacy?.name }}</h2>
          <p class="text-lg text-indigo-400 mt-1">"{{ currentFallacy?.nickname }}"</p>
        </div>
      </div>
      <div class="text-6xl mb-6">💬</div>
      <h2 class="text-3xl font-bold text-white">Discussion</h2>
      
      <div v-if="selectedParticipant" class="game-card inline-block">
        <div class="text-sm text-neutral-500 mb-2">Randomly selected</div>
        <div class="text-3xl font-bold text-indigo-400">{{ selectedParticipant.name }}</div>
      </div>

      <div class="game-card max-w-2xl mx-auto">
        <p class="text-xl text-neutral-300">{{ currentSlide.prompt }}</p>
      </div>

      <div class="flex justify-center gap-4">
        <UButton variant="soft" @click="pickRandomParticipant">
          <UIcon name="i-heroicons-arrow-path" class="mr-2" />
          Pick Someone Else
        </UButton>
      </div>
    </div>

    <div v-else-if="currentSlide.type === 'recap'" class="space-y-8">
      <h2 class="text-3xl font-bold text-white text-center mb-8">The 7 Logic Traps</h2>
      <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div 
          v-for="fallacy in contentStore.fallacies" 
          :key="fallacy.id"
          class="game-card text-center"
        >
          <div class="text-3xl mb-2">{{ getFallacyIcon(fallacy.id) }}</div>
          <div class="font-semibold text-white">{{ fallacy.name }}</div>
          <div class="text-sm text-indigo-400">"{{ fallacy.nickname }}"</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useContentStore } from '~/stores/content'
import { useGameStore } from '~/stores/game'
import { useSessionStore } from '~/stores/session'
import type { Fallacy, FallacyExample, Participant } from '~/types'

const gameStore = useGameStore()
const sessionStore = useSessionStore()
const contentStore = useContentStore()

const showAnalysis = ref(false)
const selectedParticipant = ref<Participant | null>(null)

const FALLACY_ICONS: Record<string, string> = {
  'ad-hominem': '👤',
  'straw-man': '🥊',
  'false-dilemma': '⚖️',
  'appeal-to-authority': '🎓',
  'whataboutism': '👉',
  'slippery-slope': '⛷️',
  'causation-con': '🔗'
}

function getFallacyIcon(id?: string): string {
  return id ? FALLACY_ICONS[id] || '❓' : '❓'
}

interface Slide {
  type: 'title' | 'intro' | 'intro-examples' | 'fallacy-intro' | 'fallacy-why' | 'fallacy-example' | 'discussion' | 'recap'
  title?: string
  subtitle?: string
  fallacyIndex?: number
  exampleIndex?: number
  prompt?: string
}

const slides = computed((): Slide[] => {
  const result: Slide[] = [
    { type: 'title', title: 'The 7 Logic Traps', subtitle: 'Learning to spot the tricks our minds play' },
    { type: 'intro', title: 'Valid vs Sound' },
    { type: 'intro-examples', title: 'Examples' }
  ]

  contentStore.fallacies.forEach((fallacy, fIndex) => {
    result.push({ type: 'fallacy-intro', fallacyIndex: fIndex })
    result.push({ type: 'fallacy-why', fallacyIndex: fIndex })
    fallacy.examples.slice(0, 2).forEach((_, eIndex) => {
      result.push({ type: 'fallacy-example', fallacyIndex: fIndex, exampleIndex: eIndex })
    })
    result.push({ 
      type: 'discussion', 
      fallacyIndex: fIndex,
      prompt: `When was the last time you saw "${fallacy.nickname}" used? How did people respond to it?`
    })
  })

  result.push({ type: 'recap' })

  return result
})

const currentSlide = computed(() => slides.value[gameStore.step] || slides.value[0])

const currentFallacy = computed((): Fallacy | undefined => {
  if (currentSlide.value.fallacyIndex !== undefined) {
    return contentStore.fallacies[currentSlide.value.fallacyIndex]
  }
  return undefined
})

const currentExampleIndex = computed(() => currentSlide.value.exampleIndex || 0)

const currentExample = computed((): FallacyExample | undefined => {
  if (currentFallacy.value && currentSlide.value.exampleIndex !== undefined) {
    return currentFallacy.value.examples[currentSlide.value.exampleIndex]
  }
  return undefined
})

watch(() => gameStore.step, () => {
  showAnalysis.value = false
  if (currentSlide.value.type === 'discussion') {
    pickRandomParticipant()
  }
  updateHostContext()
})

function pickRandomParticipant() {
  const available = sessionStore.participants.filter(
    p => !(gameStore.gameData.discussedParticipants as string[] || []).includes(p.id)
  )
  const pool = available.length > 0 ? available : sessionStore.participants
  if (pool.length > 0) {
    selectedParticipant.value = pool[Math.floor(Math.random() * pool.length)]
    gameStore.updateGameData({
      selectedParticipantId: selectedParticipant.value.id
    })
  }
}

function updateHostContext() {
  let context = ''
  if (currentSlide.value.type === 'fallacy-intro' || currentSlide.value.type === 'fallacy-why') {
    context = `${currentFallacy.value?.name} - "${currentFallacy.value?.nickname}"`
  } else if (currentSlide.value.type === 'fallacy-example') {
    context = `${currentFallacy.value?.name} - Example ${currentExampleIndex.value + 1}`
  } else if (currentSlide.value.type === 'discussion') {
    context = `Discussion: ${currentFallacy.value?.name}`
  } else if (currentSlide.value.type === 'recap') {
    context = 'Recap: All 7 Logic Traps'
  } else if (currentSlide.value.type === 'intro-examples') {
    context = 'Valid vs Sound: Examples'
  } else {
    context = currentSlide.value.title || 'Introduction'
  }
  gameStore.setHostContext(context)
}
</script>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>

