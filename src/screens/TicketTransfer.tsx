import type { AccountId } from "@ticketto/sdk";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput } from "react-native";
import { TRANSFER_COPY } from "../copy/transfer.ts";
import { AccountScanner } from "../receive/AccountScanner";
import type { ReceiverCheck } from "../transfer/receiver.ts";
import type { Router } from "./router.ts";
import { Screen } from "./Screen.tsx";

export interface TicketTransferProps {
  readonly ticket: string;
  readonly title: string;
  readonly router: Router;
  readonly check: (input: string) => Promise<ReceiverCheck>;
  /** The receiver is chosen: the app begins the transfer. */
  readonly onReceiver: (account: AccountId) => void;
}

/**
 * Choosing who receives a ticket (T-030-08; US-D1): scan their receive code
 * (T-030-09), or type their account. Nothing is signed here.
 */
export function TicketTransfer({ ticket, title, router, check, onReceiver }: TicketTransferProps) {
  const [input, setInput] = useState("");
  const [scanning, setScanning] = useState(false);
  const [checking, setChecking] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const submit = async (value: string) => {
    setChecking(true);
    setProblem(null);
    const result = await check(value).catch(
      (): ReceiverCheck => ({ ok: false, problem: "malformed" }),
    );
    setChecking(false);
    if (result.ok) onReceiver(result.account);
    else setProblem(TRANSFER_COPY.receiverProblems[result.problem]);
  };

  return (
    <Screen busy={checking} id="ticket.transfer">
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        <Pressable
          accessibilityRole="button"
          onPress={() => router.navigate("ticket.transfer", "ticket.detail", { ticket })}
          testID="ticket-transfer-close"
        >
          <Text style={styles.link}>{TRANSFER_COPY.back}</Text>
        </Pressable>
        <Text style={styles.title}>{TRANSFER_COPY.title}</Text>
        <Text style={styles.body}>{title}</Text>
        <Text style={styles.label}>{TRANSFER_COPY.receiverLabel}</Text>
        <Text style={styles.note}>{TRANSFER_COPY.receiverHint}</Text>
        {scanning ? (
          <AccountScanner
            onAccount={(account) => {
              setScanning(false);
              setInput(account);
              submit(account).catch(() => {});
            }}
          />
        ) : (
          <Pressable
            accessibilityRole="button"
            onPress={() => setScanning(true)}
            style={styles.secondary}
            testID="ticket-transfer-scan"
          >
            <Text style={styles.secondaryText}>{TRANSFER_COPY.scan}</Text>
          </Pressable>
        )}
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          multiline
          onChangeText={setInput}
          style={styles.input}
          testID="ticket-transfer-receiver"
          value={input}
        />
        {problem === null ? null : (
          <Text style={styles.problem} testID="ticket-transfer-problem">
            {problem}
          </Text>
        )}
        <Pressable
          accessibilityRole="button"
          disabled={checking || input.trim() === ""}
          onPress={() => {
            submit(input).catch(() => {});
          }}
          style={[styles.button, (checking || input.trim() === "") && styles.dim]}
          testID="ticket-transfer-continue"
        >
          <Text style={styles.buttonText}>{TRANSFER_COPY.continue}</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { padding: 24, gap: 12 },
  link: { fontSize: 16, color: "#1f5fbf" },
  title: { fontSize: 26, fontWeight: "700" },
  body: { fontSize: 16 },
  label: { fontSize: 13, fontWeight: "600", color: "#555", marginTop: 8 },
  note: { fontSize: 14, color: "#555" },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    fontFamily: "Courier",
    minHeight: 64,
  },
  problem: { fontSize: 15, color: "#8a1c1c" },
  button: { backgroundColor: "#111", borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  dim: { opacity: 0.5 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  secondary: {
    borderWidth: 1,
    borderColor: "#111",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryText: { color: "#111", fontSize: 16, fontWeight: "600" },
});
