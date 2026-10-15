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
    return '••• 張 (•••••• 股)';
  }
  const lots = shares / 1000;
  return `${lots.toLocaleString('zh-TW')} 張 (${shares.toLocaleString('zh-TW')} 股)`;
}

export function formatPrivateLots(shares: number, isMasked: boolean): string {
  if (isMasked) {
    return '••• 張';
  }
  return `${(shares / 1000).toLocaleString('zh-TW')} 張`;
}

export function formatPrivateRawShares(shares: number, isMasked: boolean): string {
  if (isMasked) {
    return '•••••• 股';
  }
  return `${shares.toLocaleString('zh-TW')} 股`;
}

export function formatPrivateCost(cost: number, isMasked: boolean): string {
  if (isMasked) {
    return '••.••';
  }
  return cost.toFixed(2);
}

export function formatPrivatePct(pct: number, isMasked: boolean, showSign: boolean = true): string {
  if (isMasked) {
    return showSign ? '+•••%' : '•••%';
  }
  const sign = showSign && pct > 0 ? '+' : '';
  return `${sign}${pct.toFixed(2)}%`;
}

export function formatPrivateEmail(email: string | null | undefined, isMasked: boolean): string {
  if (!email) return '';
  if (!isMasked) return email;
  const parts = email.split('@');
  if (parts.length === 2) {
    const name = parts[0];
    const maskedName = name.length <= 2 ? '••' : name[0] + '••••' + name[name.length - 1];
    return `${maskedName}@${parts[1]}`;
  }
  return '••••••';
}
