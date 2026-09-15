import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { RECEIVE_COPY } from "../copy/receive.ts";
import { readFrame } from "./frame.ts";

export interface QrScannerProps<T> {
  /** What a scanned code means, or `null` for a code of another kind, which is ignored. */
  readonly parse: (text: string) => T | null;
  /** Called once, with the first code `parse` accepts. */
  readonly onValue: (value: T) => void;
  readonly instruction: string;
  readonly testID: string;
}

/**
 * Saifu Web's QR scanner (T-030-18; features/030-saifu/plan.md §5.1a): the
 * camera through `getUserMedia`, the rear one where there is a choice, read
 * frame by frame in the page. No picture leaves the device.
 */
export function QrScanner<T>({ parse, onValue, instruction, testID }: QrScannerProps<T>) {
  const [attempt, setAttempt] = useState(0);
  const [denied, setDenied] = useState(false);
  const done = useRef(false);
  // The latest callbacks, so a parent's re-render does not restart the camera.
  const accept = useRef<(text: string) => boolean>(() => false);
  accept.current = (text: string) => {
    const value = parse(text);
    if (value === null || done.current) return false;
    done.current = true;
    onValue(value);
    return true;
  };

  if (denied) {
    return (
      <View style={styles.box}>
        <Text style={styles.note}>{RECEIVE_COPY.cameraNeeded}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setDenied(false);
            setAttempt((n) => n + 1);
          }}
          style={styles.button}
        >
          <Text style={styles.buttonText}>{RECEIVE_COPY.allowCamera}</Text>
        </Pressable>
      </View>
    );
  }
  return (
    <View style={styles.box}>
      <View style={styles.camera} testID={testID}>
        <CameraFeed
          key={attempt}
          onDenied={() => setDenied(true)}
          onText={(text) => accept.current(text)}
        />
      </View>
      <Text style={styles.note}>{instruction}</Text>
    </View>
  );
}

/** One request for the camera, scanning until `onText` accepts a code or the feed unmounts. */
function CameraFeed({
  onText,
  onDenied,
}: {
  readonly onText: (text: string) => boolean;
  readonly onDenied: () => void;
}) {
  const video = useRef<HTMLVideoElement | null>(null);
  const handlers = useRef({ onText, onDenied });
  handlers.current = { onText, onDenied };

  useEffect(() => {
    let stream: MediaStream | null = null;
    let frame = 0;
    let stopped = false;
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { willReadFrequently: true });

    const scan = () => {
      if (stopped) return;
      const element = video.current;
      if (context !== null && element !== null && element.readyState >= element.HAVE_CURRENT_DATA) {
        canvas.width = element.videoWidth;
        canvas.height = element.videoHeight;
        context.drawImage(element, 0, 0, canvas.width, canvas.height);
        const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
        const accepted = readFrame(data, canvas.width, canvas.height, (text) =>
          handlers.current.onText(text) ? text : null,
        );
        if (accepted !== null) return;
      }
      frame = requestAnimationFrame(scan);
    };

    if (navigator.mediaDevices === undefined) {
      handlers.current.onDenied();
      return;
    }
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false })
      .then((granted) => {
        stream = granted;
        if (stopped) {
          for (const track of granted.getTracks()) track.stop();
          return;
        }
        if (video.current !== null) {
          video.current.srcObject = granted;
          video.current.play().catch(() => {});
        }
        frame = requestAnimationFrame(scan);
      })
      .catch(() => {
        if (!stopped) handlers.current.onDenied();
      });

    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
      for (const track of stream?.getTracks() ?? []) track.stop();
    };
  }, []);

  return <video muted playsInline ref={video} style={videoStyle} />;
}

const videoStyle = { width: "100%", height: "100%", objectFit: "cover" } as const;

const styles = StyleSheet.create({
  box: { gap: 12 },
  camera: { width: "100%", aspectRatio: 1, backgroundColor: "#000", overflow: "hidden" },
  note: { fontSize: 15, color: "#555" },
  button: { backgroundColor: "#111", borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
