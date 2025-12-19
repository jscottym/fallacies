export type GameId = 
  | 'logic-traps'
  | 'warmup'
  | 'prosecution'
  | 'antidotes'
  | 'steelman'
  | 'crux-hunt'
  | 'reflection'

export interface GameInfo {
  id: GameId
  name: string
  description: string
  duration: string
  teamMode: 'none' | 'teams' | 'pairs'
  icon: string
  order: number
}

export const GAMES: GameInfo[] = [
  {
    id: 'logic-traps',
    name: 'The 7 Logic Traps',
    description: 'Learn to identify the most common logical fallacies',
    duration: '~15 min',
    teamMode: 'none',
    icon: '🪤',
    order: 1
  },
  {
    id: 'warmup',
    name: 'Warm-Up Round',
    description: 'Practice spotting fallacies in real quotes together',
    duration: '~12 min',
    teamMode: 'none',
    icon: '🎯',
    order: 2
  },
  {
    id: 'prosecution',
    name: 'Fallacy Prosecution',
    description: 'Build fallacious arguments and catch others\' tricks',
    duration: '~20 min',
    teamMode: 'teams',
    icon: '⚖️',
    order: 3
  },
  {
    id: 'antidotes',
    name: 'The Antidotes',
    description: 'Learn what to use instead of fallacies',
    duration: '~15 min',
    teamMode: 'none',
    icon: '💊',
    order: 4
  },
  {
    id: 'steelman',
    name: 'Steelman Showdown',
    description: 'Argue the OTHER side using sound logic',
    duration: '~15 min',
    teamMode: 'teams',
    icon: '🛡️',
    order: 5
  },
  {
    id: 'crux-hunt',
    name: 'The Crux Hunt',
    description: 'Find the core of your disagreements',
    duration: '~12 min',
    teamMode: 'pairs',
    icon: '🔍',
    order: 6
  },
  {
    id: 'reflection',
    name: 'Closing Reflection',
    description: 'Personal commitments and takeaways',
    duration: '~5 min',
    teamMode: 'none',
    icon: '🌟',
    order: 7
  }
]

export interface GameState {
  gameId: GameId
  sessionCode: string
  status: 'not_started' | 'in_progress' | 'completed'
  currentPhase: string
  currentStep: number
  totalSteps: number
  hostContext: string
  startedAt: string
  lastUpdatedAt: string
}

export interface TimerState {
  active: boolean
  remaining: number
  total: number
}

export interface VoteRecord {
  participantId: string
  teamId?: string
  vote: string | string[]
  submittedAt: string
}

export interface TeamScores {
  [teamId: string]: number
}

export interface LogicTrapsState extends GameState {
  gameId: 'logic-traps'
  currentFallacyIndex: number
  selectedParticipantId: string | null
  discussedParticipants: string[]
}

export interface WarmupState extends GameState {
  gameId: 'warmup'
  currentQuoteIndex: number
  votes: VoteRecord[]
  revealed: boolean
}

export interface ProsecutionRound {
  roundNumber: number
  phase: 'topic_selection' | 'building' | 'reviewing' | 'scoring'
  topicSelections: Record<string, { topicId: string; selectedAt: string }>
  arguments: Record<string, { text: string; fallaciesUsed: string[]; submittedAt: string }>
  reviews: Array<{
    reviewingTeamId: string
    targetTeamId: string
    identifiedFallacies: string[]
    submittedAt: string
  }>
  currentReviewTargetIndex: number
}

export interface ProsecutionState extends GameState {
  gameId: 'prosecution'
  rounds: ProsecutionRound[]
  currentRoundIndex: number
  scores: TeamScores
  availableTopicIds: string[]
}

export interface AntidotesState extends GameState {
  gameId: 'antidotes'
  currentAntidoteIndex: number
  selectedParticipantId: string | null
  discussedParticipants: string[]
}

export interface SteelmanRound {
  roundNumber: number
  phase: 'building' | 'reviewing' | 'voting' | 'comparison'
  arguments: Record<string, { text: string; antidotesUsed: string[]; submittedAt: string }>
  reviews: Array<{
    reviewingTeamId: string
    targetTeamId: string
    foundFallacies: string[]
    qualityVote: number
    submittedAt: string
  }>
  persuasionVotes: Record<string, 'fallacious' | 'steelman'>
  currentReviewTargetIndex: number
}

export interface SteelmanState extends GameState {
  gameId: 'steelman'
  rounds: SteelmanRound[]
  currentRoundIndex: number
  scores: TeamScores
}

export interface CruxPair {
  participantIds: [string, string]
  topicId: string
  prompts: Array<{
    promptIndex: number
    responses: Record<string, string>
  }>
  finalCrux: string | null
}

export interface CruxHuntState extends GameState {
  gameId: 'crux-hunt'
  pairs: CruxPair[]
  currentPromptIndex: number
}

export interface ReflectionState extends GameState {
  gameId: 'reflection'
  commitments: Record<string, string>
  currentParticipantIndex: number
  participantOrder: string[]
}

