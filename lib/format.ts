export function formatNumber(value: number | string, decimals = 2, useSeparators = true): string {
  const num = typeof value === "string" ? parseFloat(value.replace(/,/g, "")) : value;
  if (isNaN(num)) return "0";
  if (!useSeparators) {
    return num.toFixed(decimals);
  }
  return num.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function parseNumber(value: string): number {
  return parseFloat(value.replace(/,/g, "")) || 0;
}

export function formatCurrency(value: number | string): string {
  const num = typeof value === "string" ? parseFloat(value.replace(/,/g, "")) : value;
  if (isNaN(num)) return "0.00";
  return num.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatPercent(value: number | string): string {
  const num = typeof value === "string" ? parseFloat(value.replace(/,/g, "")) : value;
  if (isNaN(num)) return "0%";
  return `${num.toLocaleString("en-US", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`;
}
