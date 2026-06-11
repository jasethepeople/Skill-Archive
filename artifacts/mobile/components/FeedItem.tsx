import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Linking } from "react-native";
import { useColors } from "@/hooks/useColors";
import type { FeedItem as FeedItemType } from "@/context/FeedContext";

interface FeedItemProps {
  item: FeedItemType;
  accentColor?: string;
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr.slice(0, 16);
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  } catch {
    return "–";
  }
}

export function FeedItem({ item, accentColor }: FeedItemProps) {
  const colors = useColors();
  const accent = accentColor ?? colors.primary;

  const handlePress = () => {
    if (item.link) Linking.openURL(item.link).catch(() => {});
  };

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.7}>
      <View style={[styles.container, { borderBottomColor: colors.border }]}>
        <View style={[styles.accentBar, { backgroundColor: accent }]} />
        <View style={styles.content}>
          <View style={styles.topRow}>
            <Text style={[styles.source, { color: accent, fontFamily: "Inter_500Medium" }]} numberOfLines={1}>
              {item.sourceName}
            </Text>
            <Text style={[styles.time, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              {formatDate(item.pubDate)}
            </Text>
          </View>
          <Text style={[styles.title, { color: colors.foreground, fontFamily: "Inter_500Medium" }]} numberOfLines={2}>
            {item.title}
          </Text>
          {item.description ? (
            <Text style={[styles.desc, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]} numberOfLines={2}>
              {item.description}
            </Text>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  accentBar: { width: 3, marginVertical: 8, borderRadius: 2, marginLeft: 16 },
  content: { flex: 1, paddingHorizontal: 12, paddingVertical: 12, gap: 4 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  source: { fontSize: 11, letterSpacing: 0.5, textTransform: "uppercase" },
  time: { fontSize: 11 },
  title: { fontSize: 14, lineHeight: 20 },
  desc: { fontSize: 12, lineHeight: 17 },
});
