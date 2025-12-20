<template>
  <div class="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-indigo-950">
    <div v-if="!hasJoined" class="flex items-center justify-center min-h-screen p-6">
      <div class="max-w-md w-full">
        <div class="text-center mb-8">
          <div class="text-5xl mb-4">🧠</div>
          <h1 class="text-3xl font-bold text-white">Join Session</h1>
          <p class="text-neutral-400 mt-2">Session: <span class="text-indigo-400 font-mono">{{ sessionCode }}</span></p>
        </div>

        <div class="game-card space-y-6">
          <ParticipantSelector
            v-model="participantName"
            :participants="sessionStore.participants"
            :teams="sessionStore.teams"
            label="Your Name"
            placeholder="Enter your name"
            list-label="Or pick your name from the list:"
            @select-participant="joinWithParticipant"
            @enter="joinSessionClick"
          />

          <UButton
            color="primary"
            size="lg"
            block
            :disabled="!participantName.trim()"
            @click="joinSessionClick"
          >
            Join Session
          </UButton>
        </div>

        <div class="mt-8 game-card space-y-4">
          <div class="text-sm text-neutral-400">
            Participants in this session
          </div>
          <div v-if="groupedParticipants.length" class="space-y-3">
            <div
              v-for="group in groupedParticipants"
              :key="group.key"
              class="space-y-1"
            >
              <div
                class="text-xs font-medium"
                :style="group.color ? { color: group.color } : {}"
              >
                {{ group.label }}
              </div>
              <div class="flex flex-wrap gap-2">
                <UBadge
                  v-for="p in group.participants"
                  :key="p.id"
                  variant="subtle"
                  color="neutral"
                >
                  {{ p.name }}
                </UBadge>
              </div>
            </div>
          </div>
          <div v-else class="text-sm text-neutral-500">
            Waiting for participants to join...
          </div>
        </div>
      </div>
    </div>

    <div v-else class="min-h-screen flex flex-col">
      <header class="context-bar flex items-center justify-between">
        <div>
          <div class="flex items-center gap-3">
            <div class="text-sm text-neutral-400">{{ sessionStore.name }}</div>
            <div class="text-xs text-neutral-500">
              Code <span class="font-mono text-indigo-400">{{ sessionCode }}</span>
            </div>
          </div>
          <button
            class="text-white font-medium underline-offset-2 hover:underline"
            type="button"
            @click="openEditName"
          >
            {{ currentParticipant?.name }}
          </button>
        </div>
        <div class="flex items-center gap-3">
          <UBadge v-if="currentTeam" :style="{ backgroundColor: currentTeam.color + '30', color: currentTeam.color }">
            {{ currentTeam.name }}
          </UBadge>
          <UButton size="xs" variant="ghost" @click="showReference = true">
            <UIcon name="i-heroicons-book-open" />
          </UButton>
        </div>
      </header>

      <div v-if="gameStore.isActive" class="flex-1 flex flex-col">
        <div class="context-bar border-t-0">
          <div class="text-xs text-neutral-500 uppercase tracking-wide">Currently Viewing</div>
          <div class="text-white truncate">{{ gameStore.hostContext || 'Waiting for host...' }}</div>
        </div>

        <div class="flex-1 p-4">
          <component 
            :is="currentGameComponent" 
            v-if="currentGameComponent"
            mode="participant"
          />
          <div v-else class="flex items-center justify-center h-full">
            <div class="text-center text-neutral-400">
              <UIcon name="i-heroicons-clock" class="text-4xl mb-4" />
              <p>Waiting for host to start the game...</p>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="flex-1 flex items-center justify-center p-6">
        <div class="text-center">
          <div class="text-6xl mb-6">⏳</div>
          <h2 class="text-2xl font-bold text-white mb-2">
            {{ isSelectingNextGame ? 'Host is selecting the next game' : 'Waiting for Game' }}
          </h2>
          <p class="text-neutral-400">
            {{ isSelectingNextGame ? 'Sit tight while the host picks what to play next.' : 'The host will start the game soon' }}
          </p>
          <div class="mt-8 p-4 bg-neutral-800/50 rounded-xl">
            <div class="text-sm text-neutral-500 mb-2">Connected as</div>
            <div class="text-xl text-white">{{ currentParticipant?.name }}</div>
            <div v-if="currentTeam" class="mt-2">
              <UBadge :style="{ backgroundColor: currentTeam.color + '30', color: currentTeam.color }">
                {{ currentTeam.name }}
              </UBadge>
            </div>
          </div>
        </div>
      </div>
    </div>
    <ReferencePanel v-model:open="showReference" />

    <UModal v-model:open="showEditName">
      <template #content>
        <div class="p-6 space-y-4">
          <h3 class="text-lg font-semibold text-white">Change Participant</h3>
          <ParticipantSelector
            v-model="editedName"
            :participants="sessionStore.participants"
            :teams="sessionStore.teams"
            label="Name"
            placeholder="Enter your name"
            list-label="Or pick a name from the list:"
            @select-participant="changeToParticipant"
            @enter="saveEditedName"
          />
          <div class="flex justify-end gap-3">
            <UButton variant="ghost" @click="showEditName = false">Cancel</UButton>
            <UButton color="primary" :disabled="!editedName.trim()" @click="saveEditedName">
              Save
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { useLocalStorage } from '@vueuse/core'
import { computed, defineAsyncComponent, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import ParticipantSelector from '~/components/game/ParticipantSelector.vue'
import ReferencePanel from '~/components/game/ReferencePanel.vue'
import { useWebSocket } from '~/composables/useWebSocket'
import { useGameStore } from '~/stores/game'
import { useSessionStore } from '~/stores/session'
import type { GameId, HostNavigatePayload, HostSyncRequestPayload, HostSyncResponsePayload, Participant, SessionSyncRequestPayload, SessionTeamsUpdatedPayload, StateUpdatePayload, Team } from '~/types'

const route = useRoute()
const sessionStore = useSessionStore()
const gameStore = useGameStore()
const ws = useWebSocket()

const sessionCode = computed(() => (route.params.code as string).toUpperCase())
const participantName = ref('')
const hasJoined = ref(false)
const showReference = ref(false)
const showEditName = ref(false)
const editedName = ref('')
const isSelectingNextGame = ref(false)

const currentParticipant = computed(() => sessionStore.currentParticipant)
const currentTeam = computed(() => sessionStore.currentTeam)

const participantStorage = useLocalStorage<string | null>(
  `fallacies:session:${sessionCode.value}:participantName`,
  null
)

const groupedParticipants = computed(() => {
  const teamsById: Record<string, Team> = {}
  sessionStore.teams.forEach((team) => {
    teamsById[team.id] = team
  })

  const byKey: Record<
    string,
    { key: string; label: string; color?: string; participants: Participant[] }
  > = {}

  sessionStore.participants.forEach((p) => {
    const key = p.teamId || 'unassigned'
    if (!byKey[key]) {
      if (p.teamId && teamsById[p.teamId]) {
        byKey[key] = {
          key,
          label: teamsById[p.teamId]!.name,
          color: teamsById[p.teamId]!.color,
          participants: []
        }
      } else {
        byKey[key] = {
          key,
          label: 'Unassigned',
          participants: []
        }
      }
    }
    byKey[key].participants.push(p)
  })

  const groups = Object.values(byKey)

  groups.forEach((group) => {
    group.participants.sort((a, b) => a.name.localeCompare(b.name))
  })

  return groups.sort((a, b) => {
    const isUnassignedA = a.key === 'unassigned'
    const isUnassignedB = b.key === 'unassigned'

    if (isUnassignedA && !isUnassignedB) return 1
    if (!isUnassignedA && isUnassignedB) return -1

    return a.label.localeCompare(b.label)
  })
})

const currentGameComponent = computed(() => {
  if (!gameStore.currentGameId) return null
  const components: Record<string, unknown> = {
    'logic-traps': defineAsyncComponent(() => import('~/components/games/LogicTrapsParticipant.vue')),
    'warmup': defineAsyncComponent(() => import('~/components/games/WarmupParticipant.vue')),
    'prosecution': defineAsyncComponent(() => import('~/components/games/ProsecutionParticipant.vue')),
    'antidotes': defineAsyncComponent(() => import('~/components/games/AntidotesParticipant.vue')),
    'steelman': defineAsyncComponent(() => import('~/components/games/SteelmanParticipant.vue')),
    'crux-hunt': defineAsyncComponent(() => import('~/components/games/CruxHuntParticipant.vue')),
    'reflection': defineAsyncComponent(() => import('~/components/games/ReflectionParticipant.vue'))
  }
  return components[gameStore.currentGameId]
})

onMounted(() => {
  ws.connect(sessionCode.value)

  if (!sessionStore.loadSession(sessionCode.value, false)) {
    console.warn('Session not found, creating new one for participant')
  }

  if (participantStorage.value) {
    participantName.value = participantStorage.value
    const existingParticipant = sessionStore.participants.find(
      (p) => p.name === participantStorage.value
    )
    if (existingParticipant) {
      performJoin(existingParticipant.id)
    }
  }

  ws.on('game:state_update', (message) => {
    const payload = message.payload as StateUpdatePayload
    if (payload && payload.gameId) {
      gameStore.applyRemoteState(payload, sessionCode.value)
      isSelectingNextGame.value = false
    }
  })

  ws.on('host:sync_response', (message) => {
    const payload = message.payload as HostSyncResponsePayload
    if (!payload) return
    if (payload.gameId) {
      gameStore.currentGameId = payload.gameId as GameId
      gameStore.sessionCode = sessionCode.value
      gameStore.phase = payload.phase
      gameStore.step = payload.step
      gameStore.totalSteps = payload.totalSteps
      gameStore.hostContext = payload.hostContext
      if (payload.gameData) {
        gameStore.gameData = { ...gameStore.gameData, ...payload.gameData }
      }
      isSelectingNextGame.value = false
    } else {
      gameStore.endGame()
      isSelectingNextGame.value = true
    }
  })

  ws.on('host:navigate', (message) => {
    const payload = message.payload as HostNavigatePayload
    if (!payload || !payload.route) return
    const lobbyRoute = `/host/${sessionCode.value}`
    if (payload.route === lobbyRoute) {
      gameStore.endGame()
      isSelectingNextGame.value = true
    } else if (payload.route.startsWith(`${lobbyRoute}/game/`)) {
      isSelectingNextGame.value = false
    }
  })

  ws.on('session:teams_updated', (message) => {
    const payload = message.payload as SessionTeamsUpdatedPayload
    if (!payload) return
    sessionStore.participants = [...payload.participants]
    sessionStore.teams = [...payload.teams]
    if (payload.argumentHistory) {
      sessionStore.argumentHistory = { ...payload.argumentHistory }
    }
    if (!hasJoined.value && participantStorage.value) {
      const restored = sessionStore.participants.find(
        (p) => p.name === participantStorage.value
      )
      if (restored) {
        performJoin(restored.id)
      }
    }
  })

  setTimeout(() => {
    const payload: SessionSyncRequestPayload = { source: 'participant' }
    console.log('[play] sending session:sync_request', payload)
    ws.send('session:sync_request', payload)
  }, 500)

  setTimeout(() => {
    const payload: HostSyncRequestPayload = { hostId: '' }
    console.log('[play] sending host:sync_request', payload)
    ws.send('host:sync_request', payload)
  }, 700)
})

function assignToRandomTeam(participantId: string) {
  if (!sessionStore.teams.length) return
  const index = Math.floor(Math.random() * sessionStore.teams.length)
  const team = sessionStore.teams[index]
  if (team) {
    sessionStore.assignToTeam(participantId, team.id)
  }
}

function performJoin(existingParticipantId?: string) {
  const nameFromInput = participantName.value.trim()
  if (!nameFromInput && !existingParticipantId) return

  let participant =
    existingParticipantId &&
    sessionStore.participants.find((p) => p.id === existingParticipantId)

  if (!participant) {
    const name = existingParticipantId
      ? sessionStore.participants.find((p) => p.id === existingParticipantId)?.name || ''
      : nameFromInput
    if (!name.trim()) return
    participant =
      sessionStore.participants.find((p) => p.name === name) ||
      sessionStore.addParticipant(name)
    if (!participant.teamId) {
      assignToRandomTeam(participant.id)
    }
  }

  sessionStore.currentParticipantId = participant.id
  hasJoined.value = true
  participantStorage.value = participant.name

  ws.send('session:join', {
    participantName: participant.name,
    participantId: participant.id
  })
}

function joinSessionClick() {
  performJoin()
}

function joinWithParticipant(participantId: string) {
  performJoin(participantId)
}

function openEditName() {
  if (!currentParticipant.value) return
  editedName.value = currentParticipant.value.name
  showEditName.value = true
}

function saveEditedName() {
  const name = editedName.value.trim()
  if (!name) {
    showEditName.value = false
    return
  }
  participantName.value = name
  performJoin()
  showEditName.value = false
}

function changeToParticipant(participantId: string) {
  performJoin(participantId)
  const selected = sessionStore.participants.find((p) => p.id === participantId)
  editedName.value = selected ? selected.name : ''
  showEditName.value = false
}
</script>

