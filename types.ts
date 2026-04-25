
export interface Base58State {
  input: string;
  output: string;
  error: string | null;
}

export enum Mode {
  ENCODE = 'ENCODE',
  DECODE = 'DECODE'
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  mode: Mode;
  input: string;
  output: string;
}
