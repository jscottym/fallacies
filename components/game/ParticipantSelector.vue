<template>
  <div class="space-y-4">
    <UFormField :label="label">
      <UInput
        v-model="localValue"
        :placeholder="placeholder"
        size="lg"
        @keyup.enter="$emit('enter')"
      />
    </UFormField>

    <div v-if="participants.length" class="space-y-3">
      <div class="text-sm text-neutral-400">
        {{ listLabel }}
      </div>
      <div class="space-y-3">
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
            <UButton
              v-for="p in group.participants"
              :key="p.id"
              size="sm"
              variant="soft"
              @click="$emit('select-participant', p.id)"
            >
              {{ p.name }}
            </UButton>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Participant, Team } from '~/types'

const props = defineProps<{
  modelValue: string
  participants: Participant[]
  teams?: Team[]
  label?: string
  placeholder?: string
  listLabel?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'select-participant', id: string): void
  (e: 'enter'): void
}>()

const localValue = computed({
  get: () => props.modelValue,
  set: (value: string) => emit('update:modelValue', value)
})

const groupedParticipants = computed(() => {
  const teamsById: Record<string, Team> = {}
  ;(props.teams || []).forEach((team) => {
    teamsById[team.id] = team
  })

  const byKey: Record<
    string,
    { key: string; label: string; color?: string; participants: Participant[] }
  > = {}

  props.participants.forEach((p) => {
    const key = p.teamId || 'unassigned'
    if (!byKey[key]) {
      if (p.teamId && teamsById[p.teamId]) {
        const team = teamsById[p.teamId]
        byKey[key] = {
          key,
          label: team.name,
          color: team.color,
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
</script>



