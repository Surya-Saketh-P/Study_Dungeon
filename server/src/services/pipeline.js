import crypto from 'crypto';
import pdfParse from 'pdf-parse';
import PDFParser from 'pdf2json';
import { execFile } from 'child_process';
import { Dungeon } from '../models/index.js';
import { chunkText, normalizeText } from './chunker.js';
import { generateChunkContent } from './llm.js';

export function calculateSourceHash(text) {
  return crypto.createHash('sha256').update(normalizeText(text)).digest('hex');
}

/**
 * Parses PDF buffer using pdf2json
 */
function parsePdfWithPdf2Json(buffer) {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser(null, 1);
    pdfParser.on('pdfParser_dataError', (errData) => reject(errData.parserError));
    pdfParser.on('pdfParser_dataReady', () => {
      const text = pdfParser.getRawTextContent();
      resolve(text);
    });
    pdfParser.parseBuffer(buffer);
  });
}

/**
 * Parses PDF buffer using system pdftotext if available
 */
function parsePdfWithPdftotext(buffer) {
  return new Promise((resolve, reject) => {
    const child = execFile('pdftotext', ['-', '-'], (error, stdout) => {
      if (error) return reject(error);
      resolve(stdout);
    });
    if (child.stdin) {
      child.stdin.write(buffer);
      child.stdin.end();
    }
  });
}

export async function extractTextFromSource({ buffer, text, mimeType }) {
  if (buffer) {
    if (mimeType === 'application/pdf' || buffer.slice(0, 4).toString() === '%PDF') {
      // 1. Try pdf-parse first (PRD default)
      try {
        const data = await pdfParse(buffer);
        if (data.text && data.text.trim().length >= 50) {
          return data.text;
        }
      } catch (err) {
        console.warn('pdf-parse encountered error, falling back to modern parser:', err.message);
      }

      // 2. Fall back to pdf2json (handles modern XRef and long tokens)
      try {
        const parsedText = await parsePdfWithPdf2Json(buffer);
        if (parsedText && parsedText.trim().length >= 50) {
          return parsedText;
        }
      } catch (err) {
        console.warn('pdf2json fallback failed, trying system pdftotext:', err.message);
      }

      // 3. Fall back to system pdftotext
      try {
        const systemText = await parsePdfWithPdftotext(buffer);
        if (systemText && systemText.trim().length >= 50) {
          return systemText;
        }
      } catch (err) {
        console.warn('pdftotext fallback failed:', err.message);
      }

      throw new Error(
        'Could not extract text from this PDF. It appears to be scanned or image-only. Please paste the notes text directly.'
      );
    }
    return buffer.toString('utf8');
  }
  return text || '';
}

/**
 * Asynchronous generation pipeline executed in background for MongoDB
 */
export async function processDungeonGeneration(dungeonId, rawSourceText) {
  try {
    const text = normalizeText(rawSourceText);

    if (text.length < 100) {
      await Dungeon.findByIdAndUpdate(dungeonId, {
        status: 'failed',
        error_message: 'Input text is too short. Please provide at least 100 characters of notes.',
      });
      return;
    }

    const sourceHash = calculateSourceHash(text);

    // Cache hit: find any ready dungeon with the same source hash
    const cached = await Dungeon.findOne({ source_hash: sourceHash, status: 'ready' });
    if (cached) {
      console.log(`Cache hit for source hash ${sourceHash}! Cloning floors.`);
      await Dungeon.findByIdAndUpdate(dungeonId, {
        floors: cached.floors,
        source_hash: sourceHash,
        status: 'ready',
        error_message: null,
      });
      return;
    }

    // Chunk text
    const chunks = chunkText(text);
    if (chunks.length === 0) {
      await Dungeon.findByIdAndUpdate(dungeonId, {
        status: 'failed',
        error_message: 'Failed to extract readable content chunks from the document.',
      });
      return;
    }

    console.log(`Processing ${chunks.length} chunks for dungeon ${dungeonId}...`);

    let allConcepts = [];
    let successfulChunks = 0;

    for (let i = 0; i < chunks.length; i++) {
      try {
        const chunkResult = await generateChunkContent(chunks[i]);
        if (chunkResult && chunkResult.concepts && chunkResult.concepts.length > 0) {
          allConcepts.push(...chunkResult.concepts);
          successfulChunks++;
        }
      } catch (chunkErr) {
        console.warn(`Chunk ${i + 1} processing error:`, chunkErr.message);
      }
    }

    // Check threshold: at least 60% of chunks succeeded or at least 2 concepts found
    const successRatio = successfulChunks / chunks.length;
    if (allConcepts.length < 2 && successRatio < 0.6) {
      await Dungeon.findByIdAndUpdate(dungeonId, {
        status: 'failed',
        error_message: 'AI could not extract enough valid concepts from this text. Ensure notes contain readable academic text.',
      });
      return;
    }

    // Group into floors (up to 3 concepts per floor)
    const conceptsPerFloor = 3;
    const floorsData = [];
    let floorNumber = 1;

    for (let i = 0; i < allConcepts.length; i += conceptsPerFloor) {
      const group = allConcepts.slice(i, i + conceptsPerFloor);
      const floorTitle = `Floor ${floorNumber}: Chamber of ${group[0].concept_name}`;

      const monsters = [];
      const floorQuestionsPool = [];

      for (const concept of group) {
        const questions = concept.questions.map((q) => ({
          type: 'mcq',
          prompt: q.prompt,
          options: q.options,
          correct_answer: q.correct_answer,
          explanation: q.explanation,
        }));

        floorQuestionsPool.push(...questions);

        monsters.push({
          concept_name: concept.concept_name,
          summary: concept.summary,
          difficulty: concept.difficulty || 1,
          is_boss: false,
          questions,
        });
      }

      // Build floor boss with 5 questions
      let bossQuestions = [...floorQuestionsPool];
      while (bossQuestions.length < 5 && floorQuestionsPool.length > 0) {
        bossQuestions.push(...floorQuestionsPool);
      }
      bossQuestions = bossQuestions.slice(0, 5).map((q) => ({
        type: 'mcq',
        prompt: `[Boss Trial] ${q.prompt}`,
        options: q.options,
        correct_answer: q.correct_answer,
        explanation: q.explanation,
      }));

      monsters.push({
        concept_name: `${group[0].concept_name} Overlord`,
        summary: `Mastery trial of Floor ${floorNumber} synthesizing all floor concepts.`,
        difficulty: 3,
        is_boss: true,
        questions: bossQuestions,
      });

      floorsData.push({
        title: floorTitle,
        order_index: floorNumber,
        monsters,
      });

      floorNumber++;
    }

    // Persist to MongoDB
    await Dungeon.findByIdAndUpdate(dungeonId, {
      floors: floorsData,
      source_hash: sourceHash,
      status: 'ready',
      error_message: null,
    });

    console.log(`Dungeon ${dungeonId} successfully generated and ready with ${floorsData.length} floors.`);
  } catch (err) {
    console.error(`Generation error for dungeon ${dungeonId}:`, err);
    await Dungeon.findByIdAndUpdate(dungeonId, {
      status: 'failed',
      error_message: err.message || 'Generation failed unexpectedly',
    });
  }
}
