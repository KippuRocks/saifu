import type { AccountId } from "@ticketto/sdk";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { RECEIVE_COPY } from "../copy/receive.ts";
import { accountFromReceiveCode } from "./receive-code.ts";

export interface AccountScannerProps {
  /** Called once, with the account of the first receive code scanned. */
  readonly onAccount: (account: AccountId) => void;
}

/**
 * Scans another holder's receive code (T-030-09) and fills the receiver with
 * its account. Codes that are not receive codes — a pass, a ticket id — are
 * ignored. Used where a ticket's receiver is chosen (T-030-08).
 */
export function AccountScanner({ onAccount }: AccountScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const done = useRef(false);

  if (permission === null) return null;
  if (!permission.granted) {
    return (
      <View style={styles.box}>
        <Text style={styles.note}>{RECEIVE_COPY.cameraNeeded}</Text>
        {permission.canAskAgain ? (
          <Pressable accessibilityRole="button" onPress={requestPermission} style={styles.button}>
            <Text style={styles.buttonText}>{RECEIVE_COPY.allowCamera}</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }
  return (
    <View style={styles.box}>
      <CameraView
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        facing="back"
        onBarcodeScanned={({ data }) => {
          if (done.current) return;
          const account = accountFromReceiveCode(data);
          if (account === null) return;
          done.current = true;
          onAccount(account);
        }}
        style={styles.camera}
        testID="account-scanner"
      />
      <Text style={styles.note}>{RECEIVE_COPY.scanInstruction}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: 12 },
  camera: { width: "100%", aspectRatio: 1 },
  note: { fontSize: 15, color: "#555" },
  button: { backgroundColor: "#111", borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
