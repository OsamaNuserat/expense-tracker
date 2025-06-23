export interface ParsedMessage {
  originalMessage: string;
  timestamp: string;
  amount: number;
  merchant: string | null;
  category: string;
  type: 'expense' | 'income' | 'unknown';
  source: string | null; 
}

export type JsonValue = 
  | string 
  | number 
  | boolean 
  | null 
  | { [key: string]: JsonValue } 
  | JsonValue[];

export type JsonObject = { [key: string]: JsonValue };
export type JsonArray = JsonValue[];