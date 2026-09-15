import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Path, Rect } from "react-native-svg";
import { qrPath, textQr } from "../passes/qr.ts";

const QUIET_ZONE = 4;

/** A text QR code, drawn at the width it is given, with its quiet zone. */
export function QrCode({ text, testID }: { readonly text: string; readonly testID: string }) {
  const matrix = useMemo(() => textQr(text), [text]);
  const side = matrix.size + 2 * QUIET_ZONE;
  return (
    <View style={styles.box} testID={testID}>
      <Svg height="100%" viewBox={`0 0 ${side} ${side}`} width="100%">
        <Rect fill="#fff" height={side} width={side} x={0} y={0} />
        <Path d={qrPath(matrix, QUIET_ZONE)} fill="#000" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { width: "85%", aspectRatio: 1, alignSelf: "center", backgroundColor: "#fff" },
});
