import { useEffect, useMemo, useState } from "react";
import { AppState, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Svg, { Path, Rect } from "react-native-svg";
import { PASS_COPY } from "../copy/passes.ts";
import type { AssuranceLevel as Level } from "../holdings/assurance.ts";
import { type PassState, passCycle } from "../passes/cycle.ts";
import type { ProducedPass } from "../passes/produce.ts";
import { passQr, qrPath } from "../passes/qr.ts";
import { AssuranceLevel } from "./AssuranceLevel.tsx";
import type { Router } from "./router.ts";
import { Screen } from "./Screen.tsx";

export interface TicketPassProps {
  readonly ticket: string;
  readonly title: string;
  readonly assurance: Level | null;
  /** Produces a signed pass for the ticket: one passkey assertion, no network. */
  readonly produce: (ticket: string) => Promise<ProducedPass>;
  readonly router: Router;
}

const QUIET_ZONE = 4;

/**
 * A ticket's access pass (T-030-07; US-E1, NFR-3, NFR-5): a QR code produced on
 * the device and replaced before its window closes while the screen is open and
 * the app in the foreground. Each code is a new pass, authorised by the holder
 * with the passkey prompt.
 */
export function TicketPass({ ticket, title, assurance, produce, router }: TicketPassProps) {
  const [state, setState] = useState<PassState>({ kind: "signing", previous: null });
  const [now, setNow] = useState(Date.now());

  const cycle = useMemo(
    () => passCycle({ produce: () => produce(ticket), onState: setState }),
    [produce, ticket],
  );

  useEffect(() => {
    cycle.start();
    const subscription = AppState.addEventListener("change", (status) => {
      if (status === "active") cycle.start();
      else cycle.stop();
    });
    return () => {
      subscription.remove();
      cycle.stop();
    };
  }, [cycle]);

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);

  const shown = state.kind === "showing" ? state.pass : state.previous;
  const live = shown !== null && now <= shown.signed.pass.notAfter;
  const matrix = useMemo(() => (shown === null ? null : passQr(shown.bytes)), [shown]);
  const side = matrix === null ? 0 : matrix.size + 2 * QUIET_ZONE;
  const secondsLeft =
    shown === null ? 0 : Math.max(0, Math.ceil((shown.signed.pass.notAfter - now) / 1000));

  return (
    <Screen busy={state.kind === "signing"} id="ticket.pass">
      <ScrollView contentContainerStyle={styles.page}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.navigate("ticket.pass", "ticket.detail", { ticket })}
          testID="ticket-pass-close"
        >
          <Text style={styles.link}>{PASS_COPY.back}</Text>
        </Pressable>
        <Text style={styles.title}>{title}</Text>
        {matrix !== null && live ? (
          <View style={styles.qrBox} testID="ticket.pass.qr">
            <Svg height="100%" viewBox={`0 0 ${side} ${side}`} width="100%">
              <Rect fill="#fff" height={side} width={side} x={0} y={0} />
              <Path d={qrPath(matrix, QUIET_ZONE)} fill="#000" />
            </Svg>
          </View>
        ) : (
          <View style={[styles.qrBox, styles.qrEmpty]}>
            <Text style={styles.note}>
              {state.kind === "signing" ? PASS_COPY.signing : PASS_COPY.expired}
            </Text>
          </View>
        )}
        {live ? <Text style={styles.countdown}>{PASS_COPY.validFor(secondsLeft)}</Text> : null}
        <Text style={styles.body}>{PASS_COPY.instruction}</Text>
        <Text style={styles.note}>{PASS_COPY.exposure}</Text>
        {state.kind === "stopped" ? (
          <>
            <Text style={styles.note} testID="ticket.pass.stopped">
              {state.failed ? PASS_COPY.failed : PASS_COPY.stopped}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => cycle.start()}
              style={styles.button}
              testID="ticket.pass.show-new"
            >
              <Text style={styles.buttonText}>{PASS_COPY.showNew}</Text>
            </Pressable>
          </>
        ) : null}
        <AssuranceLevel assurance={assurance} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { padding: 24, gap: 12 },
  link: { fontSize: 16, color: "#1f5fbf" },
  title: { fontSize: 26, fontWeight: "700" },
  qrBox: { width: "100%", aspectRatio: 1, backgroundColor: "#fff" },
  qrEmpty: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 24,
  },
  countdown: { fontSize: 18, fontWeight: "600", fontVariant: ["tabular-nums"] },
  body: { fontSize: 16, lineHeight: 22 },
  note: { fontSize: 14, color: "#555", textAlign: "left" },
  button: { backgroundColor: "#111", borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
