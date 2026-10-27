import { z } from 'zod';

export const mcqQuestionSchema = z.object({
  type: z.literal('mcq').default('mcq'),
  prompt: z.string().min(5, 'Question prompt must be at least 5 characters'),
  options: z.array(z.string().min(1)).length(4, 'Must have exactly 4 options'),
  correct_answer: z.string().min(1, 'Correct answer is required'),
  explanation: z.string().min(5, 'Explanation must be at least 5 characters'),
}).refine((data) => data.options.includes(data.correct_answer), {
  message: 'correct_answer must match one of the 4 options exactly',
  path: ['correct_answer'],
});

export const conceptSchema = z.object({
  concept_name: z.string().min(2, 'Concept name must be at least 2 characters'),
  summary: z.string().min(10, 'Concept summary must be at least 10 characters'),
  difficulty: z.number().int().min(1).max(3).default(1),
  questions: z.array(mcqQuestionSchema).min(1).max(3),
});

export const chunkGenerationSchema = z.object({
  concepts: z.array(conceptSchema).min(1).max(6),
});

export function validateGenerationOutput(data) {
  return chunkGenerationSchema.safeParse(data);
}
