import type { ReactNode } from "react";
import { Platform, StyleSheet, View } from "react-native";
import type { ScreenId } from "./registry.ts";

export interface ScreenProps {
  readonly id: ScreenId;
  /** Waiting on something — a load, a passkey ceremony — so not yet settled. */
  readonly busy?: boolean;
  readonly children: ReactNode;
}

/**
 * A screen's root (T-030-15; `F-070` plan §5.4). It carries the `screenId` as
 * its `testID`, so a test can tell which screen it is on without reading copy,
 * and marks the screen settled — nothing loading, no ceremony in progress, and
 * no animation, since Saifu's screens run none — with a `<screenId>.settled`
 * element, so kippu-e2e captures each journey step once it has settled.
 *
 * On Saifu Web the root also carries the `screenId` as `data-screen`, as the
 * web clients do, beside `data-testid` (T-030-18; `F-070` plan §5.4).
 */
export function Screen({ id, busy = false, children }: ScreenProps) {
  return (
    <View
      accessibilityState={{ busy }}
      collapsable={false}
      style={styles.screen}
      testID={id}
      {...webScreenId(id)}
    >
      {children}
      {busy ? null : <View collapsable={false} style={styles.marker} testID={`${id}.settled`} />}
    </View>
  );
}

/** react-native-web renders `dataSet` as `data-*` attributes; native ignores it. */
function webScreenId(id: ScreenId): object {
  return Platform.OS === "web" ? { dataSet: { screen: id } } : {};
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  marker: { position: "absolute", left: 0, bottom: 0, width: 1, height: 1 },
});
