import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { GlassCard } from "./GlassCard";
import type { Node, NodeOS, NodeStatus, NodeProtocol } from "@/context/AppContext";

interface NodeCardProps {
  node: Node;
  onPress?: () => void;
  onLongPress?: () => void;
}

function getOSIcon(os: NodeOS): { lib: "feather" | "mci"; name: string } {
  switch (os) {
    case "linux": return { lib: "mci", name: "linux" };
    case "windows": return { lib: "mci", name: "microsoft-windows" };
    case "macos": return { lib: "mci", name: "apple" };
    case "ios": return { lib: "mci", name: "apple-ios" };
    case "android": return { lib: "mci", name: "android" };
  }
}

function getStatusColor(status: NodeStatus, colors: ReturnType<typeof useColors>): string {
  switch (status) {
    case "connected": return colors.success;
    case "connecting": return colors.warning;
    case "offline": return colors.mutedForeground;
  }
}

function getProtocolColor(protocol: NodeProtocol, colors: ReturnType<typeof useColors>): string {
  switch (protocol) {
    case "WebRTC": return colors.primary;
    case "WireGuard": return colors.purple;
    case "SSH": return colors.warning;
  }
}

function formatLastSeen(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function NodeCard({ node, onPress, onLongPress }: NodeCardProps) {
  const colors = useColors();
  const osIcon = getOSIcon(node.os);
  const statusColor = getStatusColor(node.status, colors);
  const protocolColor = getProtocolColor(node.protocol, colors);

  return (
    <TouchableOpacity onPress={onPress} onLongPress={onLongPress} activeOpacity={0.7}>
      <GlassCard style={styles.card} accentColor={node.status === "connected" ? colors.primary : colors.border}>
        <View style={styles.header}>
          <View style={styles.osRow}>
            <MaterialCommunityIcons name={osIcon.name as any} size={16} color={colors.mutedForeground} />
            <Text style={[styles.name, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>
              {node.name}
            </Text>
          </View>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
        </View>

        <Text style={[styles.host, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          {node.host}:{node.port}
        </Text>

        <View style={styles.footer}>
          <View style={[styles.badge, { borderColor: `${protocolColor}40`, backgroundColor: `${protocolColor}15` }]}>
            <Text style={[styles.badgeText, { color: protocolColor, fontFamily: "Inter_500Medium" }]}>{node.protocol}</Text>
          </View>

          {node.status === "connected" ? (
            <Text style={[styles.latency, { color: colors.success, fontFamily: "Inter_400Regular" }]}>
              {node.latencyMs}ms
            </Text>
          ) : (
            <Text style={[styles.latency, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              {formatLastSeen(node.lastSeen)}
            </Text>
          )}
        </View>
      </GlassCard>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, margin: 4, padding: 14 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  osRow: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1 },
  name: { fontSize: 14, flex: 1 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  host: { fontSize: 11, marginBottom: 10 },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  badge: { borderRadius: 4, borderWidth: 1, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { fontSize: 10, letterSpacing: 0.5 },
  latency: { fontSize: 11 },
});
