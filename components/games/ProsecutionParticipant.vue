<template>
  <div class="h-full flex flex-col p-4">
    <div v-if="roundPhase === 'intro'" class="flex-1 flex items-center justify-center">
      <div class="text-center space-y-4">
        <div class="text-5xl">⚖️</div>
        <h2 class="text-xl font-bold text-white">Fallacy Prosecution</h2>
        <p class="text-neutral-400">Get ready to build sneaky arguments!</p>
      </div>
    </div>

    <div v-else-if="roundPhase === 'topic_selection'" class="flex-1 flex flex-col">
      <h3 class="font-semibold text-white mb-2">Step 1: Pick Your Topic</h3>
      <p class="text-sm text-neutral-400 mb-4">First to pick wins! Tap fast!</p>
      
      <div class="space-y-3 flex-1 overflow-y-auto">
        <button
          v-for="topic in availableTopics"
          :key="topic.id"
          class="w-full p-4 rounded-lg border transition-all text-left"
          :class="getTopicButtonClass(topic.id)"
          :disabled="isTopicClaimed(topic.id) && !isOurTopic(topic.id)"
          @click="selectTopic(topic.id)"
        >
          <div class="font-medium text-white">{{ topic.name }}</div>
          <div class="text-xs text-neutral-400 mt-1">{{ topic.explanation }}</div>
          <div v-if="isTopicClaimed(topic.id)" class="text-sm mt-2">
            <span v-if="isOurTopic(topic.id)" class="text-green-400">✓ Your selection</span>
            <span v-else class="text-neutral-500">Claimed</span>
          </div>
        </button>
      </div>
    </div>

    <div v-else-if="roundPhase === 'building'" class="flex-1 flex flex-col">
      <div class="mb-4">
        <div class="text-xs text-neutral-500 uppercase tracking-wide">Step 2: Build Your Argument</div>
        <div class="font-semibold text-white text-lg mt-1">{{ ourTopicName }}</div>
        <div class="text-xs text-neutral-400 mt-1">{{ ourTopicExplanation }}</div>
        <div class="text-sm text-indigo-400 mt-2 font-medium">Your Position: {{ ourPosition }}</div>
      </div>

      <div class="flex-1 flex flex-col gap-2">
        <div class="flex items-end gap-2 justify-between w-full">
          <label class="text-sm text-neutral-400">Your Argument (pack in fallacies!)</label>
          <UButton
              variant="soft"
              :disabled="hasSubmitted"
              @click="openAiSuggest"
            >
              <UIcon name="i-heroicons-sparkles" class="mr-1" />
              AI Suggest
            </UButton>
        </div>
        <textarea
          v-model="argumentText"
          class="flex-1 bg-neutral-800 border border-neutral-700 rounded-lg p-3 text-white resize-none focus:border-indigo-500 focus:outline-none min-h-[120px]"
          placeholder="Write your fallacy-packed argument here..."
          :disabled="hasSubmitted"
        ></textarea>

        <div class="mt-4">
          <div class="text-sm text-neutral-400 mb-2">Fallacies Used (select at least 2)</div>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="fallacy in contentStore.fallacies"
              :key="fallacy.id"
              class="px-3 py-1.5 rounded-full text-sm border transition-all"
              :class="selectedFallacies.includes(fallacy.id)
                ? 'border-indigo-500 bg-indigo-500/20 text-white'
                : 'border-neutral-700 text-neutral-400 hover:border-neutral-600'"
              :disabled="hasSubmitted"
              @click="toggleFallacy(fallacy.id)"
            >
              <span class="flex flex-col items-start">
                <span class="text-xs font-semibold">{{ fallacy.name }}</span>
                <span class="text-[11px] text-neutral-400">"{{ fallacy.nickname }}"</span>
              </span>
            </button>
          </div>
        </div>

        <div class="mt-4 flex gap-2">
          
          <UButton 
            color="primary" 
            class="flex-1"
            :disabled="!canSubmit || hasSubmitted"
            @click="submitArgument"
          >
            {{ hasSubmitted ? 'Submitted ✓' : 'Submit' }}
          </UButton>
        </div>
      </div>
    </div>

    <div v-else-if="roundPhase === 'all_reviewing'" class="flex-1 flex flex-col">
      <div class="mb-4">
        <div class="text-xs text-neutral-500 uppercase tracking-wide">Step 3: Review Other Teams</div>
        <div class="text-sm text-neutral-400 mt-1">Identify the fallacies in each team's argument</div>
      </div>

      <div class="flex-1 overflow-y-auto space-y-4">
        <div
          v-for="team in otherTeams"
          :key="team.id"
          class="game-card"
          :class="hasReviewedTeam(team.id) ? 'border-green-500/30' : 'border-neutral-700'"
        >
          <div class="flex items-center justify-between mb-2">
            <span class="font-semibold" :style="{ color: team.color }">{{ team.name }}</span>
            <span v-if="hasReviewedTeam(team.id)" class="text-green-400 text-sm">✓ Reviewed</span>
          </div>
          <div class="text-xs text-neutral-500 mb-2">Topic: {{ getTeamTopicName(team.id) }}</div>
          <p class="text-sm text-neutral-300 italic mb-3">"{{ getTeamArgument(team.id) }}"</p>
          
          <div v-if="!hasReviewedTeam(team.id)">
            <div class="text-xs text-neutral-400 mb-2">Which fallacies did they use?</div>
            <div class="flex flex-wrap gap-1.5 mb-3">
              <button
                v-for="fallacy in contentStore.fallacies"
                :key="fallacy.id"
                class="px-2 py-1 rounded text-xs border transition-all"
                :class="getReviewSelection(team.id).includes(fallacy.id)
                  ? 'border-indigo-500 bg-indigo-500/20 text-white'
                  : 'border-neutral-700 text-neutral-400 hover:border-neutral-600'"
                @click="toggleReviewFallacy(team.id, fallacy.id)"
              >
                <span class="flex flex-col items-start">
                  <span class="text-[11px] font-semibold">{{ fallacy.name }}</span>
                  <span class="text-[10px] text-neutral-400">"{{ fallacy.nickname }}"</span>
                </span>
              </button>
            </div>
            <UButton 
              size="sm"
              color="primary"
              :disabled="getReviewSelection(team.id).length === 0"
              @click="submitReviewForTeam(team.id)"
            >
              Submit Review
            </UButton>
          </div>
        </div>
      </div>

      <div class="mt-4 text-center text-sm text-neutral-400">
        Reviewed {{ reviewedCount }} / {{ otherTeams.length }} teams
      </div>
    </div>

    <div v-else-if="roundPhase === 'reveal'" class="flex-1 flex items-center justify-center">
      <div class="text-center space-y-4">
        <UIcon name="i-heroicons-presentation-chart-bar" class="text-5xl text-indigo-500" />
        <h3 class="text-xl font-bold text-white">Results Being Revealed</h3>
        <p class="text-neutral-400">Watch the host screen to see how everyone did!</p>
      </div>
    </div>

    <div v-else class="flex-1 flex items-center justify-center">
      <div class="text-center space-y-4">
        <div class="text-5xl">🏆</div>
        <h2 class="text-xl font-bold text-white">Round Complete!</h2>
        <div class="text-3xl font-bold text-indigo-400">{{ teamScore }} points</div>
      </div>
    </div>

    <UModal
      v-model:open="showAiSuggest"
      title="AI Suggestions"
      description="Describe what you want to argue, then pick one or more fallacies for the AI to weave in."
    >
      <template #body>
        <div class="space-y-4">
          <div class="space-y-2">
            <div class="text-sm text-neutral-400">What do you want to argue?</div>
            <textarea
              v-model="aiPositionText"
              class="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-2 text-sm text-white resize-none h-20 focus:border-indigo-500 focus:outline-none"
            ></textarea>
            <div class="text-xs text-neutral-500">
              Using topic: <span class="text-neutral-300">{{ ourTopicName }}</span>
            </div>
          </div>

          <div class="space-y-2">
            <div class="text-sm text-neutral-400">Fallacies to include</div>
            <div class="flex flex-wrap gap-2">
              <UButton
                v-for="fallacy in contentStore.fallacies"
                :key="fallacy.id"
                size="sm"
                variant="soft"
                :class="aiSelectedFallacies.includes(fallacy.id)
                  ? 'bg-indigo-500/20 text-white'
                  : 'bg-neutral-800 text-neutral-300'"
                @click="toggleAiFallacy(fallacy.id)"
              >
                <span class="flex flex-col items-start">
                  <span class="text-xs font-semibold">{{ fallacy.name }}</span>
                  <span class="text-[11px] text-neutral-400">"{{ fallacy.nickname }}"</span>
                </span>
              </UButton>
            </div>
          </div>

          <div class="flex items-center justify-between">
            <div class="text-xs text-neutral-500">
              {{ aiSelectedFallacies.length }} fallac{{ aiSelectedFallacies.length === 1 ? 'y' : 'ies' }} selected
            </div>
            <UButton
              size="sm"
              color="primary"
              :disabled="aiSelectedFallacies.length === 0 || aiLoading"
              @click="getAiSuggestion"
            >
              <UIcon
                v-if="aiLoading"
                name="i-heroicons-arrow-path"
                class="mr-1 animate-spin"
              />
              <span>
                {{ aiLoading ? 'Generating...' : aiSuggestionsHistory.length ? 'Try Again' : 'Generate' }}
              </span>
            </UButton>
          </div>

          <div v-if="aiError" class="game-card border-red-500/40">
            <p class="text-red-400 text-sm">{{ aiError }}</p>
          </div>

          <div v-if="aiSuggestion" class="game-card">
            <p class="text-neutral-300 text-sm">{{ aiSuggestion }}</p>
            <UButton size="xs" class="mt-2" @click="useAiSuggestion">
              Use This
            </UButton>
          </div>

          <div v-if="aiSuggestionsHistory.length" class="space-y-2">
            <div class="text-xs text-neutral-400">Previous suggestions (tap to preview):</div>
            <div class="space-y-1 max-h-40 overflow-y-auto">
              <button
                v-for="(prev, index) in aiSuggestionsHistory"
                :key="index"
                class="w-full text-left text-[11px] text-neutral-300 px-2 py-1 rounded bg-neutral-900/70 hover:bg-neutral-800/90 border border-neutral-800 hover:border-indigo-500/40"
                @click="aiSuggestion = prev"
              >
                {{ prev }}
              </button>
            </div>
          </div>

          <div class="text-right">
            <UButton variant="ghost" @click="showAiSuggest = false">Close</UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useWebSocket } from '~/composables/useWebSocket'
import { useContentStore } from '~/stores/content'
import { useGameStore } from '~/stores/game'
import { useSessionStore } from '~/stores/session'
import type { ProsecutionRound, ReviewSubmitPayload, SubmitPayload, TopicSelectPayload } from '~/types'

const gameStore = useGameStore()
const sessionStore = useSessionStore()
const contentStore = useContentStore()
const ws = useWebSocket()

const argumentText = ref('')
const selectedFallacies = ref<string[]>([])
const reviewSelections = reactive<Record<string, string[]>>({})
const showAiSuggest = ref(false)
const aiSuggestion = ref('')
const aiSuggestionsHistory = ref<string[]>([])
const aiSelectedFallacies = ref<string[]>([])
const aiPositionText = ref('')
const aiLoading = ref(false)
const aiError = ref('')

const currentRound = computed((): ProsecutionRound | undefined => {
  const rounds = (gameStore.gameData.rounds as ProsecutionRound[]) || []
  return rounds[rounds.length - 1]
})

const roundPhase = computed(() => currentRound.value?.phase || 'intro')

const availableTopics = computed(() => {
  const ids = (gameStore.gameData.availableTopicIds as string[]) || contentStore.topics.map(t => t.id)
  return contentStore.topics.filter(t => ids.includes(t.id))
})

const myTeamId = computed(() => sessionStore.currentTeam?.id)

const ourTopicId = computed(() => {
  if (!myTeamId.value || !currentRound.value) return null
  return currentRound.value.topicSelections[myTeamId.value]?.topicId
})

const ourTopicName = computed(() => {
  if (!ourTopicId.value) return 'Not selected'
  return contentStore.getTopicById(ourTopicId.value)?.name || ''
})

const ourTopicExplanation = computed(() => {
  if (!ourTopicId.value) return ''
  return contentStore.getTopicById(ourTopicId.value)?.explanation || ''
})

const ourPosition = computed(() => {
  if (!ourTopicId.value) return ''
  const topic = contentStore.getTopicById(ourTopicId.value)
  return topic?.positionA.label || ''
})

const canSubmit = computed(() => {
  return argumentText.value.trim().length > 0 && selectedFallacies.value.length >= 2
})

const hasSubmitted = computed(() => {
  if (!myTeamId.value || !currentRound.value) return false
  return !!currentRound.value.arguments[myTeamId.value]
})

const otherTeams = computed(() => {
  return sessionStore.teams.filter(t => t.id !== myTeamId.value)
})

const reviewedCount = computed(() => {
  if (!currentRound.value || !myTeamId.value) return 0
  return currentRound.value.reviews.filter(r => r.reviewingTeamId === myTeamId.value).length
})

const scores = computed(() => (gameStore.gameData.scores as Record<string, number>) || {})
const teamScore = computed(() => myTeamId.value ? scores.value[myTeamId.value] || 0 : 0)

function isTopicClaimed(topicId: string): boolean {
  if (!currentRound.value) return false
  return Object.values(currentRound.value.topicSelections).some(s => s.topicId === topicId)
}

function isOurTopic(topicId: string): boolean {
  return ourTopicId.value === topicId
}

function getTopicButtonClass(topicId: string): string {
  if (isOurTopic(topicId)) {
    return 'border-green-500 bg-green-500/20'
  }
  if (isTopicClaimed(topicId)) {
    return 'border-neutral-700 bg-neutral-800/30 opacity-50 cursor-not-allowed'
  }
  return 'border-neutral-700 bg-neutral-800/50 hover:border-indigo-500'
}

function selectTopic(topicId: string) {
  if (!myTeamId.value || isTopicClaimed(topicId)) return

  const payload: TopicSelectPayload = {
    gameId: gameStore.currentGameId || 'prosecution',
    teamId: myTeamId.value,
    topicId
  }

  ws.send('game:topic_select', payload)
}

function toggleFallacy(id: string) {
  const index = selectedFallacies.value.indexOf(id)
  if (index >= 0) {
    selectedFallacies.value.splice(index, 1)
  } else {
    selectedFallacies.value.push(id)
  }
}

function submitArgument() {
  if (!myTeamId.value || !canSubmit.value) return

  const payload: SubmitPayload = {
    gameId: gameStore.currentGameId || 'prosecution',
    teamId: myTeamId.value,
    submission: {
      text: argumentText.value,
      techniques: [...selectedFallacies.value]
    }
  }

  ws.send('game:submit', payload)
}

function getTeamTopicName(teamId: string): string {
  if (!currentRound.value) return ''
  const topicId = currentRound.value.topicSelections[teamId]?.topicId
  if (!topicId) return 'Unknown'
  return contentStore.getTopicById(topicId)?.name || 'Unknown'
}

function getTeamArgument(teamId: string): string {
  if (!currentRound.value) return ''
  return currentRound.value.arguments[teamId]?.text || ''
}

function hasReviewedTeam(targetTeamId: string): boolean {
  if (!currentRound.value || !myTeamId.value) return false
  return currentRound.value.reviews.some(
    r => r.reviewingTeamId === myTeamId.value && r.targetTeamId === targetTeamId
  )
}

function getReviewSelection(targetTeamId: string): string[] {
  return reviewSelections[targetTeamId] || []
}

function toggleReviewFallacy(targetTeamId: string, fallacyId: string) {
  if (!reviewSelections[targetTeamId]) {
    reviewSelections[targetTeamId] = []
  }
  const index = reviewSelections[targetTeamId].indexOf(fallacyId)
  if (index >= 0) {
    reviewSelections[targetTeamId].splice(index, 1)
  } else {
    reviewSelections[targetTeamId].push(fallacyId)
  }
}

function submitReviewForTeam(targetTeamId: string) {
  if (!myTeamId.value) return
  const selections = reviewSelections[targetTeamId] || []
  if (selections.length === 0) return

  const payload: ReviewSubmitPayload = {
    gameId: gameStore.currentGameId || 'prosecution',
    reviewingTeamId: myTeamId.value,
    targetTeamId: targetTeamId,
    identifiedFallacies: [...selections]
  }

  ws.send('game:review_submit', payload)
}

function toggleAiFallacy(id: string) {
  const index = aiSelectedFallacies.value.indexOf(id)
  if (index >= 0) {
    aiSelectedFallacies.value.splice(index, 1)
  } else {
    aiSelectedFallacies.value.push(id)
  }
}

function openAiSuggest() {
  aiError.value = ''
  aiSelectedFallacies.value = selectedFallacies.value.length ? [...selectedFallacies.value] : []
  aiPositionText.value = ourPosition.value || ourTopicExplanation.value || ''
  showAiSuggest.value = true
}

async function getAiSuggestion() {
  aiError.value = ''

  if (aiSuggestion.value.trim()) {
    aiSuggestionsHistory.value.unshift(aiSuggestion.value.trim())
  }

  if (!ourTopicId.value) {
    aiError.value = 'Please pick a topic first.'
    return
  }

  const topic = contentStore.getTopicById(ourTopicId.value)
  if (!topic) {
    aiError.value = 'Could not load topic details.'
    return
  }

  const fallacies = aiSelectedFallacies.value.length
    ? [...aiSelectedFallacies.value]
    : selectedFallacies.value.length
      ? [...selectedFallacies.value]
      : contentStore.fallacies.slice(0, 2).map(f => f.id)

  aiLoading.value = true

  try {
    const response = await $fetch<{ suggestions: Array<{ text: string }> }>('/api/ai/suggest', {
      method: 'POST',
      body: {
        type: 'fallacious',
        topic: topic.name,
        position: aiPositionText.value || ourPosition.value || '',
        targetFallacies: fallacies,
        existingText: argumentText.value || undefined
      }
    })

    const first = response.suggestions && response.suggestions[0]
    if (first?.text) {
      aiSuggestion.value = first.text
    } else {
      aiError.value = 'No suggestions returned.'
    }
  } catch (error) {
    console.error('AI suggest error', error)
    aiError.value = 'Failed to get suggestions.'
  } finally {
    aiLoading.value = false
  }
}

function useAiSuggestion() {
  argumentText.value += (argumentText.value ? ' ' : '') + aiSuggestion.value
  aiSuggestion.value = ''
  showAiSuggest.value = false

   aiSelectedFallacies.value.forEach(id => {
    if (!selectedFallacies.value.includes(id)) {
      selectedFallacies.value.push(id)
    }
  })
}
</script>

