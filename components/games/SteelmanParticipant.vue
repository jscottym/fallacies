<template>
  <div class="h-full flex flex-col p-4">
    <div v-if="phase === 'building'" class="flex-1 flex flex-col">
      <div class="mb-4">
        <div class="text-sm text-neutral-400">Your Challenge</div>
        <div class="font-semibold text-white">Argue the OPPOSITE side—with sound logic!</div>
      </div>

      <div class="flex-1 flex flex-col">
        <div v-if="teamHistory.length" class="mb-4 space-y-2">
          <div class="text-xs text-neutral-400">Select a prior argument to steelman</div>
          <select
            v-model="selectedHistoryId"
            class="w-full bg-neutral-900 border border-neutral-700 rounded-md px-3 py-2 text-sm text-neutral-100"
          >
            <option
              v-for="entry in teamHistory"
              :key="getHistoryKey(entry)"
              :value="getHistoryKey(entry)"
            >
              {{ getHistoryLabel(entry) }}
            </option>
          </select>
          <div class="mt-2 text-xs text-neutral-400">
            Original argument:
          </div>
          <div class="text-xs text-neutral-300 italic max-h-24 overflow-y-auto">
            "{{ selectedSourceText }}"
          </div>
          <div v-if="selectedFallacies.length" class="mt-2 flex flex-wrap gap-1">
            <UBadge
              v-for="fallacyId in selectedFallacies"
              :key="fallacyId"
              class="border border-red-500/40 bg-red-500/10 text-red-300"
            >
              {{ getFallacyName(fallacyId) }}
            </UBadge>
          </div>
        </div>
        <div class="text-sm text-green-400 mt-1">New Position: {{ oppositePosition }}</div>

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
import type { ArgumentHistoryEntry, SteelmanRound, SubmitPayload } from '~/types'

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

const teamHistory = computed<ArgumentHistoryEntry[]>(() => {
  if (!myTeamId.value) return []
  return (sessionStore.argumentHistory[myTeamId.value] as ArgumentHistoryEntry[] | undefined) || []
})

const selectedHistoryId = ref<string | null>(null)

function getHistoryKey(entry: ArgumentHistoryEntry): string {
  return `${entry.gameId}-${entry.topicId}-${entry.createdAt}`
}

const selectedHistoryEntry = computed<ArgumentHistoryEntry | null>(() => {
  const entries = teamHistory.value
  if (!entries.length) return null
  const id = selectedHistoryId.value
  if (!id) {
    return entries[entries.length - 1] ?? null
  }
  const found = entries.find(e => getHistoryKey(e) === id)
  return found ?? entries[entries.length - 1] ?? null
})

const oppositePosition = computed(() => {
  const entry = selectedHistoryEntry.value
  if (!entry) return 'The opposite of your previous position'
  const topic = contentStore.getTopicById(entry.topicId)
  return topic?.positionB.label || 'The opposite of your previous position'
})

const selectedSourceText = computed(() => {
  return selectedHistoryEntry.value?.text || ''
})

function getHistoryLabel(entry: ArgumentHistoryEntry): string {
  const topic = contentStore.getTopicById(entry.topicId)
  const topicName = topic?.name || 'Unknown topic'
  return `${topicName} – ${entry.position}`
}

const selectedFallacies = computed(() => {
  return selectedHistoryEntry.value?.fallaciesUsed || []
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
  const source = selectedHistoryEntry.value
  const topicId = source?.topicId
  const topic = topicId ? contentStore.getTopicById(topicId) : null
  const position = topic?.positionB.label || undefined

  const payload: SubmitPayload = {
    gameId: gameStore.currentGameId || 'steelman',
    teamId: myTeamId.value,
    submission: {
      text: argumentText.value,
      techniques: [...selectedAntidotes.value],
      topicId,
      position,
      sourceHistoryKey: source ? getHistoryKey(source) : undefined
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

