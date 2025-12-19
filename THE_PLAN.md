# THE PLAN: Logic & Truth Family Session App

## Overview

An interactive presentation and game app for teaching logical fallacies, sound reasoning, and collaborative truth-seeking. Designed for family/group sessions where one host controls a presentation display while participants interact via their phones or shared devices.

---

## Table of Contents

1. [Session Architecture](#session-architecture)
2. [Data Persistence](#data-persistence)
3. [Game Flow](#game-flow)
4. [Game Details](#game-details)
5. [UI/UX Specifications](#uiux-specifications)
6. [Technical Architecture](#technical-architecture)
7. [Content Structure](#content-structure)
8. [Build Order](#build-order)

---

## Session Architecture

### Session Codes

Every session requires a unique session code for data segmentation:

- **Format**: 6-character alphanumeric (e.g., `ABC123`)
- **Generation**: Random on session creation
- **Purpose**: 
  - Isolates all session data (participants, teams, scores, game state)
  - Allows multiple concurrent sessions
  - Enables session resume if browser refreshes

### Joining a Session

**Host Flow:**
1. Host visits app → "Create Session" or "Resume Session"
2. Create: Generates new session code, shows QR code + URL
3. Resume: Enter existing session code → loads saved state

**Participant Flow:**
1. Scan QR code OR enter URL with session code
2. Enter name (or select from saved names if rejoining)
3. Wait in lobby until host starts a game

### Team Formation

- **Default team size**: 3 participants per team
- **Team assignment**: Host can manually assign or randomize
- **Flexible teaming**: Not everyone needs a phone—teams can share one device
- **Team device**: One participant per team acts as the "team device" for submissions

---

## Data Persistence

### Storage Strategy

All data persisted to **localStorage** on the host machine, segmented by session code.

```typescript
// Storage key pattern
`fallacies:session:${sessionCode}` → SessionData
`fallacies:session:${sessionCode}:game:${gameId}` → GameData
```

### Session Data Schema

```typescript
interface SessionData {
  code: string
  name: string
  createdAt: string
  lastAccessedAt: string
  participants: Participant[]
  teams: Team[]
  gamesState: {
    [gameId: string]: {
      status: 'not_started' | 'in_progress' | 'completed'
      startedAt?: string
      completedAt?: string
    }
  }
}

interface Participant {
  id: string
  name: string
  joinedAt: string
  teamId: string | null
  isTeamDevice: boolean  // This device submits for the team
}

interface Team {
  id: string
  name: string  // "Team A", "Team B", etc. or custom names
  memberIds: string[]
  color: string  // For UI differentiation
}
```

### Game Data Schema

Each game stores its own data in a separate localStorage key to prevent overwrites:

```typescript
interface GameData {
  gameId: string
  sessionCode: string
  status: 'not_started' | 'in_progress' | 'completed'
  currentPhase: string
  currentStep: number
  totalSteps: number
  
  // Game-specific data stored in typed sub-objects
  rounds: GameRound[]
  scores: TeamScores
  votes: VoteRecord[]
  discussions: DiscussionRecord[]
  
  // Timestamps for resume capability
  startedAt: string
  lastUpdatedAt: string
}

// Example: Fallacy Prosecution specific data
interface FallacyProsecutionData extends GameData {
  gameId: 'fallacy-prosecution'
  rounds: {
    roundNumber: number
    phase: 'topic_selection' | 'building' | 'reviewing' | 'scoring'
    topicSelections: {
      [teamId: string]: {
        topicId: string
        selectedAt: string
      }
    }
    arguments: {
      [teamId: string]: {
        text: string
        fallaciesUsed: string[]
        submittedAt: string
      }
    }
    reviews: {
      reviewingTeamId: string
      targetTeamId: string
      identifiedFallacies: string[]
      submittedAt: string
    }[]
    scores: {
      [teamId: string]: {
        sneakyPoints: number
        catchPoints: number
      }
    }
  }[]
}
```

### Data Safety

- **Deep merge updates**: Never overwrite entire objects; use deep merge for updates
- **Atomic updates**: Each game phase completion triggers a save
- **Conflict prevention**: Use timestamps to detect stale writes
- **Auto-save**: Save state on every meaningful action

```typescript
// Example: Safe update pattern
function updateGameData(sessionCode: string, gameId: string, updates: Partial<GameData>) {
  const key = `fallacies:session:${sessionCode}:game:${gameId}`
  const existing = JSON.parse(localStorage.getItem(key) || '{}')
  const merged = deepMerge(existing, {
    ...updates,
    lastUpdatedAt: new Date().toISOString()
  })
  localStorage.setItem(key, JSON.stringify(merged))
}
```

---

## Game Flow

### Game Menu

Games are presented in recommended order but can be started independently:

| # | Game | Duration | Team Mode | Description |
|---|------|----------|-----------|-------------|
| 1 | The 7 Logic Traps | 15 min | None | Presentation teaching fallacies |
| 2 | Warm-Up Round | 12 min | None | Collaborative fallacy spotting |
| 3 | Fallacy Prosecution | 20 min | Teams of 3 | Build fallacious arguments, catch others' |
| 4 | The Antidotes | 15 min | None | Presentation on sound reasoning |
| 5 | Steelman Showdown | 15 min | Teams of 3 | Argue the OTHER side with sound logic |
| 6 | The Crux Hunt | 12 min | Pairs | Find core disagreements |
| 7 | Closing Reflection | 5 min | None | Personal commitments |

### Game Lifecycle

```
NOT STARTED → IN PROGRESS → COMPLETED
     ↓              ↓
  [Start]     [Exit w/ confirm]
                   ↓
              PAUSED (saved)
                   ↓
              [Resume]
```

### Exit Protection

- **In-game exit**: Requires confirmation modal
- **Browser close/refresh**: State auto-saved, can resume
- **Accidental navigation**: Browser beforeunload warning

---

## Game Details

### Game 1: The 7 Logic Traps

**Type**: Presentation + Discussion  
**Team Mode**: None (whole group)  
**Participant Interaction**: View current topic, notified when selected for discussion

#### Phases

1. **Intro** (2 slides)
   - What is a logical fallacy?
   - Validity vs. Soundness explainer

2. **Fallacy Presentations** (7 fallacies × 4 slides each = 28 slides)
   - Definition + nickname
   - Why it works (psychology)
   - Example 1 (with reveal)
   - Example 2 (with reveal)
   - Discussion prompt (random participant selected)

3. **Recap** (1 slide)
   - All 7 fallacies displayed

#### Host View

- Full slide content
- Navigation: Back / Next
- Discussion prompts: Random person selector with "Pick Someone Else" option
- Timer: Optional for discussion segments

#### Participant View

- **Header**: Current fallacy name + step indicator
- **Content context**: Shows abbreviated version of what's on screen
- **Discussion notification**: Full-screen alert when selected
- **Reference access**: Button to view all fallacies

---

### Game 2: Warm-Up Round

**Type**: Collaborative Quiz  
**Team Mode**: None (individuals or whole group)  
**Participant Interaction**: Vote on fallacy identification

#### Phases

1. **Intro** (1 slide)
2. **Simple Quotes** (8 quotes)
   - Display quote
   - Voting period (30 sec timer)
   - Results reveal + discussion
3. **Complex Examples** (2 multi-fallacy passages)
   - Display passage
   - Multi-select voting (45 sec timer)
   - Results reveal + discussion
4. **Recap** (1 slide)
   - Accuracy stats

#### Host View

```
┌─────────────────────────────────────────────────────────┐
│  WARM-UP ROUND • Quote 3 of 10                 [📖][☰]  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   ┌─────────────────────────────────────────────────┐  │
│   │  "You're worried about influencer health claims? │  │
│   │   What about all the people Big Pharma has       │  │
│   │   killed with opioids?"                          │  │
│   └─────────────────────────────────────────────────┘  │
│                                                         │
│              ⏱️ 0:24 remaining                          │
│                                                         │
│   Votes: 5/8  ████████░░░░                             │
│                                                         │
│   [End Voting Early]              [Reveal Results]      │
└─────────────────────────────────────────────────────────┘
```

#### Participant View

```
┌───────────────────────────┐
│  WARM-UP • Quote 3/10     │
├───────────────────────────┤
│                           │
│  QUOTE:                   │
│  "You're worried about    │
│   influencer health       │
│   claims? What about..."  │
│                           │
│  [View Full Quote]        │
│                           │
│  WHICH FALLACY?           │
│  ○ Ad Hominem             │
│  ○ Straw Man              │
│  ● Whataboutism           │
│  ○ False Dilemma          │
│  ○ Slippery Slope         │
│  ○ Appeal to Authority    │
│  ○ Causation Con          │
│                           │
│  ⏱️ 0:24                   │
│  [Submit Vote]            │
└───────────────────────────┘
```

**Key**: Participant always sees abbreviated quote/context at top + full view option.

---

### Game 3: Fallacy Prosecution

**Type**: Team Competition  
**Team Mode**: Teams of 3 (all teams work in parallel)  
**Participant Interaction**: Topic selection, argument building, fallacy identification

#### Key Design Principles

- **No downtime**: All teams work simultaneously
- **Parallel building**: Every team builds during build phase
- **Parallel reviewing**: Every team reviews others during review phase
- **First-pick topics**: Teams race to claim topics (no duplicates)

#### Phases

1. **Team Setup**
   - Confirm team assignments
   - Designate "team device" per team (for submissions)

2. **Topic Selection** (60 sec)
   - All teams see available topics
   - First team to select a topic claims it
   - Topics show "Claimed by Team X" once selected
   - Each team must select one topic

3. **Build Phase** (3 min)
   - All teams build simultaneously
   - Argument Builder with AI suggestions
   - Must include at least 2 fallacies
   - Timer visible to all

4. **Review Phase** (per argument, 2 min each)
   - Host displays Team A's argument
   - ALL OTHER TEAMS identify fallacies simultaneously
   - Timer for each review
   - Repeat for each team's argument

5. **Scoring Reveal**
   - Show each argument's hidden fallacies
   - Award points for:
     - Sneaky fallacies (not caught by most teams)
     - Correct identifications
     - Bonus for catching all fallacies

6. **Optional Round 2**
   - New topics
   - Repeat phases 2-5

#### Host View - Topic Selection

```
┌─────────────────────────────────────────────────────────┐
│  FALLACY PROSECUTION • Topic Selection         [📖][☰]  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   SELECT YOUR TEAM'S TOPIC                              │
│   First to pick claims it!                              │
│                                                         │
│   ⏱️ 0:42 remaining                                     │
│                                                         │
│   ┌────────────────────────┐  ┌────────────────────────┐│
│   │ Immigration            │  │ Cancel Culture         ││
│   │ ✓ Claimed by Team A    │  │ [Available]            ││
│   └────────────────────────┘  └────────────────────────┘│
│   ┌────────────────────────┐  ┌────────────────────────┐│
│   │ Prison Reform          │  │ Influencer Health      ││
│   │ ✓ Claimed by Team B    │  │ [Available]            ││
│   └────────────────────────┘  └────────────────────────┘│
│                                                         │
│   Team C: Selecting...                                  │
│   Team D: Selecting...                                  │
│                                                         │
├─────────────────────────────────────────────────────────┤
│   [All Topics Selected → Start Building]                │
└─────────────────────────────────────────────────────────┘
```

#### Host View - Build Phase

```
┌─────────────────────────────────────────────────────────┐
│  FALLACY PROSECUTION • Building                [📖][☰]  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   ALL TEAMS: BUILD YOUR ARGUMENTS                       │
│                                                         │
│   ⏱️ 2:14 remaining                                     │
│                                                         │
│   ┌─────────────────────────────────────────────────┐  │
│   │ Team A          │ Team B          │ Team C      │  │
│   │ Immigration     │ Prison Reform   │ Cancel...   │  │
│   │ ████████░░      │ ██████████      │ ████░░░░    │  │
│   │ Building...     │ ✓ Submitted     │ Building... │  │
│   └─────────────────────────────────────────────────┘  │
│                                                         │
│   Tip: Arguments should be 2-4 sentences with          │
│   at least 2 fallacies hidden inside.                  │
│                                                         │
├─────────────────────────────────────────────────────────┤
│   [End Building Early] (when all submitted)             │
└─────────────────────────────────────────────────────────┘
```

#### Host View - Review Phase

```
┌─────────────────────────────────────────────────────────┐
│  FALLACY PROSECUTION • Review Team A           [📖][☰]  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   TEAM A'S ARGUMENT (Topic: Immigration)                │
│                                                         │
│   ┌─────────────────────────────────────────────────┐  │
│   │  "Anyone questioning strict enforcement clearly  │  │
│   │   doesn't care about American workers. These    │  │
│   │   open-borders academics just want to lecture   │  │
│   │   us while crime explodes. Either we enforce    │  │
│   │   the law or become a failed state."            │  │
│   └─────────────────────────────────────────────────┘  │
│                                                         │
│   ⏱️ 1:32 remaining                                     │
│                                                         │
│   Teams identifying fallacies:                          │
│   Team B: ████████ Submitted                            │
│   Team C: ████░░░░ Working...                           │
│   Team D: ░░░░░░░░ Not started                          │
│                                                         │
├─────────────────────────────────────────────────────────┤
│   [Reveal Results]                                      │
└─────────────────────────────────────────────────────────┘
```

#### Participant View - Topic Selection

```
┌───────────────────────────┐
│  PROSECUTION • Topics     │
│  Team A                   │
├───────────────────────────┤
│                           │
│  Pick your topic!         │
│  First to pick wins.      │
│                           │
│  ⏱️ 0:42                   │
│                           │
│  ┌─────────────────────┐  │
│  │ Immigration    [✓]  │  │
│  │ Claimed by YOU      │  │
│  └─────────────────────┘  │
│  ┌─────────────────────┐  │
│  │ Cancel Culture      │  │
│  │ [Select]            │  │
│  └─────────────────────┘  │
│  ┌─────────────────────┐  │
│  │ Prison Reform       │  │
│  │ Claimed by Team B   │  │
│  └─────────────────────┘  │
│  ┌─────────────────────┐  │
│  │ Influencer Health   │  │
│  │ [Select]            │  │
│  └─────────────────────┘  │
│                           │
└───────────────────────────┘
```

#### Participant View - Argument Builder

```
┌───────────────────────────┐
│  PROSECUTION • Build      │
│  Team A • Immigration     │
├───────────────────────────┤
│                           │
│  YOUR ARGUMENT:           │
│  ┌─────────────────────┐  │
│  │ Anyone questioning  │  │
│  │ strict enforcement  │  │
│  │ clearly doesn't     │  │
│  │ care about...       │  │
│  │                     │  │
│  └─────────────────────┘  │
│                           │
│  ADD FALLACY:             │
│  [+ Ad Hominem     ]      │
│  [+ Straw Man      ]      │
│  [+ False Dilemma  ]      │
│  [+ Slippery Slope ]      │
│  [+ Appeal to Auth ]      │
│  [+ Whataboutism   ]      │
│  [+ Causation Con  ]      │
│                           │
│  [🤖 AI Suggest]          │
│                           │
│  Fallacies used: 2        │
│  ☑ Ad Hominem             │
│  ☑ False Dilemma          │
│                           │
│  ⏱️ 2:14                   │
│  [Submit Argument]        │
└───────────────────────────┘
```

#### Participant View - Review (Other Team's Argument)

```
┌───────────────────────────┐
│  PROSECUTION • Review     │
│  Team B reviewing Team A  │
├───────────────────────────┤
│                           │
│  TEAM A'S ARGUMENT:       │
│  (Immigration)            │
│                           │
│  "Anyone questioning      │
│   strict enforcement      │
│   clearly doesn't care    │
│   about American workers. │
│   These open-borders..."  │
│                           │
│  [View Full Argument]     │
│                           │
│  WHICH FALLACIES?         │
│  ☑ Ad Hominem             │
│  ☐ Straw Man              │
│  ☑ False Dilemma          │
│  ☐ Slippery Slope         │
│  ☐ Appeal to Authority    │
│  ☐ Whataboutism           │
│  ☐ Causation Con          │
│                           │
│  ⏱️ 1:32                   │
│  [Submit Review]          │
└───────────────────────────┘
```

#### Scoring Logic

```
For each team's argument:
  - Award 1 "Sneaky Point" per fallacy not caught by majority of teams
  - Award 0 "Sneaky Points" if fallacy caught by majority

For each reviewing team:
  - Award 2 points per correctly identified fallacy
  - Deduct 1 point per false accusation
  - Bonus 3 points if all fallacies correctly identified (no misses, no false positives)
```

---

### Game 4: The Antidotes

**Type**: Presentation + Discussion  
**Team Mode**: None  
**Participant Interaction**: View current topic, discussion participation

#### Phases

1. **Intro** (2 slides)
   - Transition from catching fallacies to building good arguments
   - Revisit validity + soundness

2. **Antidote Presentations** (5 antidotes × 3 slides each = 15 slides)
   - Definition + which fallacy it counters
   - How to apply it
   - Example (before/after)
   - Discussion prompt

3. **Bonus Principles** (3 slides)
   - Principle of Charity
   - Confidence Calibration
   - Update Publicly

4. **Integrated Discussion** (3 discussion prompts)
   - "When did someone change your mind?"
   - "Winning vs. truth-seeking?"
   - "How do you signal openness?"

#### The 5 Antidotes

| Antidote | Counters | Core Idea |
|----------|----------|-----------|
| Steelmanning | Straw Man | Represent the strongest version of opposing views |
| Separate Claim from Claimant | Ad Hominem, Appeal to Authority | Evaluate arguments on merit, not source |
| Acknowledge the Spectrum | False Dilemma | Most issues have more than two positions |
| Stay in the Lane | Whataboutism | Address the actual point raised |
| Demand the Mechanism | Causation Con, Slippery Slope | Ask "how specifically does A cause B?" |

---

### Game 5: Steelman Showdown

**Type**: Team Competition  
**Team Mode**: Teams of 3 (all teams work in parallel)  
**Participant Interaction**: Sound argument building, voting

#### Key Design Principles

Same as Fallacy Prosecution:
- All teams work simultaneously
- No downtime
- Parallel building, parallel reviewing

#### Phases

1. **Setup**
   - Teams get assigned the OPPOSITE position from Fallacy Prosecution
   - Same topics, other side

2. **Build Phase** (3 min)
   - All teams build sound arguments simultaneously
   - Sound Argument Builder (antidote prompts instead of fallacy prompts)
   - Must use at least 2 antidote techniques
   - No fallacies allowed

3. **Present & Review** (per team)
   - Display argument
   - Other teams check for:
     - Hidden fallacies (penalty if found)
     - Quality of steelmanning (vote)

4. **Comparison**
   - Side-by-side: Team's fallacious version vs. steelmanned version
   - Family votes: Which was more persuasive?

5. **Discussion**
   - Why was steelmanned version often more effective?

#### Participant View - Sound Argument Builder

```
┌───────────────────────────┐
│  STEELMAN • Build         │
│  Team A • Immigration     │
│  (Argue AGAINST strict    │
│   enforcement)            │
├───────────────────────────┤
│                           │
│  YOUR ARGUMENT:           │
│  ┌─────────────────────┐  │
│  │ While concerns about│  │
│  │ enforcement are     │  │
│  │ valid, the evidence │  │
│  │ suggests...         │  │
│  └─────────────────────┘  │
│                           │
│  USE ANTIDOTES:           │
│  [+ Cite Evidence    ]    │
│  [+ Acknowledge      ]    │
│  [+  Other Side      ]    │
│  [+ State Confidence ]    │
│  [+  Level           ]    │
│  [+ Demand Mechanism ]    │
│                           │
│  [🤖 AI Suggest]          │
│                           │
│  Techniques used: 2       │
│  ☑ Acknowledge Other Side │
│  ☑ Cite Evidence          │
│                           │
│  ⏱️ 2:44                   │
│  [Submit Argument]        │
└───────────────────────────┘
```

---

### Game 6: The Crux Hunt

**Type**: Collaborative Pairs  
**Team Mode**: Pairs (can be random or assigned)  
**Participant Interaction**: Guided prompts, crux articulation

#### Phases

1. **Intro** (2 slides)
   - What is a "crux"?
   - Demo the process

2. **Pairing**
   - Randomly assign pairs (or host assigns)
   - Each pair gets a topic with opposing positions

3. **Guided Crux Finding** (4 min per pair)
   - Both participants answer same prompts on their devices
   - Prompts guide toward finding the crux:
     1. "What's your initial position?"
     2. "What would change your mind?"
     3. "What do you think THEY believe that you don't?"
     4. "What's the ONE factual or value question at the heart of this?"

4. **Articulate** 
   - Pairs state their discovered crux
   - Displayed for all

5. **Debrief**
   - Were we closer than we thought?
   - Is the crux factual (can look it up) or value-based?

#### Guided Prompts Flow

```
PROMPT 1: "What's your position on [topic]?"
  → Both submit privately
  → Revealed to each other

PROMPT 2: "What would change your mind?"
  → Both submit privately  
  → Revealed to each other

PROMPT 3: "What do you think they believe that you don't?"
  → Both submit privately
  → Revealed to each other
  → Often reveals misunderstanding!

PROMPT 4: "Based on this, what's the ONE core question?"
  → Both submit
  → Compare and refine together
  → Submit final crux statement
```

---

### Game 7: Closing Reflection

**Type**: Discussion  
**Team Mode**: None  
**Participant Interaction**: Commitment submission (optional)

#### Phases

1. **Personal Commitments** (rotating through participants)
   - "What's ONE thing you'll do differently?"
   - Each person shares
   - Optionally submit via device for display

2. **Family Signal** (optional)
   - Create a safe word/gesture for gentle fallacy-flagging
   - Vote on options or create custom

3. **Session Stats**
   - Total fallacies learned
   - Team scores
   - Fun superlatives (MVP Spotter, Sneakiest Arguer, etc.)

---

## UI/UX Specifications

### Host View (Desktop Optimized)

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│  [Logo] Game Title • Phase/Step           [📖 Ref] [☰]  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│                                                         │
│                    MAIN CONTENT                         │
│                    (slides, voting, building, etc.)     │
│                                                         │
│                                                         │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  [← Back]           [Timer/Status]           [Next →]   │
└─────────────────────────────────────────────────────────┘
```

**Persistent Elements:**
- Header: Always visible with game context
- Reference button: Opens slide-out panel with all fallacies/antidotes
- Menu button: Settings, exit game (with confirmation)
- Footer: Navigation appropriate to current phase

### Participant View (Mobile Optimized)

**Layout:**
```
┌───────────────────────────┐
│  Game • Phase             │
│  [Team Name if applicable]│
├───────────────────────────┤
│                           │
│  CONTEXT BAR:             │
│  Current topic/question   │
│  from host screen         │
│                           │
├───────────────────────────┤
│                           │
│  INTERACTION AREA:        │
│  (voting, building,       │
│   viewing, etc.)          │
│                           │
│                           │
│                           │
├───────────────────────────┤
│  [📖 Ref]     [Action]    │
└───────────────────────────┘
```

**Context Bar (Critical Feature):**
- Always shows what's currently on the host screen
- Abbreviated version with "View Full" option
- Updates in real-time via WebSocket
- Ensures participants without direct view of host screen can follow along

**Example Context Bars:**
```
// During presentation
"Currently: Ad Hominem - Example 2"

// During voting  
"Quote: 'You're worried about influencer health claims? What about...'"

// During team building
"Your team is building an argument for: Immigration"

// During review
"Reviewing Team B's argument on: Prison Reform"
```

### Reference Panel

**Accessible from any screen** via 📖 button:

```
┌─────────────────────────┐
│  REFERENCE         [×]  │
├─────────────────────────┤
│  [Fallacies] [Antidotes]│
├─────────────────────────┤
│  🔍 Search...           │
├─────────────────────────┤
│  ┌─────────────────────┐│
│  │ AD HOMINEM          ││
│  │ "Attack the         ││
│  │  Messenger"         ││
│  │ [Tap to expand]     ││
│  └─────────────────────┘│
│  ┌─────────────────────┐│
│  │ STRAW MAN           ││
│  │ "The Argument       ││
│  │  No One Made"       ││
│  │ [Tap to expand]     ││
│  └─────────────────────┘│
│  ...                    │
└─────────────────────────┘
```

### Exit Confirmation

**Modal (cannot be bypassed):**
```
┌─────────────────────────────────────┐
│                                     │
│      End this game?                 │
│                                     │
│   Your progress will be saved.      │
│   You can resume later.             │
│                                     │
│   [Keep Playing]    [End Game]      │
│                                     │
└─────────────────────────────────────┘
```

### Timer Component

- Large, visible countdown
- Color changes: Green → Yellow (30s) → Red (10s)
- Audio cue option at 10s, 5s, 0s
- Host can extend or end early

---

## Technical Architecture

### Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Nuxt 3 |
| UI Components | Nuxt UI (with Tailwind) |
| State Management | Pinia |
| Real-time Sync | WebSocket (ws) |
| AI Integration | OpenAI API (gpt-4o) |
| QR Codes | qrcode library |
| Storage | localStorage (host machine) |
| Deployment | Railway or Tailscale Funnel |

### Project Structure

```
fallacies/
├── nuxt.config.ts
├── package.json
├── THE_PLAN.md                    # This document
│
├── app.vue
├── pages/
│   ├── index.vue                  # Landing → Create or Join
│   ├── host/
│   │   ├── index.vue              # Session creation/resume
│   │   ├── lobby.vue              # QR code, participants, team setup
│   │   └── game/
│   │       └── [gameId].vue       # Game wrapper
│   └── play/
│       └── [sessionCode].vue      # Participant view
│
├── components/
│   ├── lobby/
│   │   ├── SessionCreate.vue
│   │   ├── SessionResume.vue
│   │   ├── QrCodeDisplay.vue
│   │   ├── ParticipantList.vue
│   │   ├── TeamAssignment.vue
│   │   └── GameMenu.vue
│   │
│   ├── game/
│   │   ├── GameWrapper.vue        # Header, footer, reference, exit
│   │   ├── Timer.vue
│   │   ├── ExitConfirm.vue
│   │   ├── ReferencePanel.vue
│   │   ├── ScoreBoard.vue
│   │   │
│   │   ├── logic-traps/
│   │   │   ├── Slide.vue
│   │   │   ├── DiscussionPrompt.vue
│   │   │   └── PersonSelector.vue
│   │   │
│   │   ├── warmup/
│   │   │   ├── QuoteDisplay.vue
│   │   │   ├── VotingStatus.vue
│   │   │   └── ResultsReveal.vue
│   │   │
│   │   ├── prosecution/
│   │   │   ├── TopicSelection.vue
│   │   │   ├── BuildPhase.vue
│   │   │   ├── ArgumentBuilder.vue
│   │   │   ├── ReviewPhase.vue
│   │   │   ├── ScoringReveal.vue
│   │   │   └── AiSuggest.vue
│   │   │
│   │   ├── antidotes/
│   │   │   ├── Slide.vue
│   │   │   └── DiscussionBlock.vue
│   │   │
│   │   ├── steelman/
│   │   │   ├── SoundBuilder.vue
│   │   │   ├── ComparisonView.vue
│   │   │   └── PersuasionVote.vue
│   │   │
│   │   ├── crux-hunt/
│   │   │   ├── Pairing.vue
│   │   │   ├── GuidedPrompt.vue
│   │   │   ├── CruxArticulation.vue
│   │   │   └── CruxReveal.vue
│   │   │
│   │   └── reflection/
│   │       ├── CommitmentRound.vue
│   │       └── SessionStats.vue
│   │
│   └── participant/
│       ├── ContextBar.vue         # Shows host screen context
│       ├── WaitingRoom.vue
│       ├── VotingInterface.vue
│       ├── ArgumentBuilderMobile.vue
│       ├── ReviewInterface.vue
│       ├── CruxPromptsMobile.vue
│       └── DiscussionNotify.vue
│
├── composables/
│   ├── useSession.ts              # Session management
│   ├── useGame.ts                 # Game state management
│   ├── useWebSocket.ts            # Real-time communication
│   ├── useStorage.ts              # localStorage operations
│   ├── useTimer.ts                # Timer logic
│   └── useAi.ts                   # OpenAI integration
│
├── stores/
│   ├── session.ts                 # Pinia: session state
│   ├── game.ts                    # Pinia: current game state
│   └── content.ts                 # Pinia: fallacies, antidotes, topics
│
├── server/
│   ├── api/
│   │   ├── session/
│   │   │   ├── create.post.ts
│   │   │   ├── [code].get.ts
│   │   │   └── [code]/
│   │   │       ├── join.post.ts
│   │   │       ├── participants.get.ts
│   │   │       └── teams.post.ts
│   │   │
│   │   ├── game/
│   │   │   ├── [sessionCode]/
│   │   │   │   ├── [gameId]/
│   │   │   │   │   ├── state.get.ts
│   │   │   │   │   ├── advance.post.ts
│   │   │   │   │   ├── vote.post.ts
│   │   │   │   │   ├── submit.post.ts
│   │   │   │   │   └── topic.post.ts
│   │   │
│   │   └── ai/
│   │       └── suggest.post.ts
│   │
│   ├── utils/
│   │   ├── storage.ts             # Server-side localStorage proxy
│   │   └── validation.ts
│   │
│   └── plugins/
│       └── websocket.ts           # WebSocket server setup
│
├── content/
│   ├── fallacies/
│   │   ├── _schema.json           # Validation schema
│   │   ├── ad-hominem.json
│   │   ├── straw-man.json
│   │   ├── false-dilemma.json
│   │   ├── appeal-to-authority.json
│   │   ├── whataboutism.json
│   │   ├── slippery-slope.json
│   │   └── causation-con.json
│   │
│   ├── antidotes/
│   │   ├── _schema.json
│   │   ├── steelmanning.json
│   │   ├── separate-claim-claimant.json
│   │   ├── acknowledge-spectrum.json
│   │   ├── stay-in-lane.json
│   │   └── demand-mechanism.json
│   │
│   ├── topics/
│   │   ├── _schema.json
│   │   ├── immigration.json
│   │   ├── cancel-culture.json
│   │   ├── prison-reform.json
│   │   ├── influencer-health.json
│   │   ├── housing-market.json
│   │   └── political-violence.json
│   │
│   ├── warmup/
│   │   ├── simple-quotes.json
│   │   └── complex-examples.json
│   │
│   └── games/
│       ├── logic-traps.json       # Slide content, prompts
│       ├── warmup.json
│       ├── prosecution.json
│       ├── antidotes.json
│       ├── steelman.json
│       ├── crux-hunt.json
│       └── reflection.json
│
├── types/
│   ├── session.ts
│   ├── game.ts
│   ├── content.ts
│   └── websocket.ts
│
└── public/
    └── (static assets)
```

### WebSocket Events

**Session Events:**
```typescript
// Client → Server
'session:join' { sessionCode, participantName }
'session:leave' { sessionCode, participantId }

// Server → Client
'session:participant_joined' { participant }
'session:participant_left' { participantId }
'session:teams_updated' { teams }
```

**Game Events:**
```typescript
// Client → Server (Host only)
'game:start' { sessionCode, gameId }
'game:advance' { sessionCode, gameId, phase, step }
'game:end' { sessionCode, gameId }

// Client → Server (Participants)
'game:vote' { sessionCode, gameId, participantId, vote }
'game:submit' { sessionCode, gameId, teamId, submission }
'game:topic_select' { sessionCode, gameId, teamId, topicId }

// Server → All Clients
'game:state_update' { gameId, phase, step, context }
'game:vote_received' { participantId }
'game:submission_received' { teamId }
'game:topic_claimed' { teamId, topicId }
'game:timer_tick' { remaining }
'game:results' { results }
```

### AI Integration

**Endpoint:** `POST /api/ai/suggest`

**Request:**
```typescript
{
  type: 'fallacious' | 'sound',
  topic: string,
  position: string,
  targetFallacies?: string[],  // For fallacious
  targetAntidotes?: string[],  // For sound
  existingText?: string        // What they've written so far
}
```

**Response:**
```typescript
{
  suggestions: [
    {
      text: string,
      technique: string,  // Which fallacy/antidote it uses
      explanation: string // Brief note on why this works
    }
  ]
}
```

**Prompt Engineering:**
- System prompt establishes context (family game, educational purpose)
- Few-shot examples for each fallacy/antidote type
- Temperature: 0.7 for variety
- Max tokens: 150 per suggestion

---

## Content Structure

### Fallacy Schema

```json
{
  "id": "ad-hominem",
  "name": "Ad Hominem",
  "nickname": "Attack the Messenger",
  "definition": "Attacking the person making the argument rather than the argument itself.",
  "whyItWorks": "Our brains use source credibility as a mental shortcut. If we can discredit the messenger, we feel justified in dismissing the message—even when the message stands on its own merits.",
  "examples": [
    {
      "text": "Of course she supports prison reform—she's never been a victim of violent crime.",
      "topic": "prison-reform",
      "analysis": "The speaker's personal experience doesn't determine whether her arguments about policy are valid."
    }
  ],
  "antidoteId": "separate-claim-claimant",
  "promptStarters": [
    "People who believe this are usually just ___ who ___.",
    "Of course they'd say that—they're a ___.",
    "You can't trust their opinion because they ___."
  ]
}
```

### Antidote Schema

```json
{
  "id": "steelmanning",
  "name": "Steelmanning",
  "definition": "Representing the strongest possible version of an opposing view before critiquing it.",
  "counters": ["straw-man"],
  "howToApply": [
    "Ask: What's the best argument for their side?",
    "Articulate it so well they'd say 'Yes, exactly!'",
    "THEN respond to that version"
  ],
  "examples": [
    {
      "before": "People who want stricter immigration just hate foreigners.",
      "after": "People who support stricter immigration often argue that controlled borders allow for better integration of newcomers and protect domestic workers from wage suppression. Even if I disagree with their policy conclusions, I should engage with these arguments rather than assuming bad motives.",
      "topic": "immigration"
    }
  ],
  "promptStarters": [
    "The strongest argument for the other side is ___.",
    "Someone who disagrees might point out that ___.",
    "I should acknowledge that ___ before responding."
  ]
}
```

### Topic Schema

```json
{
  "id": "immigration",
  "name": "Immigration & Deportation",
  "positionA": {
    "label": "For strict enforcement",
    "statement": "Strict enforcement and deportation are necessary and effective policies.",
    "fallacyPrompts": [
      { "fallacy": "ad-hominem", "starter": "Critics of enforcement are usually just ___ who ___." },
      { "fallacy": "false-dilemma", "starter": "Either we enforce our borders or we ___." }
    ],
    "soundPrompts": [
      { "antidote": "steelmanning", "starter": "Those who favor more lenient policies raise valid concerns about ___." },
      { "antidote": "demand-mechanism", "starter": "The evidence suggests enforcement affects outcomes through ___." }
    ]
  },
  "positionB": {
    "label": "Against mass deportation",
    "statement": "Mass deportation is impractical, inhumane, and economically harmful.",
    "fallacyPrompts": [...],
    "soundPrompts": [...]
  },
  "cruxQuestions": [
    "Does deportation actually reduce crime rates?",
    "What is the true economic impact of removing immigrant workers?",
    "Is enforcement practically feasible at scale?"
  ]
}
```

---

## Build Order

### Phase 1: Foundation (Day 1)

1. **Project Setup**
   - Initialize Nuxt 3 project
   - Install dependencies (Nuxt UI, Pinia, etc.)
   - Configure TypeScript
   - Set up project structure

2. **Core Types**
   - Define all TypeScript interfaces
   - Session, Game, Content types

3. **Storage Composable**
   - localStorage wrapper with deep merge
   - Session CRUD operations
   - Game state persistence

4. **Content System**
   - JSON content loading
   - Content store (Pinia)
   - All 7 fallacies content
   - All 5 antidotes content

### Phase 2: Session Management (Day 1-2)

5. **Session Creation**
   - Session code generation
   - Initial session setup page
   - Session resume flow

6. **QR Code & Joining**
   - QR code display component
   - Join page for participants
   - Name entry

7. **WebSocket Setup**
   - Server-side WebSocket plugin
   - Client-side connection composable
   - Session join/leave events

8. **Lobby**
   - Participant list (real-time updates)
   - Team assignment UI
   - Game menu

### Phase 3: Game Framework (Day 2)

9. **Game Wrapper**
   - Shared header/footer
   - Exit confirmation modal
   - Reference panel

10. **Timer Component**
    - Countdown logic
    - Visual states
    - Host controls (extend, end early)

11. **Game State Management**
    - Game store (Pinia)
    - Phase/step progression
    - State persistence

### Phase 4: Game 1 - Logic Traps (Day 2-3)

12. **Presentation Slides**
    - Slide component
    - Content rendering
    - Navigation

13. **Discussion Prompts**
    - Random person selection
    - Participant notification
    - Re-roll option

14. **Participant View**
    - Context bar
    - Reference access
    - Discussion notification

### Phase 5: Game 2 - Warm-Up (Day 3)

15. **Quote Display**
    - Quote rendering
    - Timer integration

16. **Voting Interface**
    - Host: voting status
    - Participant: vote submission
    - Real-time vote tracking

17. **Results Reveal**
    - Vote distribution display
    - Correct answer highlight
    - Multi-fallacy support

### Phase 6: Game 3 - Prosecution (Day 3-4)

18. **Topic Selection**
    - Available topics display
    - First-pick claiming
    - Real-time updates

19. **Argument Builder**
    - Text composition
    - Fallacy tagging
    - Progress tracking
    - Team submission

20. **AI Suggestions**
    - OpenAI integration
    - Suggestion display
    - Insert into builder

21. **Review Phase**
    - Argument display
    - Multi-team simultaneous review
    - Fallacy selection
    - Submission tracking

22. **Scoring**
    - Score calculation
    - Results display
    - Round management

### Phase 7: Games 4-5 (Day 4-5)

23. **Game 4 - Antidotes**
    - Similar to Game 1 (presentation)
    - Integrated discussion blocks

24. **Game 5 - Steelman Showdown**
    - Sound Argument Builder
    - Comparison view
    - Persuasion voting

### Phase 8: Games 6-7 (Day 5)

25. **Game 6 - Crux Hunt**
    - Pairing logic
    - Guided prompts
    - Crux articulation

26. **Game 7 - Reflection**
    - Commitment round
    - Session stats

### Phase 9: Polish (Day 5-6)

27. **Content Completion**
    - All warm-up quotes
    - All topic content
    - Example arguments

28. **Testing**
    - Multi-device testing
    - WebSocket reliability
    - State persistence

29. **Deployment**
    - Railway setup OR
    - Tailscale funnel configuration

---

## Deployment Options

### Option A: Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize
railway init

# Deploy
railway up
```

**Pros:** 
- Public URL, no local server needed
- Works from any network

**Cons:**
- Requires internet for everyone
- Monthly cost if exceeds free tier

### Option B: Tailscale Funnel

```bash
# Run locally
npm run dev -- --host 0.0.0.0

# In separate terminal, expose via Tailscale
tailscale funnel 3000
```

**Pros:**
- Free
- Data stays local
- Works with cruise WiFi packages

**Cons:**
- Requires host machine to run server
- Tailscale setup needed

---

## Success Metrics

After the session, we should see:

1. **Engagement**: Everyone participates in discussions and games
2. **Learning**: Family can name and identify all 7 fallacies
3. **Application**: Family uses new vocabulary in later conversations
4. **Bonding**: Laughs, debates, and moments of insight
5. **Replay Value**: Family wants to revisit with new topics

---

## Future Enhancements (Post-Cruise)

- Database persistence (PostgreSQL/SQLite)
- Session history and replays
- Custom content creation UI
- More games and variations
- Difficulty levels
- Performance analytics
- Export session summaries

