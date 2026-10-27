-- Study Dungeon MySQL Schema
-- Strictly matching PRD Section 8

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS dungeons (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  source_hash VARCHAR(64) DEFAULT NULL,
  status ENUM('processing', 'ready', 'failed') NOT NULL DEFAULT 'processing',
  error_message TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_source_hash (source_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS floors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  dungeon_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  order_index INT NOT NULL DEFAULT 1,
  FOREIGN KEY (dungeon_id) REFERENCES dungeons(id) ON DELETE CASCADE,
  INDEX idx_dungeon_floors (dungeon_id, order_index)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS monsters (
  id INT AUTO_INCREMENT PRIMARY KEY,
  floor_id INT NOT NULL,
  concept_name VARCHAR(255) NOT NULL,
  summary TEXT NOT NULL,
  difficulty TINYINT NOT NULL DEFAULT 1,
  is_boss TINYINT(1) NOT NULL DEFAULT 0,
  FOREIGN KEY (floor_id) REFERENCES floors(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS questions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  monster_id INT NOT NULL,
  type ENUM('mcq', 'short') NOT NULL DEFAULT 'mcq',
  prompt TEXT NOT NULL,
  options_json JSON NOT NULL,
  correct_answer TEXT NOT NULL,
  explanation TEXT NOT NULL,
  FOREIGN KEY (monster_id) REFERENCES monsters(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS runs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  dungeon_id INT NOT NULL,
  player_hp INT NOT NULL DEFAULT 100,
  xp INT NOT NULL DEFAULT 0,
  status ENUM('active', 'won', 'lost') NOT NULL DEFAULT 'active',
  mode ENUM('normal', 'revenge') NOT NULL DEFAULT 'normal',
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  finished_at TIMESTAMP NULL DEFAULT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (dungeon_id) REFERENCES dungeons(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS attempts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  run_id INT NOT NULL,
  question_id INT NOT NULL,
  user_answer TEXT NOT NULL,
  is_correct TINYINT(1) NOT NULL DEFAULT 0,
  time_ms INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (run_id) REFERENCES runs(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS mastery (
  user_id INT NOT NULL,
  monster_id INT NOT NULL,
  streak INT NOT NULL DEFAULT 0,
  interval_days INT NOT NULL DEFAULT 1,
  due_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_result ENUM('slain', 'wounded', 'untouched') NOT NULL DEFAULT 'untouched',
  PRIMARY KEY (user_id, monster_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (monster_id) REFERENCES monsters(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
