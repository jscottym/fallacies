<template>
  <div class="slide-content">
    <div v-if="roundPhase === 'intro'" class="text-center space-y-6">
      <div class="text-6xl mb-6">⚖️</div>
      <h1 class="text-4xl font-bold text-white">Fallacy Prosecution</h1>
      <p class="text-xl text-gray-400">Build sneaky arguments. Catch the tricks.</p>
      <div class="game-card max-w-2xl mx-auto text-left space-y-4">
        <h3 class="font-semibold text-white">How it works:</h3>
        <ol class="list-decimal list-inside text-gray-300 space-y-2">
          <li>Each team picks a topic (first-come, first-served!)</li>
          <li>Build an argument <strong>packed with fallacies</strong></li>
          <li>Other teams try to identify your tricks</li>
          <li>Points for sneaky fallacies AND for catching them!</li>
        </ol>
      </div>
    </div>

    <div v-else-if="roundPhase === 'topic_selection'" class="space-y-8">
      <div class="flex items-center justify-between">
        <h2 class="text-3xl font-bold text-white">Select Your Topics</h2>
        <Timer 
          v-if="timerActive"
          :remaining="timerRemaining"
          :show-controls="true"
          @extend="extendTimer"
          @stop="stopTimer"
        />
      </div>
      <p class="text-gray-400">First to pick claims it!</p>

      <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="topic in availableTopics"
          :key="topic.id"
          class="game-card"
          :class="getTopicClaimClass(topic.id)"
        >
          <div class="font-semibold text-white text-lg">{{ topic.name }}</div>
          <div v-if="isTopicClaimed(topic.id)" class="mt-2 text-sm">
            <UBadge :style="{ backgroundColor: getClaimingTeamColor(topic.id) + '30', color: getClaimingTeamColor(topic.id) }">
              Claimed by {{ getClaimingTeamName(topic.id) }}
            </UBadge>
          </div>
          <div v-else class="mt-2 text-sm text-gray-500">Available</div>
        </div>
      </div>

      <div class="text-center">
        <UButton 
          size="lg" 
          :disabled="!allTeamsSelected"
          @click="startBuilding"
        >
          All Topics Selected → Start Building
        </UButton>
      </div>
    </div>

    <div v-else-if="roundPhase === 'building'" class="space-y-8">
      <div class="flex items-center justify-between">
        <h2 class="text-3xl font-bold text-white">Build Your Arguments</h2>
        <Timer 
          v-if="timerActive"
          :remaining="timerRemaining"
          :show-controls="true"
          @extend="extendTimer"
          @stop="stopTimer"
        />
      </div>
      <p class="text-gray-400">All teams building simultaneously. Pack in those fallacies!</p>

      <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="team in sessionStore.teams"
          :key="team.id"
          class="game-card"
          :style="{ borderColor: team.color + '50' }"
        >
          <div class="font-semibold mb-2" :style="{ color: team.color }">{{ team.name }}</div>
          <div class="text-sm text-gray-400">{{ getTeamTopic(team.id) }}</div>
          <div class="mt-3 flex items-center gap-2">
            <div 
              class="h-2 flex-1 bg-gray-800 rounded-full overflow-hidden"
            >
              <div 
                class="h-full transition-all duration-300"
                :style="{ width: hasSubmitted(team.id) ? '100%' : '50%', backgroundColor: team.color }"
              ></div>
            </div>
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
          @click="startReviewing"
        >
          {{ allTeamsSubmitted ? 'Start Review Phase' : 'Waiting for submissions...' }}
        </UButton>
      </div>
    </div>

    <div v-else-if="roundPhase === 'reviewing'" class="space-y-8">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-2xl font-bold text-white">Review {{ currentReviewTeam?.name }}'s Argument</h2>
          <p class="text-gray-400">Topic: {{ getTeamTopic(currentReviewTeam?.id || '') }}</p>
        </div>
        <Timer 
          v-if="timerActive"
          :remaining="timerRemaining"
          :show-controls="true"
          @extend="extendTimer"
          @stop="stopTimer"
        />
      </div>

      <div class="game-card border-indigo-500/30">
        <p class="text-xl text-white leading-relaxed italic">
          "{{ currentReviewArgument }}"
        </p>
      </div>

      <div class="flex items-center justify-between">
        <span class="text-gray-400">Teams reviewing:</span>
        <span class="text-white">{{ reviewsSubmitted }} / {{ sessionStore.teams.length - 1 }}</span>
      </div>

      <div class="text-center">
        <UButton size="lg" @click="revealResults">
          <UIcon name="i-heroicons-eye" class="mr-2" />
          Reveal Results
        </UButton>
      </div>
    </div>

    <div v-else-if="roundPhase === 'scoring'" class="space-y-8">
      <h2 class="text-3xl font-bold text-white text-center">Results: {{ currentReviewTeam?.name }}</h2>

      <div class="game-card border-purple-500/30">
        <h3 class="font-semibold text-purple-400 mb-3">Fallacies Used</h3>
        <div class="flex flex-wrap gap-2">
          <UBadge 
            v-for="fallacyId in currentArgumentFallacies" 
            :key="fallacyId"
            color="purple"
            size="lg"
          >
            {{ getFallacyName(fallacyId) }}
          </UBadge>
        </div>
      </div>

      <div class="game-card">
        <h3 class="font-semibold text-white mb-4">Team Catches</h3>
        <div class="space-y-3">
          <div 
            v-for="team in reviewingTeams" 
            :key="team.id"
            class="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg"
          >
            <span :style="{ color: team.color }">{{ team.name }}</span>
            <div class="flex items-center gap-2">
              <span class="text-sm text-gray-400">
                {{ getTeamCatches(team.id) }} / {{ currentArgumentFallacies.length }} caught
              </span>
              <span class="font-bold text-green-400">
                +{{ calculateTeamPoints(team.id) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div class="text-center">
        <UButton size="lg" @click="nextReview">
          {{ hasMoreReviews ? 'Next Team\'s Argument' : 'View Final Scores' }}
        </UButton>
      </div>
    </div>

    <div v-else-if="roundPhase === 'final'" class="space-y-8 text-center">
      <div class="text-6xl mb-6">🏆</div>
      <h1 class="text-4xl font-bold text-white">Round Complete!</h1>

      <div class="flex justify-center gap-6">
        <div 
          v-for="(team, index) in sortedTeams" 
          :key="team.id"
          class="game-card w-48"
          :class="index === 0 ? 'border-yellow-500/50 scale-110' : ''"
        >
          <div class="text-4xl mb-2">{{ index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉' }}</div>
          <div class="font-bold text-xl" :style="{ color: team.color }">{{ team.name }}</div>
          <div class="text-3xl font-bold text-white mt-2">{{ scores[team.id] || 0 }}</div>
          <div class="text-sm text-gray-400">points</div>
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
import { ref, computed, watch, onMounted } from 'vue'
import { useGameStore } from '~/stores/game'
import { useSessionStore } from '~/stores/session'
import { useContentStore } from '~/stores/content'
import { useTimer } from '~/composables/useTimer'
import Timer from '~/components/game/Timer.vue'
import type { Team, ProsecutionRound } from '~/types'

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

const allTeamsSubmitted = computed(() => {
  if (!currentRound.value) return false
  return sessionStore.teams.every(t => currentRound.value?.arguments[t.id])
})

const currentReviewTargetIndex = computed(() => currentRound.value?.currentReviewTargetIndex || 0)

const currentReviewTeam = computed((): Team | undefined => {
  return sessionStore.teams[currentReviewTargetIndex.value]
})

const currentReviewArgument = computed(() => {
  if (!currentReviewTeam.value || !currentRound.value) return ''
  return currentRound.value.arguments[currentReviewTeam.value.id]?.text || ''
})

const currentArgumentFallacies = computed(() => {
  if (!currentReviewTeam.value || !currentRound.value) return []
  return currentRound.value.arguments[currentReviewTeam.value.id]?.fallaciesUsed || []
})

const reviewingTeams = computed(() => {
  return sessionStore.teams.filter(t => t.id !== currentReviewTeam.value?.id)
})

const reviewsSubmitted = computed(() => {
  if (!currentRound.value || !currentReviewTeam.value) return 0
  return currentRound.value.reviews.filter(
    r => r.targetTeamId === currentReviewTeam.value?.id
  ).length
})

const hasMoreReviews = computed(() => {
  return currentReviewTargetIndex.value < sessionStore.teams.length - 1
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
  gameStore.setHostContext('Topic Selection - Pick your topic!')
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
  return 'hover:border-indigo-500/50 cursor-pointer'
}

function getTeamTopic(teamId: string): string {
  if (!currentRound.value) return ''
  const topicId = currentRound.value.topicSelections[teamId]?.topicId
  return contentStore.getTopicById(topicId)?.name || 'Not selected'
}

function hasSubmitted(teamId: string): boolean {
  if (!currentRound.value) return false
  return !!currentRound.value.arguments[teamId]
}

function startBuilding() {
  if (!currentRound.value) return
  currentRound.value.phase = 'building'
  gameStore.saveState()
  timer.start(180)
  gameStore.setHostContext('Building Phase - Pack in those fallacies!')
}

function startReviewing() {
  if (!currentRound.value) return
  currentRound.value.phase = 'reviewing'
  currentRound.value.currentReviewTargetIndex = 0
  gameStore.saveState()
  timer.start(120)
  gameStore.setHostContext(`Reviewing ${currentReviewTeam.value?.name}'s argument`)
}

function getTeamCatches(teamId: string): number {
  if (!currentRound.value || !currentReviewTeam.value) return 0
  const review = currentRound.value.reviews.find(
    r => r.reviewingTeamId === teamId && r.targetTeamId === currentReviewTeam.value?.id
  )
  if (!review) return 0
  return review.identifiedFallacies.filter(f => currentArgumentFallacies.value.includes(f)).length
}

function calculateTeamPoints(teamId: string): number {
  const catches = getTeamCatches(teamId)
  const falsePositives = getFalsePositives(teamId)
  return Math.max(0, catches * 2 - falsePositives)
}

function getFalsePositives(teamId: string): number {
  if (!currentRound.value || !currentReviewTeam.value) return 0
  const review = currentRound.value.reviews.find(
    r => r.reviewingTeamId === teamId && r.targetTeamId === currentReviewTeam.value?.id
  )
  if (!review) return 0
  return review.identifiedFallacies.filter(f => !currentArgumentFallacies.value.includes(f)).length
}

function revealResults() {
  if (!currentRound.value) return
  currentRound.value.phase = 'scoring'
  
  const newScores = { ...scores.value }
  reviewingTeams.value.forEach(team => {
    newScores[team.id] = (newScores[team.id] || 0) + calculateTeamPoints(team.id)
  })
  
  const uncaughtFallacies = currentArgumentFallacies.value.filter(f => {
    const caughtCount = reviewingTeams.value.filter(t => {
      const review = currentRound.value?.reviews.find(
        r => r.reviewingTeamId === t.id && r.targetTeamId === currentReviewTeam.value?.id
      )
      return review?.identifiedFallacies.includes(f)
    }).length
    return caughtCount < reviewingTeams.value.length / 2
  })
  newScores[currentReviewTeam.value!.id] = (newScores[currentReviewTeam.value!.id] || 0) + uncaughtFallacies.length
  
  gameStore.updateGameData({ scores: newScores })
  timer.stop()
  gameStore.setHostContext(`Results: ${currentReviewTeam.value?.name}`)
}

function nextReview() {
  if (!currentRound.value) return
  
  if (hasMoreReviews.value) {
    currentRound.value.currentReviewTargetIndex++
    currentRound.value.phase = 'reviewing'
    gameStore.saveState()
    timer.start(120)
    gameStore.setHostContext(`Reviewing ${currentReviewTeam.value?.name}'s argument`)
  } else {
    currentRound.value.phase = 'final'
    gameStore.saveState()
    gameStore.setHostContext('Round Complete!')
  }
}

function startNewRound() {
  initRound()
  gameStore.nextStep()
}

function finishGame() {
  sessionStore.updateGameStatus('prosecution', 'completed')
  gameStore.endGame()
  navigateTo(`/host/lobby?code=${sessionStore.code}`)
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

