import { Metadata } from "next";
import { getTransferEvents } from "@/lib/data/transfers";
import { TransfersView } from "@/components/transfers/TransfersView";

export const metadata: Metadata = { title: "Transferências — Invest" };

export default async function TransfersPage() {
  const events = await getTransferEvents();
  return <TransfersView events={events} />;
}
