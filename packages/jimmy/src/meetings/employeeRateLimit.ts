/**
 * In-memory rate limiter for employee-initiated meetings.
 *
 * Uses a sliding window of timestamps per employee. No external dependencies.
 */

const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_PER_EMPLOYEE = 3;
const MAX_GLOBAL = 15;

/** Timestamps (ms) of proposals keyed by employee name */
const employeeTimestamps = new Map<string, number[]>();

/** Prune entries older than the sliding window */
function pruneWindow(timestamps: number[], now: number): number[] {
  return timestamps.filter(t => now - t < WINDOW_MS);
}

/** Count all proposals across all employees within the current window */
function globalCount(now: number): number {
  let total = 0;
  for (const timestamps of employeeTimestamps.values()) {
    total += pruneWindow(timestamps, now).length;
  }
  return total;
}

/**
 * Check whether the given employee is allowed to propose a meeting right now.
 * Returns `{ allowed: true }` or `{ allowed: false, reason, retryAfterMs }`.
 */
export function checkEmployeeMeetingLimit(
  employeeName: string,
): { allowed: boolean; reason?: string; retryAfterMs?: number } {
  const now = Date.now();

  // Global cap
  const global = globalCount(now);
  if (global >= MAX_GLOBAL) {
    // Find the oldest timestamp across all employees to calculate retry window
    let oldest = now;
    for (const timestamps of employeeTimestamps.values()) {
      const pruned = pruneWindow(timestamps, now);
      if (pruned.length > 0 && pruned[0] < oldest) oldest = pruned[0];
    }
    const retryAfterMs = WINDOW_MS - (now - oldest);
    return {
      allowed: false,
      reason: `Global meeting limit of ${MAX_GLOBAL} per hour reached`,
      retryAfterMs,
    };
  }

  // Per-employee cap
  const raw = employeeTimestamps.get(employeeName) ?? [];
  const pruned = pruneWindow(raw, now);

  if (pruned.length >= MAX_PER_EMPLOYEE) {
    const oldest = pruned[0];
    const retryAfterMs = WINDOW_MS - (now - oldest);
    return {
      allowed: false,
      reason: `Employee "${employeeName}" has reached the limit of ${MAX_PER_EMPLOYEE} meeting proposals per hour`,
      retryAfterMs,
    };
  }

  return { allowed: true };
}

/**
 * Record that an employee has proposed a meeting (call after the meeting is accepted).
 */
export function recordEmployeeMeetingProposal(employeeName: string): void {
  const now = Date.now();
  const raw = employeeTimestamps.get(employeeName) ?? [];
  const pruned = pruneWindow(raw, now);
  pruned.push(now);
  employeeTimestamps.set(employeeName, pruned);
}

/**
 * Return observability stats: each employee with proposals in the current window.
 */
export function getEmployeeMeetingStats(): {
  employee: string;
  count: number;
  oldestProposal: string;
}[] {
  const now = Date.now();
  const result: { employee: string; count: number; oldestProposal: string }[] = [];

  for (const [employee, raw] of employeeTimestamps.entries()) {
    const pruned = pruneWindow(raw, now);
    // Update the stored list in place (prune expired entries)
    employeeTimestamps.set(employee, pruned);
    if (pruned.length === 0) continue;
    result.push({
      employee,
      count: pruned.length,
      oldestProposal: new Date(pruned[0]).toISOString(),
    });
  }

  return result;
}
