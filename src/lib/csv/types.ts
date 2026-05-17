import Decimal from "decimal.js";
import type { Enums } from "@/types/database";

export type AssetClass = Enums<"asset_class">;
export type Indexer = Enums<"indexer">;
export type Currency = Enums<"currency">;

export interface ParsedPosition {
  ticker: string | null;
  name: string;
  assetClass: AssetClass;
  currency: Currency;
  quantity: Decimal;
  avgPrice: Decimal | null;
  currentPrice: Decimal | null;
  marketValue: Decimal;
  maturityDate: Date | null;
  indexer: Indexer | null;
  indexerRate: Decimal | null;
  liquidityDays: number | null;
  quotaValue: Decimal | null;
  quotaDate: Date | null;
  rawData: Record<string, string>;
}

export interface ParseError {
  row: number;
  field: string;
  message: string;
}

export interface ParseResult {
  positions: ParsedPosition[];
  errors: ParseError[];
  format: "xp" | "btg" | "nomad" | "unknown";
}

export type CsvFormat = "xp" | "btg" | "nomad";
