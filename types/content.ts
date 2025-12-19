export interface FallacyExample {
  text: string
  topic: string
  analysis: string
}

export interface Fallacy {
  id: string
  name: string
  nickname: string
  definition: string
  whyItWorks: string
  examples: FallacyExample[]
  antidoteId: string
  promptStarters: string[]
}

export interface AntidoteExample {
  before: string
  after: string
  topic: string
}

export interface Antidote {
  id: string
  name: string
  definition: string
  counters: string[]
  howToApply: string[]
  examples: AntidoteExample[]
  promptStarters: string[]
}

export interface TopicPosition {
  label: string
  statement: string
  fallacyPrompts: Array<{ fallacy: string; starter: string }>
  soundPrompts: Array<{ antidote: string; starter: string }>
}

export interface Topic {
  id: string
  name: string
  positionA: TopicPosition
  positionB: TopicPosition
  cruxQuestions: string[]
}

export interface WarmupQuote {
  id: string
  text: string
  correctFallacies: string[]
  topic: string
  explanation: string
}

export interface ComplexExample {
  id: string
  text: string
  correctFallacies: string[]
  topic: string
  explanations: Record<string, string>
}

export interface SlideContent {
  type: 'title' | 'definition' | 'example' | 'discussion' | 'recap' | 'transition'
  title?: string
  subtitle?: string
  content?: string
  bullets?: string[]
  quote?: string
  analysis?: string
  discussionPrompt?: string
  fallacyId?: string
  antidoteId?: string
}

export interface GameContent {
  id: string
  name: string
  slides: SlideContent[]
}

