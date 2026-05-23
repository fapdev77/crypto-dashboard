import { UnifiedHistoryPosition, UnifiedBillRecord } from '../types';

export interface MilestoneData {
  threshold: string; // e.g., "$60,000 - $62,500"
  daysSpent: number;
  equityStart: number;
  equityEnd: number;
  equityChange: number;
}

/**
 * Calculates the Price Evolution Matrix (Milestone Tracker).
 * For now, this is a simulated logic that demonstrates how portfolio equity
 * correlates with BTC price brackets.
 * 
 * In a fully live environment, we would:
 * 1. Reconstruct historical daily equity by walking backwards from currentEquity using history and bills.
 * 2. Fetch daily BTC K-lines.
 * 3. Group by BTC price brackets (e.g., $2500 steps).
 */
export function calculateMilestones(
  history: UnifiedHistoryPosition[],
  bills: UnifiedBillRecord[],
  currentEquity: number
): MilestoneData[] {
  if (currentEquity === 0) return [];

  // 1. Reconstruct Equity (Simulated logic for demonstration)
  // We'll mock the BTC price brackets for the sake of the UI
  // assuming the portfolio grew as BTC grew over the last period.
  
  const basePrice = 60000;
  const step = 2500;
  
  const milestones: MilestoneData[] = [];
  
  // We simulate 4 recent price brackets BTC crossed
  let simulatedEquity = currentEquity * 0.8; // Assume started at 80% of current equity
  
  for (let i = 0; i < 4; i++) {
    const lower = basePrice + (i * step);
    const upper = lower + step;
    
    // Simulate some random days spent in this bracket
    const days = Math.floor(Math.random() * 10) + 2;
    
    // Simulate equity change during this bracket
    const nextEquity = simulatedEquity * (1 + (Math.random() * 0.05)); // 0-5% growth per bracket
    
    milestones.push({
      threshold: `$${lower.toLocaleString()} - $${upper.toLocaleString()}`,
      daysSpent: days,
      equityStart: simulatedEquity,
      equityEnd: nextEquity,
      equityChange: nextEquity - simulatedEquity
    });
    
    simulatedEquity = nextEquity;
  }
  
  // Final bracket leads exactly to currentEquity
  milestones[milestones.length - 1].equityEnd = currentEquity;
  milestones[milestones.length - 1].equityChange = currentEquity - milestones[milestones.length - 1].equityStart;
  
  return milestones.reverse(); // Newest (highest) threshold first
}
