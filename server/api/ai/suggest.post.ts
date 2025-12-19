import OpenAI from 'openai'

interface SuggestRequest {
  type: 'fallacious' | 'sound'
  topic: string
  position: string
  targetFallacies?: string[]
  targetAntidotes?: string[]
  existingText?: string
}

interface Suggestion {
  text: string
  technique: string
  explanation: string
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const body = await readBody<SuggestRequest>(event)

  if (!config.openaiApiKey) {
    return {
      suggestions: getFallbackSuggestions(body)
    }
  }

  const openai = new OpenAI({
    apiKey: config.openaiApiKey
  })

  const systemPrompt = body.type === 'fallacious' 
    ? `You are helping with an educational game about logical fallacies. Generate argument fragments that contain specific fallacies for the user to practice identifying. The context is a family learning activity - keep content appropriate but intellectually challenging.`
    : `You are helping with an educational game about sound reasoning. Generate argument fragments that use proper reasoning techniques (steelmanning, acknowledging nuance, citing evidence). Help users practice constructing valid, persuasive arguments.`

  const userPrompt = body.type === 'fallacious'
    ? `Topic: ${body.topic}
Position to argue: ${body.position}
Fallacies to include: ${body.targetFallacies?.join(', ') || 'any'}
${body.existingText ? `Building on: "${body.existingText}"` : ''}

Generate 2-3 short argument fragments (1-2 sentences each) that contain the specified fallacies. Make them subtle but identifiable. Return as JSON array with fields: text, technique (which fallacy), explanation (why it's fallacious).`
    : `Topic: ${body.topic}
Position to argue: ${body.position}
Techniques to use: ${body.targetAntidotes?.join(', ') || 'any sound reasoning'}
${body.existingText ? `Building on: "${body.existingText}"` : ''}

Generate 2-3 short argument fragments (1-2 sentences each) that demonstrate sound reasoning. Return as JSON array with fields: text, technique (which antidote/technique), explanation (why it's effective).`

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 500,
      response_format: { type: 'json_object' }
    })

    const content = completion.choices[0]?.message?.content
    if (!content) {
      return { suggestions: getFallbackSuggestions(body) }
    }

    const parsed = JSON.parse(content)
    return { 
      suggestions: parsed.suggestions || parsed || getFallbackSuggestions(body)
    }
  } catch (error) {
    console.error('OpenAI API error:', error)
    return { suggestions: getFallbackSuggestions(body) }
  }
})

function getFallbackSuggestions(body: SuggestRequest): Suggestion[] {
  if (body.type === 'fallacious') {
    return [
      {
        text: `People who disagree with this position are usually just uninformed about the real issues.`,
        technique: 'ad-hominem',
        explanation: 'Attacks the character of opponents rather than their arguments'
      },
      {
        text: `Either we take this approach, or we accept complete failure. There's no middle ground.`,
        technique: 'false-dilemma',
        explanation: 'Presents only two options when more exist'
      },
      {
        text: `After we tried this approach last time, things improved. Clearly it works.`,
        technique: 'causation-con',
        explanation: 'Assumes causation from correlation'
      }
    ]
  } else {
    return [
      {
        text: `While I hold this position, I recognize that those who disagree raise valid concerns about...`,
        technique: 'steelmanning',
        explanation: 'Acknowledges the strongest opposing arguments'
      },
      {
        text: `The evidence suggests a more nuanced picture, where multiple factors including... contribute to...`,
        technique: 'acknowledge-spectrum',
        explanation: 'Avoids false dilemmas by recognizing complexity'
      },
      {
        text: `Based on studies showing [specific mechanism], we can see how this approach leads to [outcome].`,
        technique: 'demand-mechanism',
        explanation: 'Provides specific causal mechanisms rather than assuming correlation'
      }
    ]
  }
}

