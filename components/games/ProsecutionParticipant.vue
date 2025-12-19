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
      <h3 class="font-semibold text-white mb-4">Pick Your Topic</h3>
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
          <div v-if="isTopicClaimed(topic.id)" class="text-sm mt-1">
            <span v-if="isOurTopic(topic.id)" class="text-green-400">✓ Your selection</span>
            <span v-else class="text-neutral-500">Claimed</span>
          </div>
        </button>
      </div>
    </div>

    <div v-else-if="roundPhase === 'building'" class="flex-1 flex flex-col">
      <div class="mb-4">
        <div class="text-sm text-neutral-400">Your Topic</div>
        <div class="font-semibold text-white">{{ ourTopicName }}</div>
        <div class="text-sm text-indigo-400 mt-1">{{ ourPosition }}</div>
      </div>

      <div class="flex-1 flex flex-col">
        <label class="text-sm text-neutral-400 mb-2">Your Argument (pack in fallacies!)</label>
        <textarea
          v-model="argumentText"
          class="flex-1 bg-neutral-800 border border-neutral-700 rounded-lg p-3 text-white resize-none focus:border-indigo-500 focus:outline-none"
          placeholder="Write your fallacy-packed argument here..."
          :disabled="hasSubmitted"
        ></textarea>

        <div class="mt-4">
          <div class="text-sm text-neutral-400 mb-2">Fallacies Used (select all you included)</div>
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
              {{ fallacy.nickname }}
            </button>
          </div>
        </div>

        <div class="mt-4 flex gap-2">
          <UButton 
            variant="soft" 
            class="flex-1"
            @click="showAiSuggest = true"
          >
            <UIcon name="i-heroicons-sparkles" class="mr-1" />
            AI Suggest
          </UButton>
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

    <div v-else-if="roundPhase === 'reviewing'" class="flex-1 flex flex-col">
      <div class="game-card mb-4">
        <div class="text-xs text-neutral-500 uppercase tracking-wide mb-2">Reviewing</div>
        <p class="text-white text-sm">"{{ truncatedArgument }}"</p>
        <UButton 
          v-if="fullArgument.length > 150" 
          size="xs" 
          variant="link" 
          class="mt-2"
          @click="showFullArgument = true"
        >
          View Full Argument
        </UButton>
      </div>

      <div v-if="!hasReviewed && isReviewingTeam" class="flex-1 overflow-y-auto">
        <div class="text-sm text-neutral-400 mb-3">Which fallacies did they use?</div>
        <div class="space-y-2">
          <button
            v-for="fallacy in contentStore.fallacies"
            :key="fallacy.id"
            class="w-full p-3 rounded-lg border transition-all text-left"
            :class="reviewSelections.includes(fallacy.id)
              ? 'border-indigo-500 bg-indigo-500/20 text-white'
              : 'border-neutral-700 bg-neutral-800/50 text-neutral-300 hover:border-neutral-600'"
            @click="toggleReviewSelection(fallacy.id)"
          >
            <div class="font-medium">{{ fallacy.name }}</div>
            <div class="text-sm text-neutral-500">"{{ fallacy.nickname }}"</div>
          </button>
        </div>
        <div class="mt-4 sticky bottom-0 bg-neutral-900/90 backdrop-blur-sm p-2 -mx-2">
          <UButton 
            color="primary" 
            block 
            @click="submitReview"
          >
            Submit Review
          </UButton>
        </div>
      </div>

      <div v-else-if="!isReviewingTeam" class="flex-1 flex items-center justify-center">
        <div class="text-center space-y-4">
          <UIcon name="i-heroicons-eye" class="text-5xl text-indigo-500" />
          <p class="text-neutral-400">This is your team's argument.<br>Watch others try to catch your fallacies!</p>
        </div>
      </div>

      <div v-else class="flex-1 flex items-center justify-center">
        <div class="text-center space-y-4">
          <UIcon name="i-heroicons-check-circle" class="text-5xl text-green-500" />
          <h3 class="text-xl font-bold text-white">Review Submitted!</h3>
          <p class="text-neutral-400">Waiting for results...</p>
        </div>
      </div>
    </div>

    <div v-else class="flex-1 flex items-center justify-center">
      <div class="text-center space-y-4">
        <div class="text-5xl">🏆</div>
        <h2 class="text-xl font-bold text-white">Round Complete!</h2>
        <div class="text-3xl font-bold text-indigo-400">{{ teamScore }} points</div>
      </div>
    </div>

    <UModal v-model:open="showFullArgument">
      <template #content>
        <div class="p-6">
          <p class="text-white leading-relaxed">"{{ fullArgument }}"</p>
          <div class="mt-4 text-right">
            <UButton variant="ghost" @click="showFullArgument = false">Close</UButton>
          </div>
        </div>
      </template>
    </UModal>

    <UModal v-model:open="showAiSuggest">
      <template #content>
        <div class="p-6 space-y-4">
          <h3 class="text-lg font-semibold text-white">AI Suggestions</h3>
          <p class="text-sm text-neutral-400">Click a fallacy to get argument ideas:</p>
          <div class="flex flex-wrap gap-2">
            <UButton
              v-for="fallacy in contentStore.fallacies"
              :key="fallacy.id"
              size="sm"
              variant="soft"
              @click="getAiSuggestion(fallacy.id)"
            >
              {{ fallacy.nickname }}
            </UButton>
          </div>
          <div v-if="aiSuggestion" class="game-card">
            <p class="text-neutral-300 text-sm">{{ aiSuggestion }}</p>
            <UButton size="xs" class="mt-2" @click="useAiSuggestion">
              Use This
            </UButton>
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
import { ref, computed } from 'vue'
import { useGameStore } from '~/stores/game'
import { useSessionStore } from '~/stores/session'
import { useContentStore } from '~/stores/content'
import type { ProsecutionRound } from '~/types'

const gameStore = useGameStore()
const sessionStore = useSessionStore()
const contentStore = useContentStore()

const argumentText = ref('')
const selectedFallacies = ref<string[]>([])
const reviewSelections = ref<string[]>([])
const showFullArgument = ref(false)
const showAiSuggest = ref(false)
const aiSuggestion = ref('')

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

const currentReviewTargetIndex = computed(() => currentRound.value?.currentReviewTargetIndex || 0)

const currentReviewTeamId = computed(() => {
  return sessionStore.teams[currentReviewTargetIndex.value]?.id
})

const isReviewingTeam = computed(() => {
  return myTeamId.value !== currentReviewTeamId.value
})

const fullArgument = computed(() => {
  if (!currentReviewTeamId.value || !currentRound.value) return ''
  return currentRound.value.arguments[currentReviewTeamId.value]?.text || ''
})

const truncatedArgument = computed(() => {
  if (fullArgument.value.length <= 150) return fullArgument.value
  return fullArgument.value.slice(0, 150) + '...'
})

const hasReviewed = computed(() => {
  if (!myTeamId.value || !currentRound.value) return false
  return currentRound.value.reviews.some(
    r => r.reviewingTeamId === myTeamId.value && r.targetTeamId === currentReviewTeamId.value
  )
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
  gameStore.selectTopic(myTeamId.value, topicId)
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
  gameStore.submitArgument(myTeamId.value, argumentText.value, selectedFallacies.value)
}

function toggleReviewSelection(id: string) {
  const index = reviewSelections.value.indexOf(id)
  if (index >= 0) {
    reviewSelections.value.splice(index, 1)
  } else {
    reviewSelections.value.push(id)
  }
}

function submitReview() {
  if (!myTeamId.value || !currentReviewTeamId.value) return
  gameStore.submitReview(myTeamId.value, currentReviewTeamId.value, reviewSelections.value)
  reviewSelections.value = []
}

async function getAiSuggestion(fallacyId: string) {
  const fallacy = contentStore.getFallacyById(fallacyId)
  const topic = contentStore.getTopicById(ourTopicId.value || '')
  
  if (!fallacy || !topic) return
  
  const prompts = topic.positionA.fallacyPrompts.filter(p => p.fallacy === fallacyId)
  if (prompts.length > 0) {
    aiSuggestion.value = prompts[Math.floor(Math.random() * prompts.length)].starter
  } else {
    aiSuggestion.value = fallacy.promptStarters[Math.floor(Math.random() * fallacy.promptStarters.length)]
  }
}

function useAiSuggestion() {
  argumentText.value += (argumentText.value ? ' ' : '') + aiSuggestion.value
  aiSuggestion.value = ''
  showAiSuggest.value = false
}
</script>

