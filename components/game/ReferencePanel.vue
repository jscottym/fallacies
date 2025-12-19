<template>
  <USlideover v-model:open="isOpen" side="right">
    <template #content>
      <div class="h-full flex flex-col bg-gray-900">
        <div class="p-4 border-b border-gray-800 flex items-center justify-between">
          <h2 class="text-lg font-semibold text-white">Reference</h2>
          <UButton size="xs" variant="ghost" @click="isOpen = false">
            <UIcon name="i-heroicons-x-mark" />
          </UButton>
        </div>

        <UTabs :items="tabs" class="flex-1 flex flex-col">
          <template #fallacies>
            <div class="p-4 space-y-3 overflow-y-auto">
              <div
                v-for="fallacy in contentStore.fallacies"
                :key="fallacy.id"
                class="p-3 bg-gray-800/50 rounded-lg cursor-pointer hover:bg-gray-800 transition-colors"
                @click="toggleExpanded(fallacy.id)"
              >
                <div class="flex items-center justify-between">
                  <div>
                    <div class="font-medium text-white">{{ fallacy.name }}</div>
                    <div class="text-sm text-indigo-400">"{{ fallacy.nickname }}"</div>
                  </div>
                  <UIcon 
                    :name="expanded === fallacy.id ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'"
                    class="text-gray-500"
                  />
                </div>
                <div v-if="expanded === fallacy.id" class="mt-3 pt-3 border-t border-gray-700">
                  <p class="text-gray-300 text-sm">{{ fallacy.definition }}</p>
                  <div class="mt-2">
                    <div class="text-xs text-gray-500 uppercase tracking-wide mb-1">Why it works</div>
                    <p class="text-gray-400 text-sm">{{ fallacy.whyItWorks }}</p>
                  </div>
                </div>
              </div>
            </div>
          </template>

          <template #antidotes>
            <div class="p-4 space-y-3 overflow-y-auto">
              <div
                v-for="antidote in contentStore.antidotes"
                :key="antidote.id"
                class="p-3 bg-gray-800/50 rounded-lg cursor-pointer hover:bg-gray-800 transition-colors"
                @click="toggleExpanded(antidote.id)"
              >
                <div class="flex items-center justify-between">
                  <div>
                    <div class="font-medium text-white">{{ antidote.name }}</div>
                    <div class="text-sm text-green-400">Counters: {{ antidote.counters.join(', ') }}</div>
                  </div>
                  <UIcon 
                    :name="expanded === antidote.id ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'"
                    class="text-gray-500"
                  />
                </div>
                <div v-if="expanded === antidote.id" class="mt-3 pt-3 border-t border-gray-700">
                  <p class="text-gray-300 text-sm">{{ antidote.definition }}</p>
                  <div class="mt-2">
                    <div class="text-xs text-gray-500 uppercase tracking-wide mb-1">How to apply</div>
                    <ul class="text-gray-400 text-sm space-y-1">
                      <li v-for="step in antidote.howToApply" :key="step" class="flex items-start gap-2">
                        <span class="text-green-500">•</span>
                        <span>{{ step }}</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </UTabs>
      </div>
    </template>
  </USlideover>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useContentStore } from '~/stores/content'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const contentStore = useContentStore()
const expanded = ref<string | null>(null)

const isOpen = computed({
  get: () => props.open,
  set: (value) => emit('update:open', value)
})

const tabs = [
  { label: 'Fallacies', slot: 'fallacies' },
  { label: 'Antidotes', slot: 'antidotes' }
]

function toggleExpanded(id: string) {
  expanded.value = expanded.value === id ? null : id
}
</script>

