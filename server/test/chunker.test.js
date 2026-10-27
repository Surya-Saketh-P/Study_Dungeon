import test from 'node:test';
import assert from 'node:assert/strict';
import { chunkText, normalizeText } from '../src/services/chunker.js';

test('Chunker: normalizeText handles whitespace and newlines cleanly', () => {
  const messy = '  Hello   World \r\n\r\n\r\n  How are you?   ';
  const clean = normalizeText(messy);
  assert.equal(clean, 'Hello World\n\nHow are you?');
});

test('Chunker: throws error if text is under 100 characters', () => {
  assert.throws(
    () => {
      chunkText('Too short');
    },
    /too short/i
  );
});

test('Chunker: generates chunks from sufficiently long study notes', () => {
  const sampleNotes = `
# Data Structures
Data structures provide ways to organize and store data efficiently in memory.

## Linked Lists
A linked list is a linear data structure where elements are not stored at contiguous memory locations.
Each element is a node consisting of data and a reference to the next node in the sequence.

## Binary Search Trees
A binary search tree is a rooted binary tree where the key in each node is greater than all keys in its left subtree
and smaller than all keys in its right subtree. It allows fast lookup, addition, and removal of items.
`.repeat(3);

  const chunks = chunkText(sampleNotes);
  assert.ok(chunks.length >= 1);
  assert.ok(chunks[0].length > 50);
});
