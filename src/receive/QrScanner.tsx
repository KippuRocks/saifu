import { CameraView, useCameraPermissions } from "expo-camera";
import { useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { RECEIVE_COPY } from "../copy/receive.ts";

export interface QrScannerProps<T> {
  /** What a scanned code means, or `null` for a code of another kind, which is ignored. */
  readonly parse: (text: string) => T | null;
  /** Called once, with the first code `parse` accepts. */
  readonly onValue: (value: T) => void;
  readonly instruction: string;
  readonly testID: string;
}

/** Scans QR codes with the back camera, accepting only the kind `parse` recognises. */
export function QrScanner<T>({ parse, onValue, instruction, testID }: QrScannerProps<T>) {
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
          const value = parse(data);
          if (value === null) return;
          done.current = true;
          onValue(value);
        }}
        style={styles.camera}
        testID={testID}
      />
      <Text style={styles.note}>{instruction}</Text>
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
