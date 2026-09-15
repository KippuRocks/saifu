import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { DEVICES_COPY } from "../copy/devices";
import type { DeviceRow } from "../devices/list.ts";
import { formatDate } from "../holdings/detail.ts";
import { Disclosure } from "./Disclosure.tsx";
import type { Router } from "./router.ts";
import { Screen } from "./Screen.tsx";

export interface SettingsProps {
  readonly account: string;
  readonly router: Router;
  /** Every credential registered to the account (T-025-13); `null` when it cannot be read. */
  readonly loadDevices: () => Promise<readonly DeviceRow[] | null>;
}

/**
 * Settings (T-030-04): the recovery disclosure again, the holder's account, and
 * every device registered to it, with the way to add one (T-030-13).
 */
export function Settings({ account, router, loadDevices }: SettingsProps) {
  const [devices, setDevices] = useState<readonly DeviceRow[] | null | undefined>(undefined);
  useEffect(() => {
    let current = true;
    loadDevices()
      .then((rows) => current && setDevices(rows))
      .catch(() => current && setDevices(null));
    return () => {
      current = false;
    };
  }, [loadDevices]);
  return (
    <Screen busy={devices === undefined} id="settings.main">
      <ScrollView contentContainerStyle={styles.page}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.navigate("settings.main", "tickets.list", {})}
          testID="settings-close"
        >
          <Text style={styles.link}>Back</Text>
        </Pressable>
        <Text style={styles.heading}>Settings</Text>
        <Disclosure />
        <Text style={styles.label}>{DEVICES_COPY.listTitle}</Text>
        <Text style={styles.note}>{DEVICES_COPY.listIntro}</Text>
        {devices === null ? <Text style={styles.note}>{DEVICES_COPY.listUnavailable}</Text> : null}
        {(devices ?? []).map((device) => (
          <Text
            key={device.credential}
            style={styles.device}
            testID={`settings-device-${device.credential}`}
          >
            {device.thisDevice ? DEVICES_COPY.thisDevice : DEVICES_COPY.otherDevice} · added{" "}
            {formatDate(device.registeredAt)} · {device.credential.slice(0, 8)}…
          </Text>
        ))}
        <Text style={styles.note}>{DEVICES_COPY.cannotRemove}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.navigate("settings.main", "device.add", {})}
          style={styles.button}
          testID="settings-add-device"
        >
          <Text style={styles.buttonText}>{DEVICES_COPY.add}</Text>
        </Pressable>
        <Text style={styles.label}>Your account</Text>
        <Text selectable style={styles.account}>
          {account}
        </Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { padding: 24, gap: 16 },
  link: { fontSize: 16, color: "#1f5fbf" },
  heading: { fontSize: 28, fontWeight: "600" },
  label: { fontSize: 14, fontWeight: "600", marginTop: 8 },
  account: { fontSize: 13, fontFamily: "Courier" },
  note: { fontSize: 14, color: "#555" },
  device: { fontSize: 15 },
  button: { backgroundColor: "#111", borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
