# ⚔️ Study Dungeon

> **Turn your own notes into a playable text RPG where every concept is a monster and every correct answer is a hit.**

[![Node.js](https://img.shields.io/badge/Node.js-20%2B-brightgreen)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-blue)](https://react.dev/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-green)](https://www.mongodb.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 📖 Product Overview

Students revise by re-reading notes, which is passive and quickly boring. Generic AI quiz generators remove authoring work but offer no sense of progression, stakes, or replay value.

**Study Dungeon** transforms static study materials (uploaded PDFs or pasted notes) into an active-recall turn-based RPG:
- **Concepts are Monsters**: Encounter curriculum topics rendered as monsters with HP bars.
- **Hits & Damage**: Correct answers deal hits; wrong answers cost player HP (-20 HP).
- **Streak & XP Rewards**: Consecutive correct answers grant scaling XP streak bonuses.
- **Floor Boss Gates**: Clearing all concepts on a floor unlocks a synthesis trial with limited mistakes allowed.
- **Weak Spots Analytics**: Post-run debrief ranks your struggling concepts by miss rate and response time, powering instant **Revenge Runs**.
- **Deterministic Server Logic**: The LLM only generates content (concepts and MCQs). All game mechanics (damage, HP, streak, boss unlock, win/loss, mastery) are strictly deterministic server code.

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | React 18 + Vite, React Router 6, Plain CSS | Fast, dark retro RPG UI with monospace typography and responsive HP animations |
| **Backend API** | Node.js (ES Modules), Express | Modular REST API with JWT auth and deterministic game engine |
| **Database** | MongoDB (Mongoose) | Embedded floors/monsters/questions; decoupled collections for users, runs, attempts, and mastery |
| **Extraction & AI** | `pdf-parse`, `@google/generative-ai`, `zod` | Text chunking, Gemini API with strict JSON schema validation and retry logic |
| **Testing** | Node built-in test runner (`node:test`) | Unit tests for game rules, damage math, streak calculations, and integration checks |

---

## ⚡ Quick Start Guide

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher (`node -v`)
- **MongoDB**: A running MongoDB instance on `127.0.0.1:27017` (e.g. via Podman/Docker or local service)
  ```bash
  # Example with Podman or Docker
  podman run -d --name study_mongo -p 27017:27017 mongo:latest
  ```

### 2. Install Dependencies
```bash
# Install root, server, and client dependencies
npm --prefix server install
npm --prefix client install
```

### 3. Configure Environment Variables
Copy the server template:
```bash
cp server/.env.example server/.env
```
Default configuration (`server/.env`):
```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/study_dungeon
JWT_SECRET=study_dungeon_dev_secret_key_2026
GEMINI_API_KEY=your_gemini_api_key_here
```
*(Note: If no `GEMINI_API_KEY` is provided, the seeded demo dungeon works 100% out of the box with zero external dependencies!)*

### 4. Seed Pre-Generated Demo Dungeon (F13)
```bash
npm run seed
```
This populates:
- **Demo User**: `demo@studydungeon.com` / `demopass123`
- **Demo Dungeon**: *Data Structures & Algorithms Cavern* (BST, Hash Tables, and Floor Boss)

### 5. Launch the Application
In separate terminal tabs:
```bash
# Terminal 1: Backend API (:5000)
npm run dev:server

# Terminal 2: React Frontend (:5173)
npm run dev:client
```
Visit **`http://localhost:5173`** in your browser.

---

## 🎮 Game Design Rules

| Element | Deterministic Server Rule |
|---|---|
| **Player HP** | Starts each run with **100 HP** and **0 XP**. |
| **Monster HP** | **2 hits** at Difficulty 1; **3 hits** at Difficulty 2 & 3; **5 hits** for Floor Bosses. |
| **Correct Answer** | Monster loses 1 hit. Earns **+10 XP**, plus **+5 XP** per consecutive correct answer (streak bonus capped at +30 XP). |
| **Wrong Answer** | Player loses **20 HP**. Streak resets to 0. Correct answer & explanation revealed. Monster is re-queued for later revision. |
| **Boss Trial** | Unlocked when all regular floor monsters are defeated. 5 mixed questions; max **2 mistakes allowed** (3rd mistake fails the run). |
| **Victory** | All floors cleared. Detailed summary with accuracy %, duration, and weak spots. |
| **Defeat** | Player HP drops to 0. Comprehensive revision debrief lists missed concepts. |
| **Mastery States** | **Slain** (answered correctly twice), **Wounded** (missed at least once), **Untouched** (not yet faced). |

---

## 🧪 Automated Testing

Run the full test suite (14 unit & integration tests) covering damage rules, streak maths, boss unlock, Zod schema validation, text chunker, and MongoDB gameplay flow:

```bash
npm run test:server
```

---

## 📐 Architecture & Data Model

```
                    +---------------------------+
                    |   React + Vite Frontend   |
                    | (Monospace / Dark Retro)  |
                    +-------------+-------------+
                                  |
                                  | HTTP / JWT
                                  v
                    +---------------------------+
                    |    Express REST API       |
                    |        (:5000)            |
                    +-------+-----------+-------+
                            |           |
            +---------------+           +---------------+
            v                                           v
+-----------------------+                   +-----------------------+
|  Deterministic Game   |                   |  Generation Pipeline  |
|  Engine (gameEngine)  |                   | (pdf-parse + Gemini)  |
+-----------+-----------+                   +-----------+-----------+
            |                                           |
            +-------------------+   +-------------------+
                                |   |
                                v   v
                    +---------------------------+
                    |     MongoDB (Mongoose)    |
                    |  - users                  |
                    |  - dungeons (embeds floors|
                    |    monsters & questions)  |
                    |  - runs                   |
                    |  - attempts               |
                    |  - mastery                |
                    +---------------------------+
```

---

## 🛡️ Security & Evaluator Talking Points

1. **Deterministic Logic**: LLM output is strictly confined to content creation. grading, HP penalties, XP multipliers, boss gates, and win/loss states are executed exclusively in isolated server modules.
2. **Withheld Answers**: At no point does `GET /api/runs/:id/next` expose `correct_answer` or `explanation` to the client. Grading occurs strictly on `POST /api/runs/:id/answer`.
3. **Resilient AI Pipeline**: LLM output is requested as strict JSON and validated against a Zod schema. If the model outputs invalid formatting, it retries once with the exact error prompt; if it still fails, it skips that chunk gracefully without crashing.
4. **SHA-256 Text Caching**: Uploaded notes are hashed. Re-uploading identical notes delivers an instant cache hit with zero token overhead and 0-second latency.
5. **Zero-Dependency Seed**: If evaluator internet access is limited or API limits are hit, the pre-seeded demo mode (`npm run seed`) demonstrates every single gameplay feature instantly.
