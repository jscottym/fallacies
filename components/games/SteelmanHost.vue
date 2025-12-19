<template>
  <div class="slide-content">
    <div v-if="phase === 'intro'" class="text-center space-y-6">
      <div class="text-6xl mb-6">🛡️</div>
      <h1 class="text-4xl font-bold text-white">Steelman Showdown</h1>
      <p class="text-xl text-gray-400">Now argue the OTHER side—with sound logic!</p>
      <div class="game-card max-w-2xl mx-auto text-left space-y-4">
        <h3 class="font-semibold text-white">The Challenge:</h3>
        <ol class="list-decimal list-inside text-gray-300 space-y-2">
          <li>You'll argue the <strong>opposite</strong> position from before</li>
          <li>Use antidotes and sound reasoning—<strong>no fallacies!</strong></li>
          <li>Others will judge: Was it more persuasive than the fallacious version?</li>
        </ol>
      </div>
    </div>

    <div v-else-if="phase === 'building'" class="space-y-8">
      <div class="flex items-center justify-between">
        <h2 class="text-3xl font-bold text-white">Build Sound Arguments</h2>
        <Timer 
          v-if="timerActive"
          :remaining="timerRemaining"
          :show-controls="true"
          @extend="extendTimer"
          @stop="stopTimer"
        />
      </div>
      <p class="text-gray-400">Use antidotes. No fallacies. Make it compelling!</p>

      <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="team in sessionStore.teams"
          :key="team.id"
          class="game-card"
          :style="{ borderColor: team.color + '50' }"
        >
          <div class="font-semibold mb-2" :style="{ color: team.color }">{{ team.name }}</div>
          <div class="text-sm text-gray-400">{{ getTeamTopic(team.id) }}</div>
          <div class="text-xs text-green-400 mt-1">Arguing: {{ getOppositePosition(team.id) }}</div>
          <div class="mt-3 flex items-center gap-2">
            <span class="text-sm" :class="hasSubmitted(team.id) ? 'text-green-400' : 'text-gray-500'">
              {{ hasSubmitted(team.id) ? '✓ Submitted' : 'Building...' }}
            </span>
          </div>
        </div>
      </div>

      <div class="text-center">
        <UButton 
          size="lg" 
          :disabled="!allTeamsSubmitted"
          @click="startComparison"
        >
          {{ allTeamsSubmitted ? 'Compare Arguments' : 'Waiting for submissions...' }}
        </UButton>
      </div>
    </div>

    <div v-else-if="phase === 'comparison'" class="space-y-8">
      <h2 class="text-3xl font-bold text-white text-center">{{ currentComparisonTeam?.name }}: Compare</h2>
      
      <div class="grid md:grid-cols-2 gap-6">
        <div class="game-card border-red-500/30">
          <h3 class="text-lg font-semibold text-red-400 mb-3">❌ Fallacious Version</h3>
          <p class="text-gray-300 italic text-sm">"{{ getFallaciousArgument(currentComparisonTeam?.id || '') }}"</p>
        </div>
        <div class="game-card border-green-500/30">
          <h3 class="text-lg font-semibold text-green-400 mb-3">✓ Steelmanned Version</h3>
          <p class="text-gray-300 italic text-sm">"{{ getSteelmanArgument(currentComparisonTeam?.id || '') }}"</p>
        </div>
      </div>

      <div class="text-center space-y-4">
        <p class="text-gray-400">Which was more persuasive?</p>
        <div class="flex justify-center gap-4">
          <div class="text-center">
            <div class="text-3xl font-bold text-red-400">{{ fallaciousVotes }}</div>
            <div class="text-sm text-gray-500">Fallacious</div>
          </div>
          <div class="text-center">
            <div class="text-3xl font-bold text-green-400">{{ steelmanVotes }}</div>
            <div class="text-sm text-gray-500">Steelmanned</div>
          </div>
        </div>
        <UButton size="lg" @click="nextComparison">
          {{ hasMoreComparisons ? 'Next Team' : 'View Results' }}
        </UButton>
      </div>
    </div>

    <div v-else-if="phase === 'results'" class="space-y-8 text-center">
      <div class="text-6xl mb-6">🏆</div>
      <h1 class="text-4xl font-bold text-white">Steelman Showdown Complete!</h1>
      
      <div class="game-card max-w-xl mx-auto">
        <h3 class="font-semibold text-white mb-4">Key Insight</h3>
        <p class="text-gray-300">
          Sound arguments often feel more persuasive because they're credible, show understanding, 
          and invite genuine engagement rather than defensiveness.
        </p>
      </div>

      <UButton color="primary" @click="finishGame">
        Continue to Next Game
      </UButton>
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
import type { Team, SteelmanRound, ProsecutionRound } from '~/types'

const gameStore = useGameStore()
const sessionStore = useSessionStore()
const contentStore = useContentStore()
const timer = useTimer()

const phase = ref('intro')
const currentComparisonIndex = ref(0)

const timerActive = computed(() => timer.isActive.value)
const timerRemaining = computed(() => timer.remaining.value)

const currentRound = computed((): SteelmanRound | undefined => {
  const rounds = (gameStore.gameData.rounds as SteelmanRound[]) || []
  return rounds[rounds.length - 1]
})

const prosecutionData = computed(() => {
  const storage = useStorage()
  return storage.getGameState(gameStore.sessionCode, 'prosecution')
})

const allTeamsSubmitted = computed(() => {
  if (!currentRound.value) return false
  return sessionStore.teams.every(t => currentRound.value?.arguments[t.id])
})

const currentComparisonTeam = computed((): Team | undefined => {
  return sessionStore.teams[currentComparisonIndex.value]
})

const hasMoreComparisons = computed(() => {
  return currentComparisonIndex.value < sessionStore.teams.length - 1
})

const fallaciousVotes = computed(() => {
  if (!currentRound.value || !currentComparisonTeam.value) return 0
  return Object.values(currentRound.value.persuasionVotes || {})
    .filter(v => v === 'fallacious').length
})

const steelmanVotes = computed(() => {
  if (!currentRound.value || !currentComparisonTeam.value) return 0
  return Object.values(currentRound.value.persuasionVotes || {})
    .filter(v => v === 'steelman').length
})

onMounted(() => {
  gameStore.setHostContext('Steelman Showdown - Introduction')
})

function getTeamTopic(teamId: string): string {
  const prosRounds = (prosecutionData.value as any)?.rounds as ProsecutionRound[] | undefined
  if (!prosRounds || prosRounds.length === 0) return 'TBD'
  const lastRound = prosRounds[prosRounds.length - 1]
  const topicId = lastRound.topicSelections[teamId]?.topicId
  return contentStore.getTopicById(topicId)?.name || 'TBD'
}

function getOppositePosition(teamId: string): string {
  const prosRounds = (prosecutionData.value as any)?.rounds as ProsecutionRound[] | undefined
  if (!prosRounds || prosRounds.length === 0) return ''
  const lastRound = prosRounds[prosRounds.length - 1]
  const topicId = lastRound.topicSelections[teamId]?.topicId
  const topic = contentStore.getTopicById(topicId)
  return topic?.positionB.label || ''
}

function hasSubmitted(teamId: string): boolean {
  if (!currentRound.value) return false
  return !!currentRound.value.arguments[teamId]
}

function getFallaciousArgument(teamId: string): string {
  const prosRounds = (prosecutionData.value as any)?.rounds as ProsecutionRound[] | undefined
  if (!prosRounds || prosRounds.length === 0) return ''
  const lastRound = prosRounds[prosRounds.length - 1]
  return lastRound.arguments[teamId]?.text || 'No argument recorded'
}

function getSteelmanArgument(teamId: string): string {
  if (!currentRound.value) return ''
  return currentRound.value.arguments[teamId]?.text || ''
}

function startBuilding() {
  phase.value = 'building'
  const newRound: SteelmanRound = {
    roundNumber: 1,
    phase: 'building',
    arguments: {},
    reviews: [],
    persuasionVotes: {},
    currentReviewTargetIndex: 0
  }
  gameStore.updateGameData({ rounds: [newRound] })
  timer.start(180)
  gameStore.setHostContext('Building Sound Arguments')
}

function startComparison() {
  phase.value = 'comparison'
  currentComparisonIndex.value = 0
  timer.stop()
  gameStore.setHostContext(`Comparing ${currentComparisonTeam.value?.name}'s arguments`)
}

function nextComparison() {
  if (hasMoreComparisons.value) {
    currentComparisonIndex.value++
    gameStore.setHostContext(`Comparing ${currentComparisonTeam.value?.name}'s arguments`)
  } else {
    phase.value = 'results'
    gameStore.setHostContext('Steelman Showdown Complete!')
  }
}

function finishGame() {
  sessionStore.updateGameStatus('steelman', 'completed')
  gameStore.endGame()
  navigateTo(`/host/lobby?code=${sessionStore.code}`)
}

function extendTimer(seconds: number) {
  timer.extend(seconds)
}

function stopTimer() {
  timer.stop()
}

import { useStorage } from '~/composables/useStorage'
</script>

