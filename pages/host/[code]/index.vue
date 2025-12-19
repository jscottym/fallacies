<template>
  <div class="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-indigo-950">
    <div class="max-w-6xl mx-auto p-6">
      <div class="flex items-center justify-between mb-8">
        <div>
          <NuxtLink to="/host" class="text-neutral-400 hover:text-white transition-colors inline-flex items-center gap-2 mb-2">
            <UIcon name="i-heroicons-arrow-left" />
            Back
          </NuxtLink>
          <h1 class="text-3xl font-bold text-white">{{ sessionStore.name }}</h1>
        </div>
        <div class="text-right">
          <div class="text-sm text-neutral-400">Session Code</div>
          <div class="text-4xl font-mono font-bold text-indigo-400 tracking-wider">
            {{ code }}
          </div>
        </div>
      </div>

      <div class="grid lg:grid-cols-3 gap-6">
        <div class="lg:col-span-1 space-y-6">
          <div class="game-card">
            <h2 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <UIcon name="i-heroicons-qr-code" />
              Join via QR Code
            </h2>
            <div class="bg-white p-4 rounded-xl inline-block">
              <canvas ref="qrCanvas" width="200" height="200"></canvas>
            </div>
            <p class="text-sm text-neutral-400 mt-4">
              Scan to join at<br>
              <span class="text-indigo-400">{{ joinUrl }}</span>
            </p>
          </div>

          <div class="game-card">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-lg font-semibold text-white flex items-center gap-2">
                <UIcon name="i-heroicons-users" />
                Participants ({{ sessionStore.participantCount }})
              </h2>
              <UButton size="xs" variant="soft" @click="showAddParticipant = true">
                <UIcon name="i-heroicons-plus" />
              </UButton>
            </div>
            <div class="space-y-2 max-h-64 overflow-y-auto">
              <div
                v-for="participant in sessionStore.participants"
                :key="participant.id"
                class="flex items-center justify-between p-2 bg-neutral-800/50 rounded-lg"
              >
                <div class="flex items-center gap-2">
                  <div 
                    class="w-2 h-2 rounded-full"
                    :class="participant.isConnected ? 'bg-green-500' : 'bg-neutral-600'"
                  ></div>
                  <span class="text-white">{{ participant.name }}</span>
                  <span 
                    v-if="participant.teamId" 
                    class="text-xs px-2 py-0.5 rounded-full"
                    :style="{ backgroundColor: getTeamColor(participant.teamId) + '30', color: getTeamColor(participant.teamId) }"
                  >
                    {{ getTeamName(participant.teamId) }}
                  </span>
                </div>
                <UButton 
                  size="xs" 
                  variant="ghost" 
                  color="red"
                  @click="sessionStore.removeParticipant(participant.id)"
                >
                  <UIcon name="i-heroicons-x-mark" />
                </UButton>
              </div>
              <div v-if="sessionStore.participantCount === 0" class="text-center text-neutral-500 py-4">
                Waiting for participants to join...
              </div>
            </div>
          </div>
        </div>

        <div class="lg:col-span-1">
          <div class="game-card h-full">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-lg font-semibold text-white flex items-center gap-2">
                <UIcon name="i-heroicons-user-group" />
                Teams
              </h2>
              <div class="flex gap-2">
                <UButton size="xs" variant="soft" @click="randomizeTeams">
                  <UIcon name="i-heroicons-arrow-path" class="mr-1" />
                  Randomize
                </UButton>
                <UButton size="xs" variant="soft" @click="addTeam">
                  <UIcon name="i-heroicons-plus" />
                </UButton>
              </div>
            </div>

            <div class="space-y-4">
              <div
                v-for="team in sessionStore.teams"
                :key="team.id"
                class="p-3 rounded-lg border-2"
                :style="{ borderColor: team.color + '50', backgroundColor: team.color + '10' }"
              >
                <div class="font-medium mb-2" :style="{ color: team.color }">
                  {{ team.name }}
                </div>
                <div class="space-y-1">
                  <div
                    v-for="memberId in team.memberIds"
                    :key="memberId"
                    class="flex items-center justify-between text-sm"
                  >
                    <span class="text-neutral-300">{{ getParticipantName(memberId) }}</span>
                    <div class="flex items-center gap-1">
                      <UButton
                        v-if="!isTeamDevice(memberId)"
                        size="xs"
                        variant="ghost"
                        @click="sessionStore.setTeamDevice(memberId)"
                        title="Set as team device"
                      >
                        <UIcon name="i-heroicons-device-phone-mobile" />
                      </UButton>
                      <UIcon 
                        v-else 
                        name="i-heroicons-device-phone-mobile" 
                        class="text-green-500"
                      />
                    </div>
                  </div>
                  <div v-if="team.memberIds.length === 0" class="text-neutral-500 text-sm">
                    No members
                  </div>
                </div>
              </div>

              <div v-if="sessionStore.unassignedParticipants.length > 0" class="p-3 rounded-lg bg-neutral-800/50">
                <div class="font-medium text-neutral-400 mb-2">Unassigned</div>
                <div class="flex flex-wrap gap-2">
                  <UBadge
                    v-for="p in sessionStore.unassignedParticipants"
                    :key="p.id"
                    variant="subtle"
                    color="neutral"
                  >
                    {{ p.name }}
                  </UBadge>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="lg:col-span-1">
          <div class="game-card h-full">
            <h2 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <UIcon name="i-heroicons-puzzle-piece" />
              Games
            </h2>
            <div class="space-y-3">
              <div
                v-for="game in games"
                :key="game.id"
                class="p-3 rounded-lg bg-neutral-800/50 hover:bg-neutral-800 transition-colors cursor-pointer group"
                @click="startGame(game.id)"
              >
                <div class="flex items-start justify-between">
                  <div>
                    <div class="flex items-center gap-2">
                      <span class="text-2xl">{{ game.icon }}</span>
                      <span class="font-medium text-white group-hover:text-indigo-400 transition-colors">
                        {{ game.name }}
                      </span>
                    </div>
                    <p class="text-sm text-neutral-500 mt-1">{{ game.description }}</p>
                    <div class="flex items-center gap-3 mt-2 text-xs text-neutral-500">
                      <span>{{ game.duration }}</span>
                      <span v-if="game.teamMode !== 'none'" class="flex items-center gap-1">
                        <UIcon name="i-heroicons-user-group" />
                        {{ game.teamMode === 'teams' ? 'Teams' : 'Pairs' }}
                      </span>
                    </div>
                  </div>
                  <div>
                    <UIcon 
                      v-if="getGameStatus(game.id) === 'completed'"
                      name="i-heroicons-check-circle"
                      class="text-green-500 text-xl"
                    />
                    <UIcon 
                      v-else-if="getGameStatus(game.id) === 'in_progress'"
                      name="i-heroicons-play-circle"
                      class="text-indigo-500 text-xl"
                    />
                    <UIcon 
                      v-else
                      name="i-heroicons-arrow-right-circle"
                      class="text-neutral-600 group-hover:text-indigo-400 text-xl transition-colors"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <UModal v-model:open="showAddParticipant">
        <template #content>
          <div class="p-6 space-y-6">
            <h3 class="text-xl font-semibold text-white">Add Participant</h3>
            <UFormField label="Name">
              <UInput
                v-model="newParticipantName"
                placeholder="Enter participant name"
                size="lg"
                @keyup.enter="addParticipant"
              />
            </UFormField>
            <div class="flex gap-3 justify-end">
              <UButton variant="ghost" @click="showAddParticipant = false">Cancel</UButton>
              <UButton color="primary" :disabled="!newParticipantName.trim()" @click="addParticipant">
                Add
              </UButton>
            </div>
          </div>
        </template>
      </UModal>
    </div>
  </div>
</template>

<script setup lang="ts">
import QRCode from 'qrcode'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useHostId } from '~/composables/useHostId'
import { useWebSocket } from '~/composables/useWebSocket'
import { useSessionStore } from '~/stores/session'
import {
    GAMES,
    type GameId,
    type HostNavigatePayload,
    type HostSyncRequestPayload,
    type HostSyncResponsePayload,
    type SessionSyncRequestPayload,
    type SessionTeamsUpdatedPayload,
    type WSMessage
} from '~/types'

const route = useRoute()
const router = useRouter()
const sessionStore = useSessionStore()
const ws = useWebSocket()
const hostId = useHostId()
const qrCanvas = ref<HTMLCanvasElement>()
const showAddParticipant = ref(false)
const newParticipantName = ref('')

const code = computed(() => (route.params.code as string).toUpperCase())
const games = GAMES

const joinUrl = computed(() => {
  if (typeof window === 'undefined') return ''
  return `${window.location.origin}/play/${code.value}`
})

onMounted(async () => {
  if (!sessionStore.code || sessionStore.code !== code.value) {
    const loaded = sessionStore.loadSession(code.value, true) || sessionStore.hydrateFromStorage()
    if (!loaded) {
      navigateTo('/host')
      return
    }
  }

  ws.connect(code.value)

  function broadcastSessionState() {
    const payload: SessionTeamsUpdatedPayload = {
      participants: [...sessionStore.participants],
      teams: [...sessionStore.teams]
    }
    ws.send('session:teams_updated', payload)
  }

  ws.on('host:sync_request', (message: WSMessage<HostSyncRequestPayload>) => {
    if (message.payload.hostId !== hostId.value) {
      const payload: HostSyncResponsePayload = {
        hostId: hostId.value,
        currentRoute: route.fullPath,
        gameId: null,
        phase: '',
        step: 0,
        totalSteps: 0,
        hostContext: '',
        gameData: {}
      }
      ws.send('host:sync_response', payload)
    }
  })

  ws.on('session:sync_request', (message: WSMessage<SessionSyncRequestPayload>) => {
    if (message.payload.source === 'participant') {
      broadcastSessionState()
    }
  })

  ws.on('host:sync_response', (message: WSMessage<HostSyncResponsePayload>) => {
    const payload = message.payload
    if (payload.hostId === hostId.value) return
    
    if (payload.currentRoute !== route.fullPath && payload.currentRoute.startsWith('/host/')) {
      router.push(payload.currentRoute)
    }
  })

  ws.on('host:navigate', (message: WSMessage<HostNavigatePayload>) => {
    const payload = message.payload
    if (payload.hostId === hostId.value) return
    
    if (payload.route !== route.fullPath) {
      router.push(payload.route)
    }
  })

  setTimeout(() => {
    ws.send('host:sync_request', { hostId: hostId.value } as HostSyncRequestPayload)
  }, 500)

  setTimeout(() => {
    broadcastSessionState()
  }, 700)

  await generateQR()
})

watch(code, async () => {
  await generateQR()
})

async function generateQR() {
  if (qrCanvas.value && joinUrl.value) {
    await QRCode.toCanvas(qrCanvas.value, joinUrl.value, {
      width: 200,
      margin: 0,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    })
  }
}

function addParticipant() {
  if (newParticipantName.value.trim()) {
    sessionStore.addParticipant(newParticipantName.value.trim())
    newParticipantName.value = ''
    showAddParticipant.value = false
  }
}

function addTeam() {
  const teamNumber = sessionStore.teams.length + 1
  sessionStore.createTeam(`Team ${String.fromCharCode(64 + teamNumber)}`)
}

function randomizeTeams() {
  const teamCount = Math.max(2, Math.ceil(sessionStore.participantCount / 3))
  sessionStore.randomizeTeams(teamCount, 3)
}

function getParticipantName(id: string): string {
  return sessionStore.participants.find(p => p.id === id)?.name || ''
}

function getTeamColor(teamId: string): string {
  return sessionStore.teams.find(t => t.id === teamId)?.color || '#6366f1'
}

function getTeamName(teamId: string): string {
  return sessionStore.teams.find(t => t.id === teamId)?.name || ''
}

function isTeamDevice(participantId: string): boolean {
  return sessionStore.participants.find(p => p.id === participantId)?.isTeamDevice || false
}

function getGameStatus(gameId: GameId): string {
  return sessionStore.getGameStatus(gameId).status
}

function startGame(gameId: GameId) {
  sessionStore.updateGameStatus(gameId, 'in_progress')
  
  const targetRoute = `/host/${code.value}/game/${gameId}`
  
  const payload: HostNavigatePayload = {
    hostId: hostId.value,
    route: targetRoute,
    gameId
  }
  ws.send('host:navigate', payload)
  
  navigateTo(targetRoute)
}
</script>


