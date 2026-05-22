export function calculateRoe(unrealizedPnl: number | undefined, margin: number | undefined): number | undefined {
  if (unrealizedPnl !== undefined && margin !== undefined && margin > 0) {
    return (unrealizedPnl / margin) * 100;
  }
  return undefined;
}
