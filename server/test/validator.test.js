import test from 'node:test';
import assert from 'node:assert/strict';
import { validateGenerationOutput, mcqQuestionSchema } from '../src/services/validator.js';

test('Validator: accepts valid MCQ question with 4 options and matching answer', () => {
  const validQuestion = {
    type: 'mcq',
    prompt: 'What is the time complexity of QuickSort in the average case?',
    options: ['O(n)', 'O(n log n)', 'O(n^2)', 'O(log n)'],
    correct_answer: 'O(n log n)',
    explanation: 'QuickSort has an average time complexity of O(n log n) due to balanced partitioning.',
  };

  const parsed = mcqQuestionSchema.safeParse(validQuestion);
  assert.equal(parsed.success, true);
});

test('Validator: rejects MCQ with fewer than 4 options', () => {
  const invalidQuestion = {
    type: 'mcq',
    prompt: 'What is a stack?',
    options: ['LIFO', 'FIFO'],
    correct_answer: 'LIFO',
    explanation: 'Stack is LIFO',
  };

  const parsed = mcqQuestionSchema.safeParse(invalidQuestion);
  assert.equal(parsed.success, false);
});

test('Validator: rejects MCQ when correct_answer is not in options', () => {
  const invalidQuestion = {
    type: 'mcq',
    prompt: 'What is a FIFO structure?',
    options: ['Stack', 'Tree', 'Graph', 'Array'],
    correct_answer: 'Queue', // Not in options!
    explanation: 'A queue is first-in, first-out.',
  };

  const parsed = mcqQuestionSchema.safeParse(invalidQuestion);
  assert.equal(parsed.success, false);
});

test('Validator: validates complete chunk concept payload', () => {
  const payload = {
    concepts: [
      {
        concept_name: 'Binary Search',
        summary: 'A search algorithm that finds the position of a target value within a sorted array in logarithmic time.',
        difficulty: 1,
        questions: [
          {
            type: 'mcq',
            prompt: 'Binary search requires the input array to be what?',
            options: ['Sorted', 'Reversed', 'Shuffled', 'Empty'],
            correct_answer: 'Sorted',
            explanation: 'Binary search repeatedly divides the search interval in half, requiring sorted order.',
          },
        ],
      },
    ],
  };

  const result = validateGenerationOutput(payload);
  assert.equal(result.success, true);
});
