import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ASSURANCE_COPY } from "../holdings/assurance.ts";
import type { TicketDetail as Detail } from "../holdings/detail.ts";

export interface TicketDetailProps {
  readonly detail: Detail;
  readonly onClose: () => void;
}

/** A held ticket (T-030-05): class, policy, restrictions, attendance, and its assurance level. */
export function TicketDetail({ detail, onClose }: TicketDetailProps) {
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
    <ScrollView contentContainerStyle={styles.page} testID="ticket-detail">
      <Pressable accessibilityRole="button" onPress={onClose} testID="ticket-detail-close">
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
      <Text style={styles.heading}>{ASSURANCE_COPY.heading}</Text>
      {detail.assurance === null ? (
        <Text style={styles.value}>Not known until the ledger has been reached.</Text>
      ) : (
        <View style={styles.assurance} testID="assurance-level">
          <Text style={styles.label}>{ASSURANCE_COPY.enforced}</Text>
          {detail.assurance.enforced.map((line) => (
            <Text key={line} style={styles.value}>
              • {line}
            </Text>
          ))}
          <Text style={styles.label}>{ASSURANCE_COPY.attested}</Text>
          <Text style={styles.note}>{ASSURANCE_COPY.attestedNote}</Text>
          {detail.assurance.attested.map((line) => (
            <Text key={line} style={styles.value}>
              • {line}
            </Text>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 24, gap: 12 },
  link: { fontSize: 16, color: "#1f5fbf" },
  title: { fontSize: 30, fontWeight: "700" },
  heading: { fontSize: 20, fontWeight: "600", marginTop: 16 },
  row: { gap: 2 },
  label: { fontSize: 13, fontWeight: "600", color: "#555" },
  value: { fontSize: 16 },
  note: { fontSize: 14, color: "#555" },
  assurance: { gap: 6 },
});
