export async function fetchUsdBrl(): Promise<number> {
  const res = await fetch("https://economia.awesomeapi.com.br/json/last/USD-BRL", {
    cache: "no-store",
    headers: { "User-Agent": "invest-app/1.0" },
  });
  if (!res.ok) throw new Error(`AwesomeAPI HTTP ${res.status}`);
  const data = (await res.json()) as { USDBRL?: { bid: string } };
  const bid = parseFloat(data.USDBRL?.bid ?? "0");
  if (!bid || isNaN(bid)) throw new Error("FX rate inválido da AwesomeAPI");
  return bid;
}
