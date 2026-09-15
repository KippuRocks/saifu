import { StyleSheet, Text, View } from "react-native";
import { ASSURANCE_COPY, type AssuranceLevel as Level } from "../holdings/assurance.ts";

/** A ticket's assurance level (T-030-05; REQ-SDK-6), as the ticket and pass screens show it. */
export function AssuranceLevel({ assurance }: { readonly assurance: Level | null }) {
  return (
    <View style={styles.box}>
      <Text style={styles.heading}>{ASSURANCE_COPY.heading}</Text>
      {assurance === null ? (
        <Text style={styles.value}>Not known until the ledger has been reached.</Text>
      ) : (
        <View style={styles.box} testID="assurance-level">
          <Text style={styles.label}>{ASSURANCE_COPY.enforced}</Text>
          {assurance.enforced.map((line) => (
            <Text key={line} style={styles.value}>
              • {line}
            </Text>
          ))}
          <Text style={styles.label}>{ASSURANCE_COPY.attested}</Text>
          <Text style={styles.note}>{ASSURANCE_COPY.attestedNote}</Text>
          {assurance.attested.map((line) => (
            <Text key={line} style={styles.value}>
              • {line}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: 6 },
  heading: { fontSize: 20, fontWeight: "600", marginTop: 16 },
  label: { fontSize: 13, fontWeight: "600", color: "#555" },
  value: { fontSize: 16 },
  note: { fontSize: 14, color: "#555" },
});
