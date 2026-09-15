import { Pressable, StyleSheet, Text, View } from "react-native";
import { TRANSFER_COPY } from "../copy/transfer.ts";
import type { TransferStep } from "../transfer/transfer.ts";
import { Screen } from "./Screen.tsx";

export interface TransferSendingProps {
  readonly step: TransferStep | null;
  readonly onFinish: () => void;
  readonly onFailed: () => void;
}

/** The transfer being signed, recorded, and reflected in Kippu's copy (T-030-08). */
export function TransferSending({ step, onFinish, onFailed }: TransferSendingProps) {
  const settled = step?.kind === "done" || step?.kind === "failed";
  const message =
    step === null || step.kind === "signing" || step.kind === "warning"
      ? TRANSFER_COPY.signing
      : step.kind === "recorded"
        ? TRANSFER_COPY.recorded
        : step.kind === "done"
          ? step.copyCaughtUp
            ? TRANSFER_COPY.done
            : TRANSFER_COPY.doneLagging
          : ((TRANSFER_COPY.failures as Record<string, string>)[step.code] ??
            TRANSFER_COPY.failedOther);
  return (
    <Screen busy={!settled} id="ticket.transfer.sending">
      <View style={styles.page}>
        <Text
          style={step?.kind === "failed" ? styles.problem : styles.body}
          testID="ticket.transfer.sending.message"
        >
          {message}
        </Text>
        {step?.kind === "done" ? (
          <Pressable
            accessibilityRole="button"
            onPress={onFinish}
            style={styles.button}
            testID="ticket.transfer.sending.finish"
          >
            <Text style={styles.buttonText}>{TRANSFER_COPY.finish}</Text>
          </Pressable>
        ) : null}
        {step?.kind === "failed" ? (
          <Pressable
            accessibilityRole="button"
            onPress={onFailed}
            style={styles.button}
            testID="ticket.transfer.sending.back"
          >
            <Text style={styles.buttonText}>{TRANSFER_COPY.back}</Text>
          </Pressable>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, padding: 24, gap: 20, justifyContent: "center" },
  body: { fontSize: 18, lineHeight: 26 },
  problem: { fontSize: 18, lineHeight: 26, color: "#8a1c1c" },
  button: { backgroundColor: "#111", borderRadius: 12, paddingVertical: 16, alignItems: "center" },
  buttonText: { color: "#fff", fontSize: 17, fontWeight: "600" },
});
