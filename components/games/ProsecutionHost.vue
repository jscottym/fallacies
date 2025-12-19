<template>
  <div class="slide-content">
    <div v-if="roundPhase === 'intro'" class="text-center space-y-6">
      <div class="text-6xl mb-6">⚖️</div>
      <h1 class="text-4xl font-bold text-white">Fallacy Prosecution</h1>
      <p class="text-xl text-neutral-400">Build sneaky arguments. Catch the tricks.</p>
      <div class="game-card max-w-2xl mx-auto text-left space-y-4">
        <h3 class="font-semibold text-white">How it works:</h3>
        <ol class="list-decimal list-inside text-neutral-300 space-y-2">
          <li>Each team picks a topic (first-come, first-served!)</li>
          <li>Build an argument <strong>packed with fallacies</strong></li>
          <li>All teams review each other's arguments simultaneously</li>
          <li>Points for sneaky fallacies AND for catching them!</li>
        </ol>
      </div>
    </div>

    <div v-else-if="roundPhase === 'topic_selection'" class="space-y-8">
      <div class="flex items-center justify-between">
        <h2 class="text-3xl font-bold text-white">Step 1: Select Your Topics</h2>
        <Timer 
          v-if="timerActive"
          :remaining="timerRemaining"
          :show-controls="true"
          @extend="extendTimer"
          @stop="stopTimer"
        />
      </div>
      <p class="text-neutral-400">First to pick claims it! Teams tap on their devices to claim a topic.</p>

      <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="topic in availableTopics"
          :key="topic.id"
          class="game-card"
          :class="getTopicClaimClass(topic.id)"
        >
          <div class="font-semibold text-white text-lg">{{ topic.name }}</div>
          <div class="text-sm text-neutral-400 mt-1">{{ topic.explanation }}</div>
          <div v-if="isTopicClaimed(topic.id)" class="mt-3">
            <UBadge :style="{ backgroundColor: getClaimingTeamColor(topic.id) + '30', color: getClaimingTeamColor(topic.id) }">
              Claimed by {{ getClaimingTeamName(topic.id) }}
            </UBadge>
          </div>
          <div v-else class="mt-3 text-sm text-neutral-500">Available</div>
        </div>
      </div>

      <div class="text-center">
        <UButton 
          size="lg" 
          :disabled="!allTeamsSelected"
          @click="startBuilding"
        >
          {{ allTeamsSelected ? 'All Topics Selected → Start Building' : `Waiting for ${teamsWithoutTopics} more team(s)...` }}
        </UButton>
      </div>
    </div>

    <div v-else-if="roundPhase === 'building'" class="space-y-8">
      <div class="flex items-center justify-between">
        <h2 class="text-3xl font-bold text-white">Step 2: Build Your Arguments</h2>
        <Timer 
          v-if="timerActive"
          :remaining="timerRemaining"
          :show-controls="true"
          @extend="extendTimer"
          @stop="stopTimer"
        />
      </div>
      <p class="text-neutral-400">All teams building simultaneously. Pack in those fallacies!</p>

      <div class="grid md:grid-cols-2 gap-6">
        <div
          v-for="team in sessionStore.teams"
          :key="team.id"
          class="game-card"
          :style="{ borderColor: team.color + '50' }"
        >
          <div class="font-semibold text-lg mb-2" :style="{ color: team.color }">{{ team.name }}</div>
          <div class="text-sm text-neutral-300 font-medium">{{ getTeamTopicName(team.id) }}</div>
          <div class="text-xs text-neutral-500 mt-1">{{ getTeamTopicExplanation(team.id) }}</div>
          <div class="text-sm text-indigo-400 mt-2">Position: {{ getTeamPosition(team.id) }}</div>
          <div class="mt-4 flex items-center gap-2">
            <div class="h-2 flex-1 bg-neutral-800 rounded-full overflow-hidden">
              <div 
                class="h-full transition-all duration-300"
                :class="hasSubmitted(team.id) ? 'bg-green-500' : 'bg-neutral-600'"
                :style="{ width: hasSubmitted(team.id) ? '100%' : '30%'}"
              ></div>
            </div>
            <span class="text-sm" :class="hasSubmitted(team.id) ? 'text-green-400' : 'text-neutral-500'">
              {{ hasSubmitted(team.id) ? '✓ Submitted' : 'Building...' }}
            </span>
          </div>
        </div>
      </div>

      <div class="text-center">
        <UButton 
          size="lg" 
          :disabled="!allTeamsSubmitted"
          @click="startAllReviewing"
        >
          {{ allTeamsSubmitted ? 'All Arguments Submitted → Start Review Phase' : `Waiting for ${teamsWithoutArguments} more team(s)...` }}
        </UButton>
      </div>
    </div>

    <div v-else-if="roundPhase === 'all_reviewing'" class="space-y-8">
      <div class="flex items-center justify-between">
        <h2 class="text-3xl font-bold text-white">Step 3: Review All Arguments</h2>
        <Timer 
          v-if="timerActive"
          :remaining="timerRemaining"
          :show-controls="true"
          @extend="extendTimer"
          @stop="stopTimer"
        />
      </div>
      <p class="text-neutral-400">All teams are reviewing each other's arguments simultaneously. Teams identify the fallacies they think were used.</p>

      <div class="grid md:grid-cols-2 gap-6">
        <div
          v-for="team in sessionStore.teams"
          :key="team.id"
          class="game-card"
          :style="{ borderColor: team.color + '30' }"
        >
          <div class="font-semibold mb-2" :style="{ color: team.color }">{{ team.name }}'s Argument</div>
          <div class="text-xs text-neutral-500 mb-2">Topic: {{ getTeamTopicName(team.id) }}</div>
          <p class="text-sm text-neutral-300 italic line-clamp-3">"{{ getTeamArgument(team.id) }}"</p>
          <div class="mt-3 flex items-center justify-between text-xs text-neutral-400">
            <span>Reviews received:</span>
            <span class="font-medium text-white">{{ getReviewCountForTeam(team.id) }} / {{ sessionStore.teams.length - 1 }}</span>
          </div>
        </div>
      </div>

      <div class="game-card text-center">
        <div class="text-lg font-semibold text-white mb-2">Review Progress</div>
        <div class="text-3xl font-bold text-indigo-400">{{ totalReviewsSubmitted }} / {{ totalReviewsExpected }}</div>
        <div class="text-sm text-neutral-400 mt-1">reviews submitted</div>
      </div>

      <div class="text-center">
        <UButton 
          size="lg" 
          :disabled="!allReviewsComplete"
          @click="startReveal"
        >
          {{ allReviewsComplete ? 'All Reviews In → Reveal Results' : 'Waiting for reviews...' }}
        </UButton>
        <UButton 
          v-if="!allReviewsComplete && totalReviewsSubmitted > 0"
          variant="soft"
          class="ml-3"
          @click="startReveal"
        >
          Skip Waiting
        </UButton>
      </div>
    </div>

    <div v-else-if="roundPhase === 'reveal'" class="space-y-8">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-2xl font-bold text-white">Results: {{ currentRevealTeam?.name }}</h2>
          <p class="text-neutral-400">{{ currentRevealIndex + 1 }} of {{ sessionStore.teams.length }} teams</p>
        </div>
        <div class="flex items-center gap-2">
          <UButton 
            v-if="currentRevealIndex > 0"
            variant="ghost" 
            size="sm"
            @click="prevReveal"
          >
            <UIcon name="i-heroicons-arrow-left" />
          </UButton>
          <UButton 
            v-if="hasMoreReveals"
            variant="ghost" 
            size="sm"
            @click="nextReveal"
          >
            <UIcon name="i-heroicons-arrow-right" />
          </UButton>
        </div>
      </div>

      <div class="game-card border-indigo-500/30">
        <div class="flex items-center justify-between mb-2">
          <div class="text-xs text-neutral-500 uppercase tracking-wide">Argument</div>
          <div class="text-xs text-neutral-500">Topic: {{ getTeamTopicName(currentRevealTeam?.id || '') }}</div>
        </div>
        <p class="text-neutral-100 leading-relaxed italic">"{{ currentRevealArgument }}"</p>
      </div>

      <div class="game-card border-purple-500/30">
        <h3 class="font-semibold text-purple-400 mb-3">Fallacies They Used</h3>
        <div class="flex flex-wrap gap-2">
          <UBadge 
            v-for="fallacyId in currentRevealFallacies" 
            :key="fallacyId"
            class="border border-purple-500/40 bg-purple-500/10 text-purple-300"
            size="lg"
          >
            {{ getFallacyName(fallacyId) }}
          </UBadge>
          <span v-if="currentRevealFallacies.length === 0" class="text-neutral-500 text-sm">No fallacies declared</span>
        </div>
      </div>

      <div class="game-card">
        <h3 class="font-semibold text-white mb-4">What Other Teams Guessed</h3>
        <div class="space-y-4">
          <div 
            v-for="team in getReviewingTeamsFor(currentRevealTeam?.id || '')" 
            :key="team.id"
            class="p-3 bg-neutral-800/50 rounded-lg"
          >
            <div class="flex items-center justify-between mb-2">
              <span class="font-medium" :style="{ color: team.color }">{{ team.name }}</span>
              <div class="text-right">
                <div class="text-xs text-neutral-400">
                  Caught {{ getTeamCatches(team.id, currentRevealTeam?.id || '') }} / {{ currentRevealFallacies.length }} ·
                  False positives {{ getFalsePositives(team.id, currentRevealTeam?.id || '') }}
                </div>
                <div class="text-lg font-bold text-green-400">
                  +{{ calculateCatchPoints(team.id, currentRevealTeam?.id || '') }}
                </div>
              </div>
            </div>
            <div class="flex flex-wrap gap-2">
              <UBadge
                v-for="fallacyId in getTeamGuesses(team.id, currentRevealTeam?.id || '')"
                :key="fallacyId"
                size="sm"
                :class="currentRevealFallacies.includes(fallacyId)
                  ? 'border border-green-500/60 bg-green-500/10 text-green-300'
                  : 'border border-red-500/60 bg-red-500/10 text-red-300'"
              >
                {{ getFallacyName(fallacyId) }}
              </UBadge>
              <span v-if="getTeamGuesses(team.id, currentRevealTeam?.id || '').length === 0" class="text-neutral-500 text-sm">No guesses submitted</span>
            </div>
          </div>
        </div>
      </div>

      <div class="text-center space-x-3">
        <UButton 
          v-if="hasMoreReveals"
          size="lg" 
          @click="nextReveal"
        >
          Next Team's Results
          <UIcon name="i-heroicons-arrow-right" class="ml-2" />
        </UButton>
        <UButton 
          v-if="hasMoreReveals && sessionStore.teams.length > 2"
          variant="soft"
          size="lg"
          @click="finishReveals"
        >
          Skip to Final Scores
        </UButton>
        <UButton 
          v-if="!hasMoreReveals"
          size="lg"
          color="primary"
          @click="finishReveals"
        >
          View Final Scores
        </UButton>
      </div>
    </div>

    <div v-else-if="roundPhase === 'final'" class="space-y-8 text-center">
      <div class="text-6xl mb-6">🏆</div>
      <h1 class="text-4xl font-bold text-white">Round Complete!</h1>

      <div class="flex justify-center gap-6 flex-wrap">
        <div 
          v-for="(team, index) in sortedTeams" 
          :key="team.id"
          class="game-card w-48"
          :class="index === 0 ? 'border-yellow-500/50 scale-110' : ''"
        >
          <div class="text-4xl mb-2">{{ index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏅' }}</div>
          <div class="font-bold text-xl" :style="{ color: team.color }">{{ team.name }}</div>
          <div class="text-3xl font-bold text-white mt-2">{{ scores[team.id] || 0 }}</div>
          <div class="text-sm text-neutral-400">points</div>
        </div>
      </div>

      <div class="flex justify-center gap-4">
        <UButton variant="soft" @click="startNewRound">
          Play Another Round
        </UButton>
        <UButton color="primary" @click="finishGame">
          Finish Game
        </UButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import Timer from '~/components/game/Timer.vue'
import { useTimer } from '~/composables/useTimer'
import { useContentStore } from '~/stores/content'
import { useGameStore } from '~/stores/game'
import { useSessionStore } from '~/stores/session'
import type { ProsecutionRound, Team } from '~/types'

const gameStore = useGameStore()
const sessionStore = useSessionStore()
const contentStore = useContentStore()
const timer = useTimer()

const roundPhase = computed(() => {
  if (gameStore.step === 0) return 'intro'
  const rounds = (gameStore.gameData.rounds as ProsecutionRound[]) || []
  const currentRound = rounds[rounds.length - 1]
  return currentRound?.phase || 'intro'
})

const currentRound = computed((): ProsecutionRound | undefined => {
  const rounds = (gameStore.gameData.rounds as ProsecutionRound[]) || []
  return rounds[rounds.length - 1]
})

const availableTopics = computed(() => {
  const ids = (gameStore.gameData.availableTopicIds as string[]) || contentStore.topics.map(t => t.id)
  return contentStore.topics.filter(t => ids.includes(t.id))
})

const timerActive = computed(() => timer.isActive.value)
const timerRemaining = computed(() => timer.remaining.value)

const scores = computed(() => (gameStore.gameData.scores as Record<string, number>) || {})

const allTeamsSelected = computed(() => {
  if (!currentRound.value) return false
  return sessionStore.teams.every(t => currentRound.value?.topicSelections[t.id])
})

const teamsWithoutTopics = computed(() => {
  if (!currentRound.value) return sessionStore.teams.length
  return sessionStore.teams.filter(t => !currentRound.value?.topicSelections[t.id]).length
})

const allTeamsSubmitted = computed(() => {
  if (!currentRound.value) return false
  return sessionStore.teams.every(t => currentRound.value?.arguments[t.id])
})

const teamsWithoutArguments = computed(() => {
  if (!currentRound.value) return sessionStore.teams.length
  return sessionStore.teams.filter(t => !currentRound.value?.arguments[t.id]).length
})

const totalReviewsExpected = computed(() => {
  const teamCount = sessionStore.teams.length
  return teamCount * (teamCount - 1)
})

const totalReviewsSubmitted = computed(() => {
  if (!currentRound.value) return 0
  return currentRound.value.reviews.length
})

const allReviewsComplete = computed(() => {
  return totalReviewsSubmitted.value >= totalReviewsExpected.value
})

const currentRevealIndex = computed(() => currentRound.value?.currentRevealIndex || 0)

const currentRevealTeam = computed((): Team | undefined => {
  return sessionStore.teams[currentRevealIndex.value]
})

const currentRevealArgument = computed(() => {
  if (!currentRevealTeam.value || !currentRound.value) return ''
  return currentRound.value.arguments[currentRevealTeam.value.id]?.text || ''
})

const currentRevealFallacies = computed(() => {
  if (!currentRevealTeam.value || !currentRound.value) return []
  return currentRound.value.arguments[currentRevealTeam.value.id]?.fallaciesUsed || []
})

const hasMoreReveals = computed(() => {
  return currentRevealIndex.value < sessionStore.teams.length - 1
})

const sortedTeams = computed(() => {
  return [...sessionStore.teams].sort((a, b) => (scores.value[b.id] || 0) - (scores.value[a.id] || 0))
})

onMounted(() => {
  if (gameStore.step === 0) {
    gameStore.setHostContext('Fallacy Prosecution - Introduction')
  }
})

watch(() => gameStore.step, () => {
  if (gameStore.step === 1 && !currentRound.value) {
    initRound()
  }
})

function initRound() {
  const topicIds = contentStore.topics.map(t => t.id)
  const teamIds = sessionStore.teams.map(t => t.id)
  gameStore.initProsecutionRound(topicIds, teamIds)
  timer.start(60)
  gameStore.setHostContext('Step 1: Topic Selection')
}

function isTopicClaimed(topicId: string): boolean {
  if (!currentRound.value) return false
  return Object.values(currentRound.value.topicSelections).some(s => s.topicId === topicId)
}

function getClaimingTeamId(topicId: string): string | undefined {
  if (!currentRound.value) return undefined
  const entry = Object.entries(currentRound.value.topicSelections).find(([_, s]) => s.topicId === topicId)
  return entry?.[0]
}

function getClaimingTeamName(topicId: string): string {
  const teamId = getClaimingTeamId(topicId)
  return sessionStore.teams.find(t => t.id === teamId)?.name || ''
}

function getClaimingTeamColor(topicId: string): string {
  const teamId = getClaimingTeamId(topicId)
  return sessionStore.teams.find(t => t.id === teamId)?.color || '#6366f1'
}

function getTopicClaimClass(topicId: string): string {
  if (isTopicClaimed(topicId)) {
    return 'opacity-75'
  }
  return 'hover:border-indigo-500/50'
}

function getTeamTopicId(teamId: string): string | undefined {
  if (!currentRound.value) return undefined
  return currentRound.value.topicSelections[teamId]?.topicId
}

function getTeamTopicName(teamId: string): string {
  const topicId = getTeamTopicId(teamId)
  if (!topicId) return 'Not selected'
  return contentStore.getTopicById(topicId)?.name || 'Unknown'
}

function getTeamTopicExplanation(teamId: string): string {
  const topicId = getTeamTopicId(teamId)
  if (!topicId) return ''
  return contentStore.getTopicById(topicId)?.explanation || ''
}

function getTeamPosition(teamId: string): string {
  const topicId = getTeamTopicId(teamId)
  if (!topicId) return ''
  const topic = contentStore.getTopicById(topicId)
  return topic?.positionA.label || ''
}

function getTeamArgument(teamId: string): string {
  if (!currentRound.value) return ''
  return currentRound.value.arguments[teamId]?.text || ''
}

function hasSubmitted(teamId: string): boolean {
  if (!currentRound.value) return false
  return !!currentRound.value.arguments[teamId]
}

function getReviewCountForTeam(targetTeamId: string): number {
  if (!currentRound.value) return 0
  return currentRound.value.reviews.filter(r => r.targetTeamId === targetTeamId).length
}

function getReviewingTeamsFor(targetTeamId: string): Team[] {
  return sessionStore.teams.filter(t => t.id !== targetTeamId)
}

function getTeamGuesses(reviewingTeamId: string, targetTeamId: string): string[] {
  if (!currentRound.value) return []
  const review = currentRound.value.reviews.find(
    r => r.reviewingTeamId === reviewingTeamId && r.targetTeamId === targetTeamId
  )
  return review?.identifiedFallacies || []
}

function getTeamCatches(reviewingTeamId: string, targetTeamId: string): number {
  const guesses = getTeamGuesses(reviewingTeamId, targetTeamId)
  const actual = currentRound.value?.arguments[targetTeamId]?.fallaciesUsed || []
  return guesses.filter(g => actual.includes(g)).length
}

function getFalsePositives(reviewingTeamId: string, targetTeamId: string): number {
  const guesses = getTeamGuesses(reviewingTeamId, targetTeamId)
  const actual = currentRound.value?.arguments[targetTeamId]?.fallaciesUsed || []
  return guesses.filter(g => !actual.includes(g)).length
}

function calculateCatchPoints(reviewingTeamId: string, targetTeamId: string): number {
  const catches = getTeamCatches(reviewingTeamId, targetTeamId)
  const falsePos = getFalsePositives(reviewingTeamId, targetTeamId)
  return Math.max(0, catches * 2 - falsePos)
}

function startBuilding() {
  if (!currentRound.value) return
  currentRound.value.phase = 'building'
  gameStore.updateGameData({ rounds: [...(gameStore.gameData.rounds as ProsecutionRound[])] })
  timer.start(180)
  gameStore.setHostContext('Step 2: Build Your Arguments')
}

function startAllReviewing() {
  if (!currentRound.value) return
  currentRound.value.phase = 'all_reviewing'
  gameStore.updateGameData({ rounds: [...(gameStore.gameData.rounds as ProsecutionRound[])] })
  timer.start(180)
  gameStore.setHostContext('Step 3: Review All Arguments')
}

function startReveal() {
  if (!currentRound.value) return
  currentRound.value.phase = 'reveal'
  currentRound.value.currentRevealIndex = 0
  calculateAllScores()
  gameStore.updateGameData({ rounds: [...(gameStore.gameData.rounds as ProsecutionRound[])] })
  timer.stop()
  gameStore.setHostContext(`Results: ${currentRevealTeam.value?.name}`)
}

function calculateAllScores() {
  if (!currentRound.value) return
  
  const newScores = { ...scores.value }
  
  sessionStore.teams.forEach(targetTeam => {
    const targetFallacies = currentRound.value?.arguments[targetTeam.id]?.fallaciesUsed || []
    
    sessionStore.teams.forEach(reviewingTeam => {
      if (reviewingTeam.id === targetTeam.id) return
      const points = calculateCatchPoints(reviewingTeam.id, targetTeam.id)
      newScores[reviewingTeam.id] = (newScores[reviewingTeam.id] || 0) + points
    })
    
    const uncaughtFallacies = targetFallacies.filter(f => {
      const catchCount = sessionStore.teams.filter(t => {
        if (t.id === targetTeam.id) return false
        const guesses = getTeamGuesses(t.id, targetTeam.id)
        return guesses.includes(f)
      }).length
      const reviewingTeamCount = sessionStore.teams.length - 1
      return catchCount < reviewingTeamCount / 2
    })
    newScores[targetTeam.id] = (newScores[targetTeam.id] || 0) + uncaughtFallacies.length
  })
  
  gameStore.updateGameData({ scores: newScores })
}

function nextReveal() {
  if (!currentRound.value || !hasMoreReveals.value) return
  currentRound.value.currentRevealIndex++
  gameStore.updateGameData({ rounds: [...(gameStore.gameData.rounds as ProsecutionRound[])] })
  gameStore.setHostContext(`Results: ${currentRevealTeam.value?.name}`)
}

function prevReveal() {
  if (!currentRound.value || currentRevealIndex.value <= 0) return
  currentRound.value.currentRevealIndex--
  gameStore.updateGameData({ rounds: [...(gameStore.gameData.rounds as ProsecutionRound[])] })
  gameStore.setHostContext(`Results: ${currentRevealTeam.value?.name}`)
}

function finishReveals() {
  if (!currentRound.value) return
  currentRound.value.phase = 'final'
  gameStore.updateGameData({ rounds: [...(gameStore.gameData.rounds as ProsecutionRound[])] })
  gameStore.setHostContext('Round Complete!')
}

function startNewRound() {
  initRound()
  gameStore.nextStep()
}

function finishGame() {
  sessionStore.updateGameStatus('prosecution', 'completed')
  gameStore.endGame()
  navigateTo(`/host/${sessionStore.code}`)
}

function getFallacyName(id: string): string {
  return contentStore.getFallacyById(id)?.name || id
}

function extendTimer(seconds: number) {
  timer.extend(seconds)
}

function stopTimer() {
  timer.stop()
}
</script>
