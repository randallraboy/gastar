export type ReceiptStatus = "pending" | "processed" | "unreadable" | "converted";

const TERMINAL: ReceiptStatus[] = ["processed", "unreadable", "converted"];

export function isTerminalReceiptStatus(status: ReceiptStatus): boolean {
  return TERMINAL.includes(status);
}

export function canProcessReceipt(status: ReceiptStatus): boolean {
  return status === "pending";
}

export function canMarkUnreadable(status: ReceiptStatus): boolean {
  return status === "pending";
}

export function canConvertToManual(status: ReceiptStatus): boolean {
  return status === "pending" || status === "unreadable";
}

export function canDiscardReceipt(status: ReceiptStatus): boolean {
  return status === "pending" || status === "unreadable";
}
