import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { className, eventName, formatDate, placeText } from "../holdings/detail.ts";
import type { LoadedHoldings } from "../holdings/load.ts";
import type { HoldingView } from "../holdings/types.ts";

export interface HoldingsProps {
  readonly loaded: LoadedHoldings | null;
  readonly onOpen: (holding: HoldingView) => void;
  readonly onRefresh: () => void;
  readonly onSettings: () => void;
}

/** The holder's tickets (T-030-05), from Kippu's copy or the device cache. */
export function Holdings({ loaded, onOpen, onRefresh, onSettings }: HoldingsProps) {
  const holdings = loaded === null || loaded.source === "none" ? [] : loaded.entry.read.holdings;
  return (
    <ScrollView contentContainerStyle={styles.page} testID="holdings">
      <View style={styles.header}>
        <Text style={styles.brand}>Saifu</Text>
        <Pressable accessibilityRole="button" onPress={onSettings} testID="open-settings">
          <Text style={styles.link}>Settings</Text>
        </Pressable>
      </View>
      <Text style={styles.heading}>Your tickets</Text>
      {loaded === null ? <Text style={styles.note}>Loading…</Text> : null}
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
      {holdings.map((holding) => (
        <Pressable
          accessibilityRole="button"
          key={holding.ticket.id}
          onPress={() => onOpen(holding)}
          style={styles.card}
          testID={`holding-${holding.ticket.id}`}
        >
          <Text style={styles.cardTitle}>{className(holding.ticket) ?? "Ticket"}</Text>
          <Text style={styles.cardLine}>{eventName(holding.event, holding.ticket.event)}</Text>
          <Text style={styles.cardLine}>{placeText(holding.ticket.placement)}</Text>
        </Pressable>
      ))}
      <Pressable accessibilityRole="button" onPress={onRefresh} testID="holdings-refresh">
        <Text style={styles.link}>Refresh</Text>
      </Pressable>
    </ScrollView>
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
