import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { type LedgerHolding, provenanceTitle } from "../holdings/degraded.ts";
import { className, eventName, formatDate, placeText } from "../holdings/detail.ts";
import type { LoadedHoldings } from "../holdings/load.ts";
import type { HoldingView } from "../holdings/types.ts";
import type { Router } from "./router.ts";
import { Screen } from "./Screen.tsx";

export type OpenedHolding =
  | { readonly from: "kippu"; readonly holding: HoldingView }
  | { readonly from: "ledger"; readonly holding: LedgerHolding };

interface Card {
  readonly id: string;
  readonly title: string;
  readonly event: string;
  readonly place: string;
  readonly opened: OpenedHolding;
}

function cards(loaded: LoadedHoldings | null): Card[] {
  if (loaded === null || loaded.source === "none") return [];
  if (loaded.source === "ledger") {
    return loaded.tickets.map((holding) => ({
      id: holding.ticket.id,
      title: provenanceTitle(holding.ticket.provenance),
      event: eventName(null, holding.ticket.event),
      place: placeText(holding.ticket.placement),
      opened: { from: "ledger", holding },
    }));
  }
  return loaded.entry.read.holdings.map((holding) => ({
    id: holding.ticket.id,
    title: className(holding.ticket) ?? "Ticket",
    event: eventName(holding.event, holding.ticket.event),
    place: placeText(holding.ticket.placement),
    opened: { from: "kippu", holding },
  }));
}

export interface HoldingsProps {
  readonly loaded: LoadedHoldings | null;
  readonly router: Router;
  readonly onRefresh: () => void;
}

/** The holder's tickets (T-030-05), from Kippu's copy or the device cache. */
export function Holdings({ loaded, router, onRefresh }: HoldingsProps) {
  const holdings = cards(loaded);
  return (
    <Screen id="tickets.list" busy={loaded === null}>
      <ScrollView contentContainerStyle={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brand}>Saifu</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.navigate("tickets.list", "settings.main", {})}
            testID="open-settings"
          >
            <Text style={styles.link}>Settings</Text>
          </Pressable>
        </View>
        <Text style={styles.heading}>Your tickets</Text>
        {loaded === null ? <Text style={styles.note}>Loading…</Text> : null}
        {loaded?.source === "ledger" ? (
          <Text style={styles.note} testID="holdings-ledger">
            Kippu cannot be reached. These tickets are read from the ledger, so only what the ledger
            records is shown.
          </Text>
        ) : null}
        {loaded?.source === "cache" ? (
          <Text style={styles.note} testID="holdings-cached">
            Kippu cannot be reached. Showing your tickets as of {formatDate(loaded.entry.savedAt)}.
          </Text>
        ) : null}
        {loaded?.source === "none" ? (
          <Text style={styles.note}>
            Kippu cannot be reached, and this phone has no tickets saved yet.
          </Text>
        ) : null}
        {loaded !== null && loaded.source !== "none" && holdings.length === 0 ? (
          <Text style={styles.note}>You hold no tickets yet.</Text>
        ) : null}
        {holdings.map((card) => (
          <Pressable
            accessibilityRole="button"
            key={card.id}
            onPress={() => router.navigate("tickets.list", "ticket.detail", { ticket: card.id })}
            style={styles.card}
            testID={`holding-${card.id}`}
          >
            <Text style={styles.cardTitle}>{card.title}</Text>
            <Text style={styles.cardLine}>{card.event}</Text>
            <Text style={styles.cardLine}>{card.place}</Text>
          </Pressable>
        ))}
        <Pressable accessibilityRole="button" onPress={onRefresh} testID="holdings-refresh">
          <Text style={styles.link}>Refresh</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { padding: 24, gap: 16 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  brand: { fontSize: 32, fontWeight: "600" },
  heading: { fontSize: 22, fontWeight: "600" },
  link: { fontSize: 16, color: "#1f5fbf" },
  note: { fontSize: 15, color: "#555" },
  card: { borderWidth: 1, borderColor: "#ddd", borderRadius: 12, padding: 16, gap: 4 },
  cardTitle: { fontSize: 18, fontWeight: "600" },
  cardLine: { fontSize: 15 },
});
