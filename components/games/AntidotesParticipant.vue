<template>
  <div class="h-full flex items-center justify-center p-6">
    <div class="text-center space-y-6">
      <div class="text-5xl">💊</div>
      <h2 class="text-xl font-bold text-white">The Antidotes</h2>
      <p class="text-neutral-400">Follow along on the main screen</p>
      <div class="game-card">
        <div class="text-sm text-neutral-500">Currently viewing</div>
        <div class="text-lg text-white">{{ gameStore.hostContext }}</div>
      </div>
      <UButton variant="soft" @click="$emit('openReference')">
        <UIcon name="i-heroicons-book-open" class="mr-2" />
        View Reference
      </UButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useGameStore } from '~/stores/game';

defineEmits<{
  openReference: []
}>()

const gameStore = useGameStore()
</script>

