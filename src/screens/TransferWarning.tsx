import { Pressable, StyleSheet, Text, View } from "react-native";
import { TRANSFER_COPY } from "../copy/transfer.ts";
import { groupedAccount } from "../receive/receive-code.ts";
import { Screen } from "./Screen.tsx";

export interface TransferWarningProps {
  readonly receiver: string;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}

/**
 * REQ-FR-3's warning (T-030-08): full screen, before the passkey prompt, for an
 * account this Saifu has never sent a ticket to. No payment is involved, and the
 * transfer cannot be undone.
 */
export function TransferWarning({ receiver, onConfirm, onCancel }: TransferWarningProps) {
  return (
    <Screen id="ticket.transfer.warning">
      <View style={styles.page}>
        <Text style={styles.title}>{TRANSFER_COPY.warningTitle}</Text>
        <Text style={styles.body} testID="ticket.transfer.warning.body">
          {TRANSFER_COPY.warningBody}
        </Text>
        <Text style={styles.account}>{groupedAccount(receiver)}</Text>
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            onPress={onCancel}
            style={styles.button}
            testID="ticket.transfer.warning.cancel"
          >
            <Text style={styles.buttonText}>{TRANSFER_COPY.warningCancel}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={onConfirm}
            style={styles.danger}
            testID="ticket.transfer.warning.confirm"
          >
            <Text style={styles.dangerText}>{TRANSFER_COPY.warningConfirm}</Text>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, padding: 24, gap: 20, justifyContent: "center", backgroundColor: "#fff8e6" },
  title: { fontSize: 28, fontWeight: "700" },
  body: { fontSize: 18, lineHeight: 26 },
  account: { fontSize: 15, fontFamily: "Courier" },
  actions: { gap: 12, marginTop: 12 },
  button: { backgroundColor: "#111", borderRadius: 12, paddingVertical: 16, alignItems: "center" },
  buttonText: { color: "#fff", fontSize: 17, fontWeight: "600" },
  danger: {
    borderWidth: 1,
    borderColor: "#8a1c1c",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  dangerText: { color: "#8a1c1c", fontSize: 17, fontWeight: "600" },
});
