export type WSEventType =
  | 'session:join'
  | 'session:leave'
  | 'session:participant_joined'
  | 'session:participant_left'
  | 'session:teams_updated'
  | 'game:start'
  | 'game:advance'
  | 'game:end'
  | 'game:vote'
  | 'game:submit'
  | 'game:topic_select'
  | 'game:state_update'
  | 'game:vote_received'
  | 'game:submission_received'
  | 'game:topic_claimed'
  | 'game:timer_tick'
  | 'game:results'
  | 'ping'
  | 'pong'

export interface WSMessage<T = unknown> {
  type: WSEventType
  sessionCode: string
  payload: T
  timestamp: string
}

export interface JoinPayload {
  participantName: string
  participantId?: string
}

export interface LeavePayload {
  participantId: string
}

export interface GameStartPayload {
  gameId: string
}

export interface GameAdvancePayload {
  gameId: string
  phase: string
  step: number
  context: string
}

export interface VotePayload {
  gameId: string
  participantId: string
  teamId?: string
  vote: string | string[]
}

export interface SubmitPayload {
  gameId: string
  teamId: string
  submission: {
    text: string
    techniques: string[]
  }
}

export interface TopicSelectPayload {
  gameId: string
  teamId: string
  topicId: string
}

export interface StateUpdatePayload {
  gameId: string
  phase: string
  step: number
  context: string
  data?: Record<string, unknown>
}

export interface TimerTickPayload {
  remaining: number
  total: number
}

