<template>
  <div class="h-full flex flex-col p-4">
    <div class="flex-1 flex items-center justify-center">
      <div class="text-center space-y-6">
        <div class="text-5xl">🌟</div>
        <h2 class="text-xl font-bold text-white">Reflection Time</h2>
        
        <div class="game-card">
          <p class="text-neutral-300">
            "What's ONE thing you'll do differently in arguments or discussions after today?"
          </p>
        </div>

        <div class="space-y-3">
          <UInput 
            v-model="commitment" 
            placeholder="My commitment..."
            size="lg"
          />
          <UButton 
            color="primary" 
            block 
            :disabled="!commitment.trim()"
            @click="submitCommitment"
          >
            Share My Commitment
          </UButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useGameStore } from '~/stores/game'
import { useSessionStore } from '~/stores/session'

const gameStore = useGameStore()
const sessionStore = useSessionStore()

const commitment = ref('')

function submitCommitment() {
  if (!commitment.value.trim()) return
  
  const commitments = (gameStore.gameData.commitments as Record<string, string>) || {}
  commitments[sessionStore.currentParticipantId!] = commitment.value
  gameStore.updateGameData({ commitments })
}
</script>

