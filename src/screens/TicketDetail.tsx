import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { TicketDetail as Detail } from "../holdings/detail.ts";
import { AssuranceLevel } from "./AssuranceLevel.tsx";
import type { Router } from "./router.ts";
import { Screen } from "./Screen.tsx";

export interface TicketDetailProps {
  readonly detail: Detail;
  readonly router: Router;
}

/**
 * A held ticket (T-030-05): class, policy, restrictions, attendance, and its
 * assurance level; and the way to its access pass (T-030-07).
 */
export function TicketDetail({ detail, router }: TicketDetailProps) {
  const rows: [string, string][] = [
    ["Event", detail.event],
    ["Event status", detail.eventStatus],
    ["Place", detail.place],
    ["How you got it", detail.provenance],
    ["Admission", detail.policy],
    ["Transfer", detail.restrictions],
    ["Attendance", detail.attendances],
  ];
  return (
    <Screen id="ticket.detail">
      <ScrollView contentContainerStyle={styles.page}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.navigate("ticket.detail", "tickets.list", {})}
          testID="ticket-detail-close"
        >
          <Text style={styles.link}>Back</Text>
        </Pressable>
        <Text style={styles.title} testID="ticket-detail-title">
          {detail.title}
        </Text>
        {rows.map(([label, value]) => (
          <View key={label} style={styles.row}>
            <Text style={styles.label}>{label}</Text>
            <Text style={styles.value}>{value}</Text>
          </View>
        ))}
        <Pressable
          accessibilityRole="button"
          onPress={() => router.navigate("ticket.detail", "ticket.pass", { ticket: detail.id })}
          style={styles.button}
          testID="ticket-detail-show-pass"
        >
          <Text style={styles.buttonText}>Show pass</Text>
        </Pressable>
        <AssuranceLevel assurance={detail.assurance} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { padding: 24, gap: 12 },
  link: { fontSize: 16, color: "#1f5fbf" },
  title: { fontSize: 30, fontWeight: "700" },
  row: { gap: 2 },
  label: { fontSize: 13, fontWeight: "600", color: "#555" },
  value: { fontSize: 16 },
  button: {
    backgroundColor: "#111",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 12,
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
