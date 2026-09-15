import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Svg, { Path, Rect } from "react-native-svg";
import { RECEIVE_COPY } from "../copy/receive.ts";
import { qrPath, textQr } from "../passes/qr.ts";
import { groupedAccount, receiveCode } from "../receive/receive-code.ts";
import type { Router } from "./router.ts";
import { Screen } from "./Screen.tsx";

const QUIET_ZONE = 4;

/** The holder's receive code (T-030-09; US-D1): their account, for someone sending them a ticket. */
export function Receive({
  account,
  router,
}: {
  readonly account: string;
  readonly router: Router;
}) {
  const matrix = useMemo(() => textQr(receiveCode(account)), [account]);
  const side = matrix.size + 2 * QUIET_ZONE;
  return (
    <Screen id="tickets.receive">
      <ScrollView contentContainerStyle={styles.page}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.navigate("tickets.receive", "tickets.list", {})}
          testID="receive-close"
        >
          <Text style={styles.link}>{RECEIVE_COPY.back}</Text>
        </Pressable>
        <Text style={styles.title}>{RECEIVE_COPY.title}</Text>
        <View style={styles.qrBox} testID="tickets.receive.qr">
          <Svg height="100%" viewBox={`0 0 ${side} ${side}`} width="100%">
            <Rect fill="#fff" height={side} width={side} x={0} y={0} />
            <Path d={qrPath(matrix, QUIET_ZONE)} fill="#000" />
          </Svg>
        </View>
        <Text style={styles.body}>{RECEIVE_COPY.instruction}</Text>
        <Text style={styles.label}>{RECEIVE_COPY.accountLabel}</Text>
        <Text selectable style={styles.account} testID="tickets.receive.account">
          {groupedAccount(account)}
        </Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { padding: 24, gap: 12 },
  link: { fontSize: 16, color: "#1f5fbf" },
  title: { fontSize: 26, fontWeight: "700" },
  qrBox: { width: "80%", aspectRatio: 1, alignSelf: "center", backgroundColor: "#fff" },
  body: { fontSize: 16, lineHeight: 22 },
  label: { fontSize: 13, fontWeight: "600", color: "#555" },
  account: { fontSize: 15, fontFamily: "Courier", lineHeight: 22 },
});
