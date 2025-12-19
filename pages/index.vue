<template>
  <div class="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-indigo-950 flex items-center justify-center p-6">
    <div class="max-w-2xl w-full text-center space-y-12">
      <div class="space-y-4">
        <div class="text-6xl mb-6">🧠</div>
        <h1 class="text-5xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
          Logic & Truth
        </h1>
        <p class="text-xl text-neutral-400">
          An interactive journey through logical fallacies and sound reasoning
        </p>
      </div>

      <div class="grid md:grid-cols-2 gap-6">
        <div class="game-card cursor-pointer group" @click="navigateTo('/host')">
          <div class="text-4xl mb-4 group-hover:scale-110 transition-transform">🎬</div>
          <h2 class="text-2xl font-semibold text-white mb-2">Host a Session</h2>
          <p class="text-neutral-400">Create a new session and run the presentation for your group</p>
        </div>

        <div class="game-card cursor-pointer group" @click="showJoinModal = true">
          <div class="text-4xl mb-4 group-hover:scale-110 transition-transform">📱</div>
          <h2 class="text-2xl font-semibold text-white mb-2">Join a Session</h2>
          <p class="text-neutral-400">Enter a session code to participate from your device</p>
        </div>
      </div>

      <div v-if="recentSessions.length > 0" class="pt-8 border-t border-neutral-800">
        <h3 class="text-lg font-medium text-neutral-400 mb-4">Recent Sessions</h3>
        <div class="flex flex-wrap justify-center gap-3">
          <UButton
            v-for="session in recentSessions"
            :key="session.code"
            variant="soft"
            color="neutral"
            @click="resumeSession(session.code)"
          >
            {{ session.name || session.code }}
            <span class="text-neutral-500 ml-2">{{ formatDate(session.lastAccessedAt) }}</span>
          </UButton>
        </div>
      </div>
    </div>

    <UModal v-model:open="showJoinModal">
      <template #content>
        <div class="p-6 space-y-6">
          <h3 class="text-xl font-semibold text-white">Join Session</h3>
          <UFormField label="Session Code">
            <UInput
              v-model="joinCode"
              placeholder="Enter 6-character code"
              size="lg"
              class="uppercase"
              @keyup.enter="joinSession"
            />
          </UFormField>
          <div class="flex gap-3 justify-end">
            <UButton variant="ghost" @click="showJoinModal = false">Cancel</UButton>
            <UButton color="primary" :disabled="joinCode.length !== 6" @click="joinSession">
              Join
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useStorage } from '~/composables/useStorage'
import type { SessionData } from '~/types'

const showJoinModal = ref(false)
const joinCode = ref('')
const recentSessions = ref<SessionData[]>([])

onMounted(() => {
  const storage = useStorage()
  recentSessions.value = storage.getRecentSessions(3)
})

function joinSession() {
  if (joinCode.value.length === 6) {
    navigateTo(`/play/${joinCode.value.toUpperCase()}`)
  }
}

function resumeSession(code: string) {
  navigateTo(`/host/lobby?code=${code}`)
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

