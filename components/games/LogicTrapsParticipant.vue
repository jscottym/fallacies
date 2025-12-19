<template>
  <div class="h-full flex flex-col">
    <div v-if="isSelected" class="flex-1 flex items-center justify-center p-6">
      <div class="text-center space-y-6">
        <div class="text-6xl animate-bounce">🎯</div>
        <h2 class="text-2xl font-bold text-white">You're Up!</h2>
        <p class="text-neutral-400 max-w-xs mx-auto">
          The group is waiting for your thoughts. Take your time!
        </p>
        <div class="game-card">
          <p class="text-lg text-neutral-300">{{ discussionPrompt }}</p>
        </div>
      </div>
    </div>

    <div v-else class="flex-1 flex items-center justify-center p-6">
      <div class="text-center space-y-6">
        <div class="text-5xl">{{ currentFallacyIcon }}</div>
        <h2 class="text-xl font-bold text-white">{{ currentFallacyName }}</h2>
        <p class="text-neutral-400">Follow along on the main screen</p>
        <UButton variant="soft" @click="$emit('openReference')">
          <UIcon name="i-heroicons-book-open" class="mr-2" />
          View All Fallacies
        </UButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '~/stores/game'
import { useSessionStore } from '~/stores/session'
import { useContentStore } from '~/stores/content'

defineEmits<{
  openReference: []
}>()

const gameStore = useGameStore()
const sessionStore = useSessionStore()
const contentStore = useContentStore()

const FALLACY_ICONS: Record<string, string> = {
  'ad-hominem': '👤',
  'straw-man': '🥊',
  'false-dilemma': '⚖️',
  'appeal-to-authority': '🎓',
  'whataboutism': '👉',
  'slippery-slope': '⛷️',
  'causation-con': '🔗'
}

const currentFallacyIndex = computed(() => {
  return (gameStore.gameData.currentFallacyIndex as number) || 0
})

const currentFallacy = computed(() => {
  return contentStore.fallacies[currentFallacyIndex.value]
})

const currentFallacyName = computed(() => currentFallacy.value?.name || 'Introduction')
const currentFallacyIcon = computed(() => FALLACY_ICONS[currentFallacy.value?.id] || '🧠')

const isSelected = computed(() => {
  return gameStore.gameData.selectedParticipantId === sessionStore.currentParticipantId
})

const discussionPrompt = computed(() => {
  if (!currentFallacy.value) return ''
  return `When was the last time you saw "${currentFallacy.value.nickname}" used? How did people respond to it?`
})
</script>

