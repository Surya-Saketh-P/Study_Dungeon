import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import { validateGenerationOutput } from './validator.js';

dotenv.config();

let genAI = null;

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in server environment.');
  }
  if (!genAI) {
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

const SYSTEM_INSTRUCTION = `You are a curriculum designer for Study Dungeon, an educational turn-based RPG.
Your task is to analyze study notes and extract key learning concepts, turning them into RPG monster encounters.

Rules:
1. Extract 3 to 4 distinct key concepts from the provided text.
2. For each concept:
   - "concept_name": Short, evocative name of the concept (2-5 words).
   - "summary": A clear 1-2 sentence explanation of the concept based only on the text.
   - "difficulty": Integer 1 (foundational/easy), 2 (intermediate), or 3 (advanced/hard).
   - "questions": Array of exactly 2 multiple-choice questions testing active recall of this concept.
3. For each question:
   - "type": "mcq"
   - "prompt": A clear, direct test question.
   - "options": An array of exactly 4 plausible strings (1 correct answer and 3 distinct distractors).
   - "correct_answer": The exact string matching one of the options.
   - "explanation": Concise explanation of why the correct answer is right and why distractors are wrong.
4. Output MUST be valid, raw JSON matching this schema:
{
  "concepts": [
    {
      "concept_name": "...",
      "summary": "...",
      "difficulty": 1,
      "questions": [
        {
          "type": "mcq",
          "prompt": "...",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "correct_answer": "Option A",
          "explanation": "..."
        }
      ]
    }
  ]
}
Return ONLY valid JSON. No markdown backticks, no markdown codeblocks, no commentary.`;

function extractJSONString(raw) {
  let cleaned = raw.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.substring(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.substring(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.substring(0, cleaned.length - 3);
  }
  return cleaned.trim();
}

/**
 * Generates validated concepts and questions from a text chunk.
 * Implements strict Zod validation with 1 automatic retry on failure.
 */
export async function generateChunkContent(chunkText) {
  const ai = getClient();
  const candidateModels = [
    process.env.GEMINI_MODEL,
    'gemini-3.5-flash',
    'gemini-3.1-flash-lite',
    'gemini-3.7-flash',
    'gemini-3.6-flash',
    'gemini-3.8-flash',
    'gemini-flash-latest',
  ].filter(Boolean);

  let textResponse = null;
  let lastError = null;

  for (const modelName of candidateModels) {
    try {
      const model = ai.getGenerativeModel({
        model: modelName,
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json',
        },
      });

      const prompt = `${SYSTEM_INSTRUCTION}\n\nStudy Notes Material:\n"""\n${chunkText}\n"""`;
      const result = await model.generateContent(prompt);
      textResponse = result.response.text();
      if (textResponse) break;
    } catch (err) {
      lastError = err.message;
      console.warn(`Model ${modelName} call failed:`, err.message);
    }
  }

  if (!textResponse) {
    throw new Error(`LLM call failed across all candidate models: ${lastError}`);
  }

  // Parse and validate
  try {
    const parsedJSON = JSON.parse(extractJSONString(textResponse));
    const validation = validateGenerationOutput(parsedJSON);
    if (validation.success) {
      return validation.data;
    }
    lastError = JSON.stringify(validation.error.issues);
  } catch (err) {
    lastError = err.message;
  }

  // 1 Retry attempt with error feedback
  try {
    console.warn(`LLM validation failed (${lastError}), retrying once with error feedback...`);
    const model = ai.getGenerativeModel({
      model: candidateModels[0],
      generationConfig: { temperature: 0.1, responseMimeType: 'application/json' },
    });
    const retryPrompt = `${SYSTEM_INSTRUCTION}\n\nStudy Notes Material:\n"""\n${chunkText}\n"""\n\nYour previous JSON output was invalid with error: ${lastError}. Ensure strictly 4 options, exactly 1 matching correct_answer, and 2 MCQs per concept. Return only valid JSON.`;
    const retryResult = await model.generateContent(retryPrompt);
    const retryText = retryResult.response.text();
    const retryJSON = JSON.parse(extractJSONString(retryText));
    const retryValidation = validateGenerationOutput(retryJSON);
    if (retryValidation.success) {
      return retryValidation.data;
    }
    console.error('LLM retry validation failed:', retryValidation.error.issues);
    return null;
  } catch (retryErr) {
    console.error('LLM retry crashed:', retryErr.message);
    return null;
  }
}
