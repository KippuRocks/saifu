import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { CHECKOUT_COPY, SESSION_ENDED } from "../copy/links.ts";
import type { HandoffOutcome } from "../handoff/checkout.ts";
import type { Router } from "./router.ts";
import { Screen } from "./Screen.tsx";

export interface CheckoutLinkProps {
  readonly handoffToken: string;
  readonly router: Router;
  readonly link: (handoffToken: string) => Promise<HandoffOutcome>;
  /** The holder's Kippu session has ended: set up again, then return here. */
  readonly onSessionEnded: () => void;
}

/**
 * Ichiba's checkout handoff (T-030-10; AD-19 A): links the holder's account and
 * shows the pairing code to compare with the checkout page, where the buyer
 * confirms. Saifu confirms nothing.
 */
export function CheckoutLink({ handoffToken, router, link, onSessionEnded }: CheckoutLinkProps) {
  const [outcome, setOutcome] = useState<HandoffOutcome | null>(null);

  useEffect(() => {
    let current = true;
    setOutcome(null);
    link(handoffToken)
      .then((result) => {
        if (current) setOutcome(result);
      })
      .catch(() => {
        if (current) setOutcome({ ok: false, failure: "unavailable" });
      });
    return () => {
      current = false;
    };
  }, [handoffToken, link]);

  const failure = outcome !== null && !outcome.ok ? outcome.failure : null;
  const message =
    failure === "unknown"
      ? CHECKOUT_COPY.unknown
      : failure === "another-account"
        ? CHECKOUT_COPY.anotherAccount
        : failure === "session"
          ? SESSION_ENDED
          : failure === "unavailable"
            ? CHECKOUT_COPY.unavailable
            : null;

  return (
    <Screen busy={outcome === null} id="checkout.link">
      <ScrollView contentContainerStyle={styles.page}>
        <Text style={styles.title}>{CHECKOUT_COPY.title}</Text>
        {outcome === null ? <Text style={styles.body}>{CHECKOUT_COPY.linking}</Text> : null}
        {outcome?.ok ? (
          <View style={styles.summary}>
            <Text style={styles.label}>{CHECKOUT_COPY.codeLabel}</Text>
            <Text
              accessibilityLabel={outcome.summary.pairingCode.split("").join(" ")}
              style={styles.code}
              testID="checkout.link.pairing-code"
            >
              {outcome.summary.pairingCode}
            </Text>
            <Text style={styles.body}>{CHECKOUT_COPY.instruction}</Text>
            {outcome.summary.event === null ? null : (
              <Text style={styles.body}>{outcome.summary.event}</Text>
            )}
            {outcome.summary.ticketClass === null ? null : (
              <Text style={styles.body}>{outcome.summary.ticketClass}</Text>
            )}
            <Text style={styles.body}>{outcome.summary.place}</Text>
          </View>
        ) : null}
        {message === null ? null : (
          <Text style={styles.notice} testID="checkout.link.failed">
            {message}
          </Text>
        )}
        {failure === "session" ? (
          <Pressable accessibilityRole="button" onPress={onSessionEnded} style={styles.button}>
            <Text style={styles.buttonText}>Set up again</Text>
          </Pressable>
        ) : null}
        {outcome !== null && failure !== "session" ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.navigate("checkout.link", "tickets.list", {})}
            testID="checkout.link.done"
          >
            <Text style={styles.link}>{CHECKOUT_COPY.done}</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { padding: 24, gap: 16 },
  title: { fontSize: 26, fontWeight: "600" },
  summary: { gap: 8 },
  label: { fontSize: 14, fontWeight: "600", color: "#555" },
  code: { fontSize: 48, fontWeight: "700", letterSpacing: 8, fontVariant: ["tabular-nums"] },
  body: { fontSize: 16, lineHeight: 22 },
  notice: { fontSize: 16, color: "#8a1c1c" },
  link: { fontSize: 16, color: "#1f5fbf" },
  button: { backgroundColor: "#111", borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
