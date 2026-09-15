import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { INVITATION_COPY, SESSION_ENDED } from "../copy/links.ts";
import type { InvitationOutcome } from "../handoff/invitation.ts";
import type { Router } from "./router.ts";
import { Screen } from "./Screen.tsx";

export interface InvitationRedeemProps {
  readonly token: string;
  readonly router: Router;
  readonly redeem: (token: string) => Promise<InvitationOutcome>;
  /** Refreshes the holder's tickets, so the redeemed one can be shown. */
  readonly reloadHoldings: () => Promise<void>;
  readonly onSessionEnded: () => void;
}

/**
 * An organiser's invitation (T-030-10; US-B2): redeems it in the holder's
 * session, and shows the ticket once Kippu's copy has it.
 */
export function InvitationRedeem({
  token,
  router,
  redeem,
  reloadHoldings,
  onSessionEnded,
}: InvitationRedeemProps) {
  const [outcome, setOutcome] = useState<InvitationOutcome | null>(null);
  const { navigate } = router;

  useEffect(() => {
    let current = true;
    setOutcome(null);
    (async () => {
      const result = await redeem(token).catch(
        (): InvitationOutcome => ({ ok: false, failure: "unavailable", errorCode: null }),
      );
      if (!current) return;
      if (result.ok && result.visible) {
        await reloadHoldings().catch(() => {});
        if (current) navigate("invitation.redeem", "ticket.detail", { ticket: result.ticket });
        return;
      }
      setOutcome(result);
    })();
    return () => {
      current = false;
    };
  }, [token, redeem, reloadHoldings, navigate]);

  const message =
    outcome === null
      ? INVITATION_COPY.redeeming
      : outcome.ok
        ? INVITATION_COPY.waiting
        : outcome.failure === "session"
          ? SESSION_ENDED
          : INVITATION_COPY[outcome.failure];

  return (
    <Screen busy={outcome === null} id="invitation.redeem">
      <ScrollView contentContainerStyle={styles.page}>
        <Text style={styles.title}>{INVITATION_COPY.title}</Text>
        <Text
          style={outcome !== null && !outcome.ok ? styles.notice : styles.body}
          testID={outcome !== null && !outcome.ok ? "invitation.redeem.failed" : undefined}
        >
          {message}
        </Text>
        {outcome !== null && !outcome.ok && outcome.failure === "session" ? (
          <Pressable accessibilityRole="button" onPress={onSessionEnded} style={styles.button}>
            <Text style={styles.buttonText}>Set up again</Text>
          </Pressable>
        ) : null}
        {outcome !== null && !(!outcome.ok && outcome.failure === "session") ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => navigate("invitation.redeem", "tickets.list", {})}
            testID="invitation.redeem.done"
          >
            <Text style={styles.link}>{INVITATION_COPY.done}</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { padding: 24, gap: 16 },
  title: { fontSize: 26, fontWeight: "600" },
  body: { fontSize: 16, lineHeight: 22 },
  notice: { fontSize: 16, color: "#8a1c1c" },
  link: { fontSize: 16, color: "#1f5fbf" },
  button: { backgroundColor: "#111", borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
