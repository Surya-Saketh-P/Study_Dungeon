import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { connectDB } from '../src/db.js';
import { Dungeon, User } from '../src/models/index.js';
import bcrypt from 'bcrypt';

dotenv.config();

export async function seedDemoData() {
  await connectDB();

  console.log('Seeding demo dungeon and test user...');

  // Create demo user if not exists
  let demoUser = await User.findOne({ email: 'demo@studydungeon.com' });
  if (!demoUser) {
    const passwordHash = await bcrypt.hash('demopass123', 10);
    demoUser = await User.create({
      email: 'demo@studydungeon.com',
      password_hash: passwordHash,
      display_name: 'Dungeon Master',
    });
    console.log('Created demo user: demo@studydungeon.com / demopass123');
  }

  // Remove existing demo dungeon to prevent duplicates
  await Dungeon.deleteMany({ title: 'Data Structures & Algorithms Cavern' });

  const demoDungeon = await Dungeon.create({
    user_id: 0, // Global demo accessible to everyone
    title: 'Data Structures & Algorithms Cavern',
    status: 'ready',
    source_hash: 'seed_demo_dsa_cavern_hash',
    floors: [
      {
        title: 'Floor 1: Linear & Tree Foundations',
        order_index: 1,
        monsters: [
          {
            concept_name: 'Binary Search Tree',
            summary: 'A node-based binary tree data structure where each node has at most two children, maintaining the invariant that left < root < right.',
            difficulty: 1,
            is_boss: false,
            questions: [
              {
                type: 'mcq',
                prompt: 'What is the average time complexity of searching in a balanced Binary Search Tree?',
                options: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'],
                correct_answer: 'O(log n)',
                explanation: 'In a balanced BST, each comparison cuts the search space approximately in half, yielding O(log n) time.',
              },
              {
                type: 'mcq',
                prompt: 'What tree traversal on a BST yields elements in ascending sorted order?',
                options: ['In-order', 'Pre-order', 'Post-order', 'Level-order'],
                correct_answer: 'In-order',
                explanation: 'In-order traversal visits left subtree, current node, then right subtree, producing values in monotonically increasing order.',
              },
            ],
          },
          {
            concept_name: 'Hash Table & Collisions',
            summary: 'A data structure that implements an associative array abstract data type using a hash function to compute an index into an array of buckets.',
            difficulty: 2,
            is_boss: false,
            questions: [
              {
                type: 'mcq',
                prompt: 'Which collision resolution strategy stores colliding elements in linked lists at the same bucket index?',
                options: ['Separate Chaining', 'Linear Probing', 'Quadratic Probing', 'Double Hashing'],
                correct_answer: 'Separate Chaining',
                explanation: 'Separate chaining uses an auxiliary data structure like a linked list at each bucket to hold all key-value pairs with the same hash.',
              },
              {
                type: 'mcq',
                prompt: 'What is the expected average-case time complexity of lookups in a well-distributed hash table?',
                options: ['O(log n)', 'O(1)', 'O(n)', 'O(n^2)'],
                correct_answer: 'O(1)',
                explanation: 'With a uniform hash function and low load factor, hash table insertions and lookups operate in O(1) constant time on average.',
              },
            ],
          },
          {
            concept_name: 'Algorithmic Overlord',
            summary: 'The guardian of Floor 1 testing synthesis of tree invariants and hashing dynamics.',
            difficulty: 3,
            is_boss: true,
            questions: [
              {
                type: 'mcq',
                prompt: '[Boss Trial] In the worst-case degenerate BST (resembling a linked list), what is the search complexity?',
                options: ['O(1)', 'O(log n)', 'O(n)', 'O(n!)'],
                correct_answer: 'O(n)',
                explanation: 'If items are inserted in sorted order without rebalancing, the BST degrades into a linear chain of nodes with O(n) search time.',
              },
              {
                type: 'mcq',
                prompt: '[Boss Trial] When the load factor (n/k) of a hash table exceeds a critical threshold, what operation restores performance?',
                options: ['Rehashing / Dynamic Resizing', 'Compaction', 'Defragmentation', 'Inversion'],
                correct_answer: 'Rehashing / Dynamic Resizing',
                explanation: 'Rehashing doubles the internal table capacity and redistributes elements using the updated modulo mask to maintain O(1) performance.',
              },
              {
                type: 'mcq',
                prompt: '[Boss Trial] What property ensures an AVL tree maintains O(log n) worst-case height?',
                options: [
                  'Balance factor of every node is -1, 0, or 1',
                  'Every leaf has depth exactly log(n)',
                  'Each node has 2 children',
                  'Keys must be integers',
                ],
                correct_answer: 'Balance factor of every node is -1, 0, or 1',
                explanation: 'AVL trees enforce that the height difference between left and right subtrees of any node never exceeds 1 via tree rotations.',
              },
              {
                type: 'mcq',
                prompt: '[Boss Trial] Which hash function property ensures cryptographic irreversibility?',
                options: ['Pre-image Resistance', 'Linearity', 'Idempotency', 'Associativity'],
                correct_answer: 'Pre-image Resistance',
                explanation: 'Pre-image resistance means given a hash output h, it is computationally infeasible to determine the original input x such that hash(x) = h.',
              },
              {
                type: 'mcq',
                prompt: '[Boss Trial] What is the space complexity of an adjacency matrix representation of a graph with V vertices?',
                options: ['O(V)', 'O(V^2)', 'O(V + E)', 'O(E log V)'],
                correct_answer: 'O(V^2)',
                explanation: 'An adjacency matrix is a 2D V-by-V grid requiring O(V^2) memory regardless of edge density.',
              },
            ],
          },
        ],
      },
    ],
  });

  console.log(`Demo dungeon successfully seeded with ID: ${demoDungeon._id}`);
}

if (process.argv[1].endsWith('seed.js')) {
  seedDemoData()
    .then(() => {
      console.log('Seeding complete.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Seeding error:', err);
      process.exit(1);
    });
}
