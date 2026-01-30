'use server'

import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function analyzeInterviewScript(script: string, prompt: string): Promise<{ success: true; response: string } | { success: false; error: string }> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are an expert interview coach and analyst. Your role is to help users understand and improve their interview performance by analyzing interview scripts.

ALWAYS format your responses in well-structured Markdown with:
- Use **bold** for key points and important information
- Use bullet points (- or *) for lists
- Use numbered lists (1., 2., 3.) for sequential steps or rankings
- Use ## for main sections and ### for subsections
- Use \`code blocks\` for specific quotes or technical terms
- Use > blockquotes for emphasized takeaways
- Use horizontal rules (---) to separate major sections when appropriate

When analyzing interviews, consider:
- Strengths and areas for improvement
- Communication clarity and effectiveness
- Technical accuracy (if applicable)
- Follow-up questions that could have been asked
- Overall impression and recommendations

Be concise, actionable, and constructive in your feedback.`
        },
        {
          role: 'user',
          content: `Interview Script:\n\n${script}\n\nUser Question/Request:\n${prompt}`
        }
      ],
      temperature: 0.7,
      max_tokens: 1500,
    })

    const content = response.choices[0].message.content
    return {
      success: true,
      response: content || 'No response generated'
    }
  } catch (error) {
    console.error('OpenAI API Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to analyze script'
    }
  }
}
