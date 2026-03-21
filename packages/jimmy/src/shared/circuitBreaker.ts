/**
 * Global circuit breaker for engine calls.
 *
 * Trips after FAILURE_THRESHOLD consecutive failures within WINDOW_MS.
 * Once open, blocks retries for RESET_TIMEOUT_MS before entering half-open.
 * A single success in half-open state closes the circuit.
 */

import { logger } from "./logger.js";

export interface CircuitBreakerState {
  consecutiveFailures: number;
  lastFailureAt: number;
  isOpen: boolean;
  openedAt: number | null;
}

const FAILURE_THRESHOLD = 5;
const RESET_TIMEOUT_MS = 60_000;   // 1 minute before half-open attempt
const WINDOW_MS = 300_000;          // 5 minute sliding window for consecutive failure count

const state: CircuitBreakerState = {
  consecutiveFailures: 0,
  lastFailureAt: 0,
  isOpen: false,
  openedAt: null,
};

export function recordFailure(): void {
  const now = Date.now();

  // Reset consecutive count if last failure is outside the window
  if (state.lastFailureAt > 0 && now - state.lastFailureAt > WINDOW_MS) {
    state.consecutiveFailures = 0;
  }

  state.consecutiveFailures++;
  state.lastFailureAt = now;

  if (!state.isOpen && state.consecutiveFailures >= FAILURE_THRESHOLD) {
    state.isOpen = true;
    state.openedAt = now;
    logger.warn(
      `Circuit breaker opened after ${state.consecutiveFailures} consecutive failures`,
    );
  }
}

export function recordSuccess(): void {
  const wasOpen = state.isOpen;
  state.consecutiveFailures = 0;
  state.lastFailureAt = 0;
  state.isOpen = false;
  state.openedAt = null;

  if (wasOpen) {
    logger.info("Circuit breaker closed — successful response received");
  }
}

export function isCircuitOpen(): boolean {
  if (!state.isOpen) return false;

  // Half-open: allow one attempt after the reset timeout has elapsed
  if (state.openedAt !== null && Date.now() - state.openedAt >= RESET_TIMEOUT_MS) {
    logger.info("Circuit breaker entering half-open state — allowing retry attempt");
    return false;
  }

  return true;
}

export function getCircuitState(): CircuitBreakerState {
  return { ...state };
}

export function resetCircuit(): void {
  state.consecutiveFailures = 0;
  state.lastFailureAt = 0;
  state.isOpen = false;
  state.openedAt = null;
  logger.info("Circuit breaker manually reset");
}
