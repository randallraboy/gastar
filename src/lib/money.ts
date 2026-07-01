export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

export function centsToDollars(cents: number): number {
  return cents / 100;
}

export function formatCad(cents: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
  }).format(centsToDollars(cents));
}

export function parseDollarInput(input: string): number {
  const cleaned = input.replace(/[^0-9.-]/g, "");
  const value = Number.parseFloat(cleaned);
  if (Number.isNaN(value)) {
    throw new Error("Enter a valid dollar amount");
  }
  if (value <= 0) {
    throw new Error("Amount must be greater than zero");
  }
  return dollarsToCents(value);
}
