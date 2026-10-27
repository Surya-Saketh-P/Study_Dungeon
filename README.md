# ⚔️ Study Dungeon

> **Transform study notes and lecture PDFs into an active-recall turn-based retro RPG where academic concepts are monsters and correct answers deal damage.**

[![Node.js](https://img.shields.io/badge/Node.js-20%2B-brightgreen)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-blue)](https://react.dev/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green)](https://www.mongodb.com/)
[![Gemini](https://img.shields.io/badge/Google_Gemini-3.1_Flash_Lite-orange)](https://ai.google.dev/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 📽️ Demo Video

- **Video Walkthrough Link**: https://docs.google.com/videos/d/19wLJS1ZRdHv0CmZ19t0vWiWCWprzp7WtxCGpx3jzi-Y/edit?usp=drive_link
- **Duration**: 4 minutes
- **What is Demonstrated**:
  1. Overview of the problem and target users
  2. PDF upload and study notes ingestion into the parallel AI pipeline
  3. Real-time turn-based RPG combat (HP, streaks, anti-cheat server-side grading)
  4. Floor boss synthesis unlock & battle mechanics
  5. Post-run analytics debrief, weakness identification, and instant Revenge Run

---

## 🎯 Problem Statement

Traditional study techniques such as passive re-reading, highlighting, and watching recorded lectures suffer from drastically low long-term retention. While active recall and spaced repetition are scientifically proven to maximize memory retention, preparing flashcards manually is tedious, and generic quiz platforms lack engagement, stakes, and narrative progression to build sustained study habits.

---

## 👥 Target Users

- **University & College Students**: Preparing for exams in dense, technical courses (Computer Science, Biology, Medicine, History, Engineering) who need high-retention active recall.
- **Self-Directed Learners & Bootcamp Students**: Mastering technical documentation, textbooks, or research papers.
- **Certification Candidates**: Studying for exams (AWS, CompTIA, PMP, GRE, MCAT) where concept synthesis and retention are paramount.

---

## 💡 Solution

**Study Dungeon** transforms static study materials into a gamified, turn-based retro RPG:
- **Concepts are Monsters**: Extracted curriculum topics are rendered as dungeon monsters with dedicated HP bars.
- **Active Recall as Combat**: Answering questions correctly inflicts hits to defeat the monster; wrong answers cost player HP (-20 HP).
- **Streak & XP Rewards**: Consecutive correct answers trigger a scaling streak bonus (+10 XP base, +5 XP per streak, up to +30 XP).
- **Floor Boss Gates**: Clearing all concept monsters on a floor unlocks a floor boss trial requiring students to synthesize all floor concepts with a strict 2-mistake threshold.
- **Weak Spots Analytics & Revenge Runs**: An end-of-run debrief ranks struggled concepts by miss rate and response time, generating instant targeted retry runs.
- **Deterministic Server-Side Game Engine**: The LLM is confined strictly to content extraction. All combat calculations, damage math, streak tracking, boss gates, and win/loss states are executed deterministically on the server.

---

## 🚀 Key Features & Core Workflows

### Workflow 1: Automated Curriculum Ingestion & Parallel AI Pipeline
- Supports raw note pasting or text-based PDF uploads (via `pdf-parse` & `pdf2json`).
- Normalizes and splits text into semantic chunks with **SHA-256 cryptographic caching** (re-uploading identical material delivers instant 0-second cache hits).
- Executes parallel calls to Google Gemini API (`gemini-3.1-flash-lite`) with strict **Zod schema validation** and automatic self-healing retry prompts, generating a multi-floor dungeon in **under 15 seconds**.

### Workflow 2: Anti-Cheat Turn-Based RPG Combat
- Players enter the combat arena with 100 HP.
- **Anti-Cheat Grading**: `GET /api/runs/:id/next` withholds `correct_answer` and `explanation` from the client. Answers are graded exclusively server-side on `POST /api/runs/:id/answer`.
- Monster health scales by difficulty: 2 hits for Difficulty 1, 3 hits for Difficulty 2 & 3.

### Workflow 3: Synthesis Floor Boss Trials
- Defeating all monsters on a floor unlocks the floor boss.
- The boss challenges the player with 5 randomized synthesis questions derived from all concepts on that floor.
- Enforces a strict mistake threshold: a 3rd incorrect answer immediately causes run failure.

### Workflow 4: Adaptive Concept Re-Queuing & Post-Run Analytics
- Missed questions immediately trigger combat damage (-20 HP) and re-queue that concept back into the queue for reinforcement.
- Upon run completion (Victory or Defeat), a detailed analytics dashboard highlights:
  - Accuracy percentage & total duration
  - Weakest concepts ranked by miss count
  - Overall mastery states: **Slain** (mastered), **Wounded** (missed once), and **Untouched**
  - One-click **Revenge Run** button to immediately re-challenge weak topics.

### Workflow 5: User Management & Custom Dungeon Hub
- Full JWT-based authentication with `bcrypt` password hashing.
- Personal dashboard to view, play, and delete user-forged dungeons.
- Built-in zero-dependency pre-seeded demo mode (`demo@studydungeon.com` / `demopass123`) for instant offline evaluation.

---

## 🛠️ Technology Stack

| Layer | Technologies | Purpose |
|---|---|---|
| **Frontend** | **React 18**, **Vite**, **React Router 6**, **Vanilla CSS** | Fast, responsive retro dark theme with CRT scanline effects, monospace fonts, and interactive HUD |
| **Backend API** | **Node.js (ES Modules)**, **Express.js** | Modular REST API, deterministic combat engine, asynchronous generation pipeline |
| **Database** | **MongoDB**, **Mongoose ODM** on **MongoDB Atlas** | Document store with embedded floors/monsters and decoupled collections for users, runs, attempts, and mastery |
| **AI / LLM** | **Google Gemini API** (`gemini-3.1-flash-lite`, `@google/generative-ai`) | Parallelized concept extraction, distractor generation, and MCQ creation |
| **Document Processing** | **`pdf-parse`**, **`pdf2json`**, custom token chunker | PDF parsing, multi-format normalization, token-aware chunking |
| **Validation & Security** | **Zod**, **JWT**, **`bcrypt`** | Strict LLM output validation, stateless token authentication, password hashing |
| **Testing** | Node built-in test runner (`node:test`) | Unit tests for game rules, damage math, streak calculations, and integration checks |
| **Deployment** | **Vercel** (Frontend), **Render** (Backend), **MongoDB Atlas** (Database) | Production cloud hosting with automated CI/CD and CORS whitelist |

---

## 🧠 Engineering Depth & Architecture

Study Dungeon is **not** a simple API wrapper or text-in/text-out prompt interface. The external LLM is only an extraction tool inside a larger, deterministic software architecture:

```
+-------------------------------------------------------------+
|                     React + Vite Frontend                   |
|           (Retro RPG HUD, Monospace, React Router)          |
+------------------------------+------------------------------+
                               | HTTP / JWT Auth
                               v
+-------------------------------------------------------------+
|                     Express.js REST API                     |
|                   (Auth, Dungeons, Runs)                    |
+---------------+-----------------------------+---------------+
                |                             |
                v                             v
+-------------------------------+ +---------------------------+
|  Deterministic Game Engine    | |  Async Generation Pipe    |
| - Server-Side Damage Math     | | - PDF Extraction (2 engines)
| - Withheld-Answer Anti-Cheat  | | - SHA-256 Text Hashing   |
| - Dynamic Monster Re-Queuing  | | - Parallel LLM Calls      |
| - Boss Lockout / Mistake Gates| | - Zod Schema Validation   |
| - Post-Run Analytics Engine   | | - Self-Healing Retry Logic|
+---------------+---------------+ +-------------+-------------+
                |                               |
                +---------------+---------------+
                                |
                                v
+-------------------------------------------------------------+
|                  MongoDB Atlas (Mongoose ODM)               |
|      Users  |  Dungeons  |  Runs  |  Attempts  |  Mastery   |
+-------------------------------------------------------------+
```

### Key Engineering Decisions:
1. **Separation of Content Generation and Game Rules**: An LLM cannot be trusted with scoring, health points, or win/loss decisions. The LLM only structures educational notes into schema-validated JSON. The game logic is 100% deterministic TypeScript/JavaScript.
2. **Anti-Cheat Verification**: The correct answer is never delivered to the client during a question prompt, preventing browser DevTools inspection. The client only sends the chosen option, which is graded on the backend.
3. **Resilient Parallel Pipeline**: Uses `Promise.all` across text chunks and prioritizes `gemini-3.1-flash-lite` to bypass 503 high-demand errors, reducing generation latency from over 5 minutes to under 15 seconds.
4. **Self-Healing AI Validation**: If Gemini returns invalid JSON or does not strictly match the 4-option schema, the server catches the Zod error issues and triggers an automated correction prompt with the exact validation failure.

---

## 🎮 Game Rules & Mechanics

| Game Mechanic | Server Rule |
|---|---|
| **Player HP** | 100 starting HP. Reaching 0 HP causes run defeat. |
| **Damage Penalty** | Wrong answer loses **20 HP**. Streak resets to 0. Correct answer & explanation revealed. Concept re-queued. |
| **XP & Streak Bonus** | Correct answer awards **+10 XP** base + **+5 XP** per consecutive hit (streak bonus capped at +30 XP). |
| **Monster HP** | Difficulty 1: **2 hits**. Difficulty 2 & 3: **3 hits**. Floor Bosses: **5 hits**. |
| **Floor Boss Unlock** | Unlocked only after all standard floor monsters are slain. |
| **Boss Mistake Limit** | 5 mixed synthesis questions. A maximum of **2 mistakes allowed** (3rd mistake fails the run). |
| **Mastery States** | **Slain** (2+ correct hits), **Wounded** (missed at least once), **Untouched** (not encountered). |

---

## ⚡ Local Setup Guide

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher (`node -v`)
- **MongoDB**: Local MongoDB instance or MongoDB Atlas connection string

### 2. Clone Repository & Install Dependencies
```bash
git clone https://github.com/Surya-Saketh-P/Study_Dungeon.git
cd Study_Dungeon

# Install server and client dependencies
npm --prefix server install
npm --prefix client install
```

### 3. Configure Environment Variables

**Server Configuration (`server/.env`):**
```bash
cp server/.env.example server/.env
```
Populate `server/.env`:
```env
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/study_dungeon?retryWrites=true&w=majority
JWT_SECRET=your_jwt_secret_key_here
GEMINI_API_KEY=your_gemini_api_key_here
CLIENT_URL=http://localhost:5173
```

**Client Configuration (`client/.env` - optional in development):**
```env
# Leave blank for local dev (Vite proxy automatically forwards /api to :5000)
VITE_API_URL=
```

### 4. Seed Demo Data (Optional / Offline Mode)
```bash
npm --prefix server run seed
```
Creates:
- Demo User: `demo@studydungeon.com` / `demopass123`
- Pre-seeded Dungeon: *Data Structures & Algorithms Cavern* (BST, Hash Tables, and Floor Boss)

### 5. Start the Application
In separate terminal windows:
```bash
# Terminal 1: Backend API (:5000)
npm run dev:server

# Terminal 2: React Frontend (:5173)
npm run dev:client
```
Open **`http://localhost:5173`** in your browser.

---

## 🧪 Automated Testing

Study Dungeon includes a comprehensive test suite covering damage math, streak multipliers, boss unlock thresholds, Zod schema validation, text chunking, and full integration flows:

```bash
npm run test:server
```

---

## 🌐 Deployment Links

| Service | Platform | URL |
|---|---|---|
| **Frontend Application** | Vercel | `[Insert Your Vercel URL — e.g. https://study-dungeon.vercel.app]` |
| **Backend REST API** | Render | `[Insert Your Render URL — e.g. https://study-dungeon-api.onrender.com]` |
| **API Health Check** | Render | `https://<your-render-url>/api/health` |
| **Database** | MongoDB Atlas | Hosted M0 Cluster (Replica Set) |

---

## 📜 License

This project is licensed under the MIT License.
