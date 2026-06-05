export type TesouroBondType =
  | "Tesouro IPCA+"
  | "Tesouro IPCA+ com Juros Semestrais"
  | "Tesouro Prefixado"
  | "Tesouro Prefixado com Juros Semestrais"
  | "Tesouro Selic"
  | "Tesouro Educa+"
  | "Tesouro Renda+ Aposentadoria Extra"
  | "Tesouro IGPM+ com Juros Semestrais";

export interface TesouroPU {
  tipo: TesouroBondType;
  vencimento: string;  // YYYY-MM-DD
  dataBase: string;    // YYYY-MM-DD
  puCompra: number;
  puVenda: number;
  puBase: number;
  taxaCompra: number;
  taxaVenda: number;
}

// Chave: `${tipo}|${vencimento}`
export type TesouroPriceMap = Map<string, TesouroPU>;
