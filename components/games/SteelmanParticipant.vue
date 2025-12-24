<template>
  <div class="h-full flex flex-col p-4">
    <div v-if="phase === 'building'" class="flex-1 flex flex-col">
      <div class="mb-4">
        <div class="text-sm text-neutral-400">Your Challenge</div>
        <div class="font-semibold text-white">Repair this argument—remove fallacies and use antidotes.</div>
      </div>

      <div class="flex-1 flex flex-col">
        <div class="mb-4 space-y-2">
          <div class="text-xs text-neutral-400">Topic</div>
          <div class="text-sm text-white">{{ topicName }}</div>
          <div class="text-xs text-neutral-400 mt-1">Position</div>
          <div class="text-sm text-green-400">{{ positionLabel }}</div>
          <div class="mt-2 text-xs text-neutral-400">
            Original fallacious argument:
          </div>
          <div class="text-xs text-neutral-300 italic max-h-24 overflow-y-auto">
            "{{ originalArgumentText }}"
          </div>
          <div v-if="fallacyIds.length" class="mt-2 flex flex-wrap gap-1">
            <UBadge
              v-for="fallacyId in fallacyIds"
              :key="fallacyId"
              class="border border-red-500/40 bg-red-500/10 text-red-300"
            >
              {{ getFallacyName(fallacyId) }}
            </UBadge>
          </div>
        </div>

        <label class="text-sm text-neutral-400 mb-2">Your Sound Argument (no fallacies!)</label>
        <textarea
          v-model="argumentText"
          class="flex-1 bg-neutral-800 border border-neutral-700 rounded-lg p-3 text-white resize-none focus:border-green-500 focus:outline-none"
          placeholder="Build a compelling, fallacy-free argument..."
          :disabled="hasSubmitted"
        ></textarea>

        <div class="mt-4">
          <div class="text-sm text-neutral-400 mb-2">Antidotes Used (select techniques you applied)</div>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="antidote in contentStore.antidotes"
              :key="antidote.id"
              class="px-3 py-1.5 rounded-full text-sm border transition-all"
              :class="selectedAntidotes.includes(antidote.id)
                ? 'border-green-500 bg-green-500/20 text-white'
                : 'border-neutral-700 text-neutral-400 hover:border-neutral-600'"
              :disabled="hasSubmitted"
              @click="toggleAntidote(antidote.id)"
            >
              {{ antidote.name }}
            </button>
          </div>
        </div>

        <div class="mt-4">
          <UButton 
            color="primary" 
            block
            :disabled="!canSubmit || hasSubmitted"
            @click="submitArgument"
          >
            {{ hasSubmitted ? 'Submitted ✓' : 'Submit Argument' }}
          </UButton>
        </div>
      </div>
    </div>

    <div v-else-if="phase === 'comparison'" class="flex-1 flex flex-col">
      <div class="text-center mb-4">
        <h3 class="font-semibold text-white">Which is more persuasive?</h3>
      </div>

      <div class="flex-1 flex flex-col gap-4">
        <button
          class="flex-1 p-4 rounded-lg border transition-all text-left"
          :class="vote === 'fallacious' ? 'border-red-500 bg-red-500/20' : 'border-neutral-700 hover:border-neutral-600'"
          @click="castVote('fallacious')"
        >
          <div class="font-medium text-red-400 mb-2">Fallacious Version</div>
          <p class="text-neutral-400 text-sm">The argument with hidden fallacies</p>
        </button>

        <button
          class="flex-1 p-4 rounded-lg border transition-all text-left"
          :class="vote === 'steelman' ? 'border-green-500 bg-green-500/20' : 'border-neutral-700 hover:border-neutral-600'"
          @click="castVote('steelman')"
        >
          <div class="font-medium text-green-400 mb-2">Steelmanned Version</div>
          <p class="text-neutral-400 text-sm">The sound, fallacy-free argument</p>
        </button>
      </div>

      <div v-if="vote" class="mt-4 text-center text-green-400">
        Vote submitted!
      </div>
    </div>

    <div v-else class="flex-1 flex items-center justify-center">
      <div class="text-center space-y-4">
        <div class="text-5xl">🛡️</div>
        <h2 class="text-xl font-bold text-white">Steelman Showdown</h2>
        <p class="text-neutral-400">{{ gameStore.hostContext }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useWebSocket } from '~/composables/useWebSocket'
import { useContentStore } from '~/stores/content'
import { useGameStore } from '~/stores/game'
import { useSessionStore } from '~/stores/session'
import type { SteelmanRound, SubmitPayload } from '~/types'

const gameStore = useGameStore()
const sessionStore = useSessionStore()
const contentStore = useContentStore()
const ws = useWebSocket()

const argumentText = ref('')
const selectedAntidotes = ref<string[]>([])
const vote = ref<'fallacious' | 'steelman' | null>(null)

const phase = computed(() => {
  const rounds = (gameStore.gameData.rounds as SteelmanRound[]) || []
  const currentRound = rounds[rounds.length - 1]
  return currentRound?.phase || 'intro'
})

const currentRound = computed((): SteelmanRound | undefined => {
  const rounds = (gameStore.gameData.rounds as SteelmanRound[]) || []
  return rounds[rounds.length - 1]
})

const myTeamId = computed(() => sessionStore.currentTeam?.id)

const assignedExampleId = computed(() => {
  if (!currentRound.value || !currentRound.value.assignedExamples || !myTeamId.value) return null
  return currentRound.value.assignedExamples[myTeamId.value]?.exampleId || null
})

const assignedExample = computed(() => {
  const id = assignedExampleId.value
  if (!id) return null
  return contentStore.complexExamples.find(e => e.id === id) || null
})

const topicForExample = computed(() => {
  const example = assignedExample.value
  if (!example) return null
  return contentStore.getTopicById(example.topic) || null
})

const topicName = computed(() => {
  return topicForExample.value?.name || 'Topic TBD'
})

const positionLabel = computed(() => {
  const topic = topicForExample.value
  const example = assignedExample.value
  if (!topic || !example) return 'Position TBD'
  if (example.position === 'A') return topic.positionA.label
  if (example.position === 'B') return topic.positionB.label
  return 'Position TBD'
})

const originalArgumentText = computed(() => {
  return assignedExample.value?.text || ''
})

const fallacyIds = computed(() => {
  return assignedExample.value?.correctFallacies || []
})

function getFallacyName(id: string): string {
  return contentStore.getFallacyById(id)?.name || id
}

const canSubmit = computed(() => {
  return argumentText.value.trim().length > 0 && selectedAntidotes.value.length >= 1
})

const hasSubmitted = computed(() => {
  if (!myTeamId.value || !currentRound.value) return false
  return !!currentRound.value.arguments[myTeamId.value]
})

function toggleAntidote(id: string) {
  const index = selectedAntidotes.value.indexOf(id)
  if (index >= 0) {
    selectedAntidotes.value.splice(index, 1)
  } else {
    selectedAntidotes.value.push(id)
  }
}

function submitArgument() {
  if (!myTeamId.value || !canSubmit.value) return
  const example = assignedExample.value
  const topic = topicForExample.value
  const topicId = example?.topic
  let position: string | undefined
  if (topic && example?.position === 'A') {
    position = topic.positionA.label
  } else if (topic && example?.position === 'B') {
    position = topic.positionB.label
  }

  const payload: SubmitPayload = {
    gameId: gameStore.currentGameId || 'steelman',
    teamId: myTeamId.value,
    submission: {
      text: argumentText.value,
      techniques: [...selectedAntidotes.value],
      topicId,
      position,
      sourceHistoryKey: example ? `example:${example.id}` : undefined
    }
  }

  ws.send('game:submit', payload)
}

function castVote(choice: 'fallacious' | 'steelman') {
  vote.value = choice
  if (currentRound.value && sessionStore.currentParticipantId) {
    currentRound.value.persuasionVotes[sessionStore.currentParticipantId] = choice
    const rounds = (gameStore.gameData.rounds as SteelmanRound[]) || []
    gameStore.updateGameData({ rounds: [...rounds] })
  }
}
</script>

