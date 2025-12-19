# Logic & Truth

An interactive family presentation app for teaching logical fallacies, sound reasoning, and collaborative truth-seeking.

## Features

- **7 Logic Traps**: Learn to identify the most common logical fallacies
- **Warm-Up Round**: Practice spotting fallacies in real quotes
- **Fallacy Prosecution**: Build sneaky fallacious arguments and catch others' tricks
- **The Antidotes**: Learn what to use instead of fallacies
- **Steelman Showdown**: Argue the opposite side using sound logic
- **The Crux Hunt**: Find the core of disagreements with partners
- **Closing Reflection**: Personal commitments and takeaways

## Tech Stack

- **Framework**: Nuxt 3 (compatibility mode 4)
- **UI**: Nuxt UI 3 + Tailwind CSS 4
- **State**: Pinia + VueUse
- **Real-time**: WebSocket via Nitro
- **AI**: OpenAI GPT-4o for argument suggestions
- **Storage**: localStorage for session persistence

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+

### Installation

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev
```

The app will be available at `http://localhost:3000`

### Environment Variables

Create a `.env` file:

```env
# Optional: Enable AI argument suggestions
OPENAI_API_KEY=your_openai_api_key_here
```

## Usage

### Hosting a Session

1. Go to the app and click "Host a Session"
2. Enter an optional session name
3. Share the QR code or session code with participants
4. Add participants manually or let them join via their devices
5. Assign teams (randomize or manually)
6. Start games in order (recommended) or jump to any game

### Joining a Session

1. Scan the QR code or enter the session URL
2. Enter your name
3. Wait for the host to start a game
4. Follow prompts on your device to vote, build arguments, etc.

## Deployment

### Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

### Tailscale Funnel (Local)

```bash
# Run the app
pnpm dev -- --host 0.0.0.0

# In another terminal, expose via Tailscale
tailscale funnel 3000
```

## Project Structure

```
fallacies/
├── pages/                 # Route pages
│   ├── index.vue          # Landing page
│   ├── host/              # Host views
│   └── play/              # Participant views
├── components/
│   ├── game/              # Shared game components
│   └── games/             # Game-specific components
├── stores/                # Pinia stores
├── composables/           # Vue composables
├── content/               # JSON content (fallacies, topics, etc.)
├── server/api/            # API routes and WebSocket
└── types/                 # TypeScript definitions
```

## Content

### Fallacies (7)

1. **Ad Hominem** - "Attack the Messenger"
2. **Straw Man** - "The Argument No One Made"
3. **False Dilemma** - "The Forced Choice"
4. **Appeal to Authority** - "The Credibility Heist"
5. **Whataboutism** - "The Deflection"
6. **Slippery Slope** - "The Doom Spiral"
7. **The Causation Con** - "After This ≠ Because of This"

### Antidotes (5)

1. **Steelmanning** - Represent the strongest opposing view
2. **Separate Claim from Claimant** - Evaluate arguments on merit
3. **Acknowledge the Spectrum** - Find nuance beyond binary choices
4. **Stay in the Lane** - Address the actual point raised
5. **Demand the Mechanism** - Ask how A specifically causes B

### Topics (6)

- Immigration & Deportation
- Cancel Culture & Accountability
- Prison Sentencing & Justice
- Influencer Health Claims
- Housing & Economic Opportunity
- Political Violence & Rhetoric

## License

MIT

