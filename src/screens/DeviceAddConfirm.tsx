import { Pressable, StyleSheet, Text, View } from "react-native";
import { DEVICES_COPY } from "../copy/devices.ts";
import type { AddDeviceStep } from "../devices/add.ts";
import { Screen } from "./Screen.tsx";

export interface DeviceAddConfirmProps {
  readonly step: AddDeviceStep | null;
  readonly onConfirm: () => void;
  readonly onClose: () => void;
}

/**
 * The confirmation before a device is added (T-030-13), full screen and before
 * the passkey prompt: the new phone gets full control of every ticket, and it
 * cannot be undone. The short code must match the new phone's.
 */
export function DeviceAddConfirm({ step, onConfirm, onClose }: DeviceAddConfirmProps) {
  const busy = step === null || step.kind === "signing";
  const failure =
    step?.kind === "failed"
      ? ((DEVICES_COPY.failures as Record<string, string>)[step.code] ?? DEVICES_COPY.failedOther)
      : null;
  return (
    <Screen busy={busy} id="device.add.confirm">
      <View style={styles.page}>
        {step?.kind === "confirm" ? (
          <>
            <Text style={styles.title}>{DEVICES_COPY.confirmTitle}</Text>
            <Text style={styles.body}>{DEVICES_COPY.confirmBody}</Text>
            <Text style={styles.label}>{DEVICES_COPY.confirmCode}</Text>
            <Text
              accessibilityLabel={step.shortCode.split("").join(" ")}
              style={styles.code}
              testID="device.add.confirm.code"
            >
              {step.shortCode}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={onClose}
              style={styles.button}
              testID="device.add.confirm.no"
            >
              <Text style={styles.buttonText}>{DEVICES_COPY.confirmNo}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={onConfirm}
              style={styles.danger}
              testID="device.add.confirm.yes"
            >
              <Text style={styles.dangerText}>{DEVICES_COPY.confirmYes}</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={failure === null ? styles.body : styles.problem}>
              {step?.kind === "done" ? DEVICES_COPY.added : (failure ?? DEVICES_COPY.signing)}
            </Text>
            {step?.kind === "done" || step?.kind === "failed" ? (
              <Pressable
                accessibilityRole="button"
                onPress={onClose}
                style={styles.button}
                testID="device.add.confirm.done"
              >
                <Text style={styles.buttonText}>{DEVICES_COPY.done}</Text>
              </Pressable>
            ) : null}
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, padding: 24, gap: 18, justifyContent: "center", backgroundColor: "#fff8e6" },
  title: { fontSize: 26, fontWeight: "700" },
  body: { fontSize: 18, lineHeight: 26 },
  problem: { fontSize: 18, lineHeight: 26, color: "#8a1c1c" },
  label: { fontSize: 14, fontWeight: "600", color: "#555" },
  code: { fontSize: 44, fontWeight: "700", letterSpacing: 8, fontVariant: ["tabular-nums"] },
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
