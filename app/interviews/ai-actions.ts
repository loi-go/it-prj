'use server'

import Anthropic from '@anthropic-ai/sdk'

const CLAUDE_SONNET_MODEL =
  process.env.CLAUDE_MODEL?.trim() || 'claude-sonnet-4-6'

const INTERVIEW_ANALYSIS_INSTRUCTIONS = `You are an expert interview analyst. Read the interview script and extract structured details.

Respond in Markdown using exactly these sections and headings:

## Job Title
-

## Interviewers
(with role)

## Brief JD

## Salary expectation

## Hiring Process

## When can candidate hear about the result of this interview

## Main points of this interview

## Red Flags

## Pass Rate
(can pass to next interview)

Use "-" or "Not mentioned" when information is missing from the script. Be factual and only include details supported by the script.`

function getAnthropicClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not configured')
  }
  return new Anthropic({ apiKey })
}

export async function generateInterviewAiAnalysis(
  script: string
): Promise<{ success: true; response: string } | { success: false; error: string }> {
  const trimmedScript = script.trim()
  if (!trimmedScript) {
    return { success: false, error: 'Script is empty' }
  }

  try {
    const anthropic = getAnthropicClient()
    const message = await anthropic.messages.create({
      model: CLAUDE_SONNET_MODEL,
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: `${INTERVIEW_ANALYSIS_INSTRUCTIONS}\n\nInterview Script:\n\n${trimmedScript}`,
        },
      ],
    })

    const textBlock = message.content.find((block) => block.type === 'text')
    const content = textBlock && textBlock.type === 'text' ? textBlock.text : ''

    return {
      success: true,
      response: content || 'No analysis generated',
    }
  } catch (error) {
    console.error('Claude API Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to analyze script',
    }
  }
}
