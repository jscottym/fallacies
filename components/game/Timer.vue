<template>
  <div class="flex items-center gap-3">
    <div 
      class="text-3xl font-mono font-bold tabular-nums"
      :class="statusClass"
    >
      {{ formattedTime }}
    </div>
    <div v-if="showControls" class="flex gap-2">
      <UButton size="xs" variant="soft" @click="$emit('extend', 30)">
        +30s
      </UButton>
      <UButton size="xs" variant="soft" color="red" @click="$emit('stop')">
        <UIcon name="i-heroicons-stop" />
      </UButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  remaining: number
  total?: number
  showControls?: boolean
}>()

defineEmits<{
  extend: [seconds: number]
  stop: []
}>()

const formattedTime = computed(() => {
  const mins = Math.floor(props.remaining / 60)
  const secs = props.remaining % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
})

const status = computed(() => {
  if (props.remaining <= 0) return 'expired'
  if (props.remaining <= 10) return 'critical'
  if (props.remaining <= 30) return 'warning'
  return 'normal'
})

const statusClass = computed(() => ({
  'text-white': status.value === 'normal',
  'text-yellow-500': status.value === 'warning',
  'text-red-500 animate-pulse': status.value === 'critical',
  'text-gray-500': status.value === 'expired'
}))
</script>

