/**
 * Privacy Mask Helper
 * Conceals personal asset numbers for public demonstration or screen privacy
 */

export function formatPrivateTWD(amount: number, isMasked: boolean): string {
  if (isMasked) {
    return '••••••';
  }
  return amount.toLocaleString('zh-TW', { maximumFractionDigits: 0 });
}

export function formatPrivateShares(shares: number, isMasked: boolean): string {
  if (isMasked) {
    return '••• 張';
  }
  const lots = shares / 1000;
  return `${lots.toLocaleString('zh-TW')} 張 (${shares.toLocaleString('zh-TW')} 股)`;
}
