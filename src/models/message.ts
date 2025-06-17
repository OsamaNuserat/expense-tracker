
export type MessageType = 'income' | 'expense' | 'unknown';

export interface ParsedMessage {
  originalMessage: string;
  timestamp: string;
  amount: number;
  merchant?: string;
  category: string;
  type: MessageType;
  source: string | undefined;
}