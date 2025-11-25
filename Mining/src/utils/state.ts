/**
 * State Persistence
 *
 * Saves and loads session state to survive bot restarts.
 * Stores variables like setupMotherload, lastCheckpoints, etc.
 */

import * as fs from "fs";
import * as path from "path";
import logger from "./logger";

const STATE_FILE = path.join(process.cwd(), "data", "bot-state.json");

export interface BotState {
  setupMotherload: number;
  setupTimestamp: number;
  setupRoundId: number;
  automationAddress?: string;
  lastRestartRoundId?: number;
  notes?: string;
}

const DEFAULT_STATE: BotState = {
  setupMotherload: 0,
  setupTimestamp: 0,
  setupRoundId: 0,
};

/**
 * Load bot state from disk
 */
export function loadState(): BotState {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const data = fs.readFileSync(STATE_FILE, "utf-8");
      const state = JSON.parse(data) as BotState;
      logger.info("Loaded bot state from disk", {
        setupMotherload: state.setupMotherload,
        setupRoundId: state.setupRoundId,
        setupTimestamp: state.setupTimestamp,
      });
      return state;
    }
  } catch (error) {
    logger.warn("Failed to load bot state, using defaults", { error });
  }

  return { ...DEFAULT_STATE };
}

/**
 * Save bot state to disk
 */
export function saveState(state: BotState): void {
  try {
    const dataDir = path.dirname(STATE_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf-8");
    logger.info("Saved bot state to disk", {
      setupMotherload: state.setupMotherload,
      setupRoundId: state.setupRoundId,
      setupTimestamp: state.setupTimestamp,
    });
  } catch (error) {
    logger.error("Failed to save bot state", { error });
  }
}

/**
 * Clear bot state (e.g., when automation is closed)
 */
export function clearState(): void {
  try {
    if (fs.existsSync(STATE_FILE)) {
      fs.unlinkSync(STATE_FILE);
      logger.info("Cleared bot state");
    }
  } catch (error) {
    logger.error("Failed to clear bot state", { error });
  }
}

/**
 * Update specific fields in state without overwriting everything
 */
export function updateState(updates: Partial<BotState>): void {
  const currentState = loadState();
  const newState = { ...currentState, ...updates };
  saveState(newState);
}
