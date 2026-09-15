import type { Registration } from "@ticketto/sdk";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { DEVICES_COPY } from "../copy/devices.ts";
import { addDeviceCode } from "../devices/codes.ts";
import { QrCode } from "../receive/QrCode.tsx";
import { QrScanner } from "../receive/QrScanner";
import type { Router } from "./router.ts";
import { Screen } from "./Screen.tsx";

export interface DeviceAddProps {
  readonly userHandle: string;
  readonly router: Router;
  /** Reads a scanned code as a registration for this account, or `null`. */
  readonly parse: (text: string) => Registration | null;
  readonly onRegistration: (registration: Registration) => void;
}

/**
 * Adding a device, on the existing phone (T-030-13): its add-device code for the
 * new phone to scan, then the new phone's registration code to scan back.
 */
export function DeviceAdd({ userHandle, router, parse, onRegistration }: DeviceAddProps) {
  const [scanning, setScanning] = useState(false);
  return (
    <Screen id="device.add">
      <ScrollView contentContainerStyle={styles.page}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.navigate("device.add", "settings.main", {})}
          testID="device-add-close"
        >
          <Text style={styles.link}>{DEVICES_COPY.back}</Text>
        </Pressable>
        <Text style={styles.title}>{DEVICES_COPY.addTitle}</Text>
        <Text style={styles.body}>{DEVICES_COPY.addStepOne}</Text>
        <QrCode testID="device.add.qr" text={addDeviceCode(userHandle)} />
        <Text style={styles.body}>{DEVICES_COPY.addStepTwo}</Text>
        {scanning ? (
          <QrScanner
            instruction={DEVICES_COPY.scanNewInstruction}
            onValue={onRegistration}
            parse={parse}
            testID="device-add-scanner"
          />
        ) : (
          <Pressable
            accessibilityRole="button"
            onPress={() => setScanning(true)}
            style={styles.button}
            testID="device-add-scan"
          >
            <Text style={styles.buttonText}>{DEVICES_COPY.scanNew}</Text>
          </Pressable>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { padding: 24, gap: 14 },
  link: { fontSize: 16, color: "#1f5fbf" },
  title: { fontSize: 26, fontWeight: "700" },
  body: { fontSize: 16, lineHeight: 22 },
  button: { backgroundColor: "#111", borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
