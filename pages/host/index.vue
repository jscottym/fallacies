<template>
  <div class="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-indigo-950 flex items-center justify-center p-6">
    <div class="max-w-xl w-full">
      <div class="text-center mb-8">
        <NuxtLink to="/" class="text-neutral-400 hover:text-white transition-colors inline-flex items-center gap-2 mb-6">
          <UIcon name="i-heroicons-arrow-left" />
          Back to Home
        </NuxtLink>
        <h1 class="text-4xl font-bold text-white">Create Session</h1>
        <p class="text-neutral-400 mt-2">Set up a new session for your group</p>
      </div>

      <div class="game-card space-y-6">
        <UFormField label="Session Name (optional)">
          <UInput
            v-model="sessionName"
            placeholder="e.g., Smith Family Cruise"
            size="lg"
          />
        </UFormField>

        <UButton
          color="primary"
          size="lg"
          block
          @click="createSession"
        >
          <UIcon name="i-heroicons-play" class="mr-2" />
          Create Session
        </UButton>
      </div>

      <div class="mt-6 game-card space-y-4">
        <h2 class="text-xl font-semibold text-white text-center">Join as Co-host</h2>
        <UFormField label="Existing Session Code">
          <UInput
            v-model="joinCode"
            placeholder="Enter 6-character code"
            size="lg"
            class="uppercase"
            @keyup.enter="joinAsHost"
          />
        </UFormField>
        <UButton
          color="neutral"
          size="lg"
          block
          :disabled="joinCode.length !== 6"
          @click="joinAsHost"
        >
          Join Existing Session as Host
        </UButton>
      </div>

      <div v-if="recentSessions.length > 0" class="mt-8">
        <h3 class="text-lg font-medium text-neutral-400 mb-4 text-center">Or Resume a Previous Session</h3>
        <div class="space-y-3">
          <div
            v-for="session in recentSessions"
            :key="session.code"
            class="game-card cursor-pointer flex items-center justify-between"
            @click="resumeSession(session.code)"
          >
            <div>
              <div class="font-medium text-white">{{ session.name || session.code }}</div>
              <div class="text-sm text-neutral-500">
                {{ session.participants.length }} participants • 
                {{ formatDate(session.lastAccessedAt) }}
              </div>
            </div>
            <div class="text-2xl font-mono text-indigo-400">{{ session.code }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useStorage } from '~/composables/useStorage'
import { useSessionStore } from '~/stores/session'
import type { SessionData } from '~/types'

const sessionStore = useSessionStore()
const sessionName = ref('')
const recentSessions = ref<SessionData[]>([])
const joinCode = ref('')

onMounted(() => {
  const storage = useStorage()
  recentSessions.value = storage.getRecentSessions(5)
})

function createSession() {
  const code = sessionStore.createSession(sessionName.value)
  navigateTo(`/host/${code}`)
}

function resumeSession(code: string) {
  sessionStore.loadSession(code, true)
  navigateTo(`/host/${code}`)
}

function joinAsHost() {
  if (joinCode.value.length === 6) {
    navigateTo(`/host/${joinCode.value.toUpperCase()}`)
  }
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  
  if (diffHours < 1) return 'just now'
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays === 1) return 'yesterday'
  return `${diffDays}d ago`
}
</script>

