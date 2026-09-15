import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { DEVICES_COPY } from "../copy/devices";
import { deviceRegistrationCode, userHandleFromAddDeviceCode } from "../devices/codes.ts";
import { QrCode } from "../receive/QrCode.tsx";
import { QrScanner } from "../receive/QrScanner";
import type { Router } from "./router.ts";
import { Screen } from "./Screen.tsx";

export interface JoiningDevice {
  readonly registration: Uint8Array;
  readonly shortCode: string;
}

export interface DeviceJoinProps {
  readonly router: Router;
  /** The registration of a join already under way on this phone, if any. */
  readonly resume: () => Promise<JoiningDevice | null>;
  /** Creates this phone's passkey for the account whose passkeys carry `userHandle`. */
  readonly join: (userHandle: string) => Promise<JoiningDevice>;
  /** Waits for the other phone to register this one; `true` once it has. */
  readonly waitForRegistration: (cancelled: () => boolean) => Promise<boolean>;
  /** This phone's credential is on the ledger: finish setting up. */
  readonly onJoined: () => void;
}

type Stage =
  | { readonly kind: "loading" }
  | { readonly kind: "scan" }
  | { readonly kind: "creating" }
  | { readonly kind: "showing"; readonly joining: JoiningDevice; readonly timedOut: boolean }
  | { readonly kind: "failed" };

/**
 * Joining an existing account, on the new phone (T-030-13): scan the other
 * phone's add-device code, create this phone's passkey for that account, show
 * its registration and short code, and wait for the other phone to register it.
 * This phone never registers itself.
 */
export function DeviceJoin({
  router,
  resume,
  join,
  waitForRegistration,
  onJoined,
}: DeviceJoinProps) {
  const [stage, setStage] = useState<Stage>({ kind: "loading" });
  const [waits, setWaits] = useState(0);

  useEffect(() => {
    let current = true;
    resume()
      .then((joining) => {
        if (current)
          setStage(
            joining === null ? { kind: "scan" } : { kind: "showing", joining, timedOut: false },
          );
      })
      .catch(() => current && setStage({ kind: "scan" }));
    return () => {
      current = false;
    };
  }, [resume]);

  const showing = stage.kind === "showing" && !stage.timedOut ? stage.joining : null;
  useEffect(() => {
    // `waits` restarts the wait when the holder asks to keep waiting.
    if (showing === null || waits < 0) return;
    let cancelled = false;
    waitForRegistration(() => cancelled)
      .then((registered) => {
        if (cancelled) return;
        if (registered) onJoined();
        else setStage({ kind: "showing", joining: showing, timedOut: true });
      })
      .catch(() => !cancelled && setStage({ kind: "showing", joining: showing, timedOut: true }));
    return () => {
      cancelled = true;
    };
  }, [showing, waits, waitForRegistration, onJoined]);

  return (
    <Screen busy={stage.kind === "loading" || stage.kind === "creating"} id="device.join">
      <ScrollView contentContainerStyle={styles.page}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.navigate("device.join", "holder.onboarding", {})}
          testID="device-join-close"
        >
          <Text style={styles.link}>{DEVICES_COPY.back}</Text>
        </Pressable>
        <Text style={styles.title}>{DEVICES_COPY.joinTitle}</Text>
        {stage.kind === "scan" ? (
          <>
            <Text style={styles.body}>{DEVICES_COPY.joinScan}</Text>
            <QrScanner
              instruction={DEVICES_COPY.joinScanInstruction}
              onValue={(userHandle) => {
                setStage({ kind: "creating" });
                join(userHandle)
                  .then((joining) => setStage({ kind: "showing", joining, timedOut: false }))
                  .catch(() => setStage({ kind: "failed" }));
              }}
              parse={userHandleFromAddDeviceCode}
              testID="device-join-scanner"
            />
          </>
        ) : null}
        {stage.kind === "showing" ? (
          <>
            <Text style={styles.body}>{DEVICES_COPY.joinShow}</Text>
            <QrCode
              testID="device.join.qr"
              text={deviceRegistrationCode(stage.joining.registration)}
            />
            <Text style={styles.code} testID="device.join.code">
              {stage.joining.shortCode}
            </Text>
            <Text style={styles.note}>
              {stage.timedOut ? DEVICES_COPY.joinTimedOut : DEVICES_COPY.joinWaiting}
            </Text>
            {stage.timedOut ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setStage({ kind: "showing", joining: stage.joining, timedOut: false });
                  setWaits((n) => n + 1);
                }}
                style={styles.button}
                testID="device-join-retry"
              >
                <Text style={styles.buttonText}>{DEVICES_COPY.joinRetry}</Text>
              </Pressable>
            ) : null}
          </>
        ) : null}
        {stage.kind === "failed" ? (
          <Text style={styles.problem}>{DEVICES_COPY.joinFailed}</Text>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { padding: 24, gap: 14 },
  link: { fontSize: 16, color: "#1f5fbf" },
  title: { fontSize: 26, fontWeight: "700" },
  body: { fontSize: 16, lineHeight: 22 },
  note: { fontSize: 15, color: "#555" },
  problem: { fontSize: 16, color: "#8a1c1c" },
  code: {
    fontSize: 40,
    fontWeight: "700",
    letterSpacing: 8,
    textAlign: "center",
    fontVariant: ["tabular-nums"],
  },
  button: { backgroundColor: "#111", borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
