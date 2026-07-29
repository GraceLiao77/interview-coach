//  跟 Claude 打交道(调 API、算分)
import { anthropic } from '../lib/anthropic';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';   // ① 引入 helper
import { questionSetSchema, Question, QuestionSet } from '../schemas/questions';           // ① 引入 schema
import { env } from '../env';
import { MODELS } from '../lib/aiConfig'
import { prisma } from '../lib/prisma';

const MOCK_RESPONSE: QuestionSet = {'questions':[
    {
      tier: 'warmup',
      text: 'Can you tell me about yourself and what drew you to apply for this React Developer role at Youtap?',
      order: 1,
      resumeBased: false
    },
    {
      tier: 'warmup',
      text: 'What interests you most about working in the fintech and digital payments space?',
      order: 2,
      resumeBased: false
    },
    {
      tier: 'warmup',
      text: 'How did you first get started with React development?',
      order: 3,
      resumeBased: false
    },
    {
      tier: 'behavioral',
      text: 'Tell me about a time when you had to rapidly learn and implement a new technology or tool. How did you approach it and what was the outcome?',
      order: 4,
      resumeBased: false
    },
    {
      tier: 'behavioral',
      text: 'Describe a situation where you had to work closely with product managers or designers to translate requirements into a working application. What was your process?',
      order: 5,
      resumeBased: false
    },
    {
      tier: 'behavioral',
      text: 'Give me an example of when you received critical feedback during a code review. How did you handle it and what did you learn?',
      order: 6,
      resumeBased: false
    },
    {
      tier: 'behavioral',
      text: 'Tell me about a time when you had to balance speed of delivery with code quality. How did you make that decision?',
      order: 7,
      resumeBased: false
    },
    {
      tier: 'behavioral',
      text: 'Describe a situation where you had to adapt quickly to changing requirements or priorities in a project. What was your approach?',
      order: 8,
      resumeBased: false
    },
    {
      tier: 'behavioral',
      text: 'Can you share an experience where you collaborated with cross-functional teams? What challenges did you face and how did you overcome them?',
      order: 9,
      resumeBased: false
    },
    {
      tier: 'behavioral',
      text: 'Tell me about a time when you took initiative to improve a process, tool, or feature beyond what was asked of you.',
      order: 10,
      resumeBased: false
    },
    {
      tier: 'behavioral',
      text: 'Describe a project where you had to optimize application performance. What steps did you take and what were the results?',
      order: 11,
      resumeBased: false
    },
    {
      tier: 'technical',
      text: 'How have you used AI coding tools like GitHub Copilot, Cursor, or ChatGPT in your development work? Can you walk me through a specific example?',
      order: 12,
      resumeBased: false
    },
    {
      tier: 'technical',
      text: 'Explain your approach to breaking down a UI/UX design into reusable React components. What principles do you follow?',
      order: 13,
      resumeBased: false
    },
    {
      tier: 'technical',
      text: 'Describe your experience integrating React applications with REST APIs. What challenges have you encountered?',
      order: 14,
      resumeBased: false
    },
    {
      tier: 'technical',
      text: 'How do you ensure your React components are responsive and work well across both web and mobile environments?',
      order: 15,
      resumeBased: false
    },
    {
      tier: 'technical',
      text: 'What is your understanding of Agile development methodologies? How have you applied Agile practices in your previous work or projects?',
      order: 16,
      resumeBased: false
    },
    {
      tier: 'technical',
      text: 'Walk me through how you would approach building a digital wallet feature from scratch using React and AI tools.',
      order: 17,
      resumeBased: false
    },
    {
      tier: 'behavioral',
      text: "Tell me about the most challenging technical problem you've solved in a React project. What made it difficult and how did you solve it?",
      order: 18,
      resumeBased: true
    },
    {
      tier: 'behavioral',
      text: 'Looking at your background, can you describe a time when you had to work in a fast-paced environment with tight deadlines? How did you manage your time and priorities?',
      order: 19,
      resumeBased: true
    },
    {
      tier: 'technical',
      text: 'I see you have experience with [specific technology/project from resume]. How would you apply that experience to building fintech applications at Youtap?',
      order: 20,
      resumeBased: true
    }
  ]}

export async function generateQuestions(jobDescription: string) {
    if (env.mockAi) {
        return MOCK_RESPONSE
    }

    const SYSTEM_PROMPT = `You are an expert technical interviewer for software engineering roles.
    Given a job description, produce a realistic, progressive mock-interview question set.
    
    Rules:
    - Three tiers in order: warmup (2), behavioral (3), technical (3).
    - Derive every question directly from the job description — reference the SPECIFIC
      skills, technologies, and responsibilities it mentions. Avoid generic questions.
    - Warmup: light, rapport-building. Behavioral: elicit STAR stories.
    - Technical: probe the exact stack in the JD; prefer "how/why" over yes/no.
    - Number questions with a sequential order starting at 1. No duplicates.
    - Set resumeBased to false for all (no resume provided yet).`;


    
    const response = await anthropic.messages.parse({
        model: MODELS.questions, // demo model, later we will use the real model
        max_tokens: 2000,
        system: SYSTEM_PROMPT,
        messages: [
            { role: 'user', content: `<job_description>\n${jobDescription}\n</job_description>\n\nGenerate the question set.` },
          ],
        output_config: {
            format: zodOutputFormat(questionSetSchema),
        }
    })

    if (!response.parsed_output) {
        throw new Error('no valid output')
    }

    

    return response.parsed_output
}