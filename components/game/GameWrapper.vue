<template>
  <div class="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-indigo-950 flex flex-col">
    <header class="bg-neutral-900/80 backdrop-blur-sm border-b border-neutral-800 px-6 py-4">
      <div class="max-w-6xl mx-auto flex items-center justify-between">
        <div class="flex items-center gap-4">
          <span class="text-3xl">{{ gameInfo?.icon }}</span>
          <div>
            <h1 class="text-xl font-bold text-white">{{ gameInfo?.name }}</h1>
            <div class="text-sm text-neutral-400">
              Step {{ gameStore.step + 1 }} of {{ gameStore.totalSteps }}
            </div>
          </div>
        </div>

        <div class="flex items-center gap-4">
          <div class="w-48 h-2 bg-neutral-800 rounded-full overflow-hidden">
            <div 
              class="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
              :style="{ width: `${gameStore.progress}%` }"
            ></div>
          </div>

          <UButton variant="ghost" @click="showReference = true">
            <UIcon name="i-heroicons-book-open" class="mr-1" />
            Reference
          </UButton>

          <UButton variant="ghost" color="red" @click="confirmExit">
            <UIcon name="i-heroicons-x-mark" />
          </UButton>
        </div>
      </div>
    </header>

    <main class="flex-1 max-w-6xl mx-auto w-full p-6">
      <slot />
    </main>

    <footer class="bg-neutral-900/80 backdrop-blur-sm border-t border-neutral-800 px-6 py-4">
      <div class="max-w-6xl mx-auto flex items-center justify-between">
        <UButton 
          variant="ghost" 
          :disabled="gameStore.step === 0"
          @click="prevStep"
        >
          <UIcon name="i-heroicons-arrow-left" class="mr-2" />
          Back
        </UButton>

        <div v-if="timer.isActive" class="flex items-center gap-3">
          <div 
            class="text-2xl font-mono font-bold"
            :class="{
              'text-white': timer.status === 'normal',
              'text-yellow-500': timer.status === 'warning',
              'text-red-500': timer.status === 'critical'
            }"
          >
            {{ timer.formattedTime }}
          </div>
          <UButton size="xs" variant="soft" @click="timer.extend(30)">+30s</UButton>
          <UButton size="xs" variant="soft" @click="timer.stop()">Stop</UButton>
        </div>

        <slot name="footer-center" />

        <UButton 
          color="primary"
          :disabled="gameStore.step >= gameStore.totalSteps - 1"
          @click="nextStep"
        >
          Next
          <UIcon name="i-heroicons-arrow-right" class="ml-2" />
        </UButton>
      </div>
    </footer>

    <ReferencePanel v-model:open="showReference" />

    <UModal v-model:open="showExitConfirm">
      <template #content>
        <div class="p-6 text-center space-y-6">
          <UIcon name="i-heroicons-exclamation-triangle" class="text-5xl text-yellow-500" />
          <div>
            <h3 class="text-xl font-semibold text-white mb-2">End this game?</h3>
            <p class="text-neutral-400">Your progress will be saved. You can resume later.</p>
          </div>
          <div class="flex gap-3 justify-center">
            <UButton variant="ghost" size="lg" @click="showExitConfirm = false">
              Keep Playing
            </UButton>
            <UButton color="red" size="lg" @click="exitGame">
              End Game
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGameStore } from '~/stores/game'
import { useSessionStore } from '~/stores/session'
import { useTimer } from '~/composables/useTimer'
import { GAMES } from '~/types'
import ReferencePanel from './ReferencePanel.vue'

const gameStore = useGameStore()
const sessionStore = useSessionStore()
const timer = useTimer()

const showReference = ref(false)
const showExitConfirm = ref(false)

const gameInfo = computed(() => {
  return GAMES.find(g => g.id === gameStore.currentGameId)
})

function prevStep() {
  gameStore.prevStep()
}

function nextStep() {
  gameStore.nextStep()
}

function confirmExit() {
  showExitConfirm.value = true
}

function exitGame() {
  sessionStore.updateGameStatus(gameStore.currentGameId!, 'completed')
  gameStore.endGame()
  navigateTo(`/host/lobby?code=${sessionStore.code}`)
}

defineExpose({
  timer
})
</script>

