import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import type { VaultFile, VaultFileType, EncryptionStatus } from "@/context/VaultContext";

interface FileItemProps {
  file: VaultFile;
  onPress?: () => void;
  onLongPress?: () => void;
}

function getFileIcon(type: VaultFileType): string {
  switch (type) {
    case "document": return "file-document-outline";
    case "image": return "image-outline";
    case "video": return "video-outline";
    case "archive": return "archive-outline";
    case "key": return "key-outline";
    case "config": return "cog-outline";
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function formatDate(isoDate: string): string {
  const d = new Date(isoDate);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getStatusBadge(status: EncryptionStatus, colors: ReturnType<typeof useColors>): { label: string; color: string } {
  switch (status) {
    case "encrypted": return { label: "ENC", color: colors.success };
    case "encrypting": return { label: "ENC…", color: colors.warning };
    case "decrypting": return { label: "DEC…", color: colors.warning };
    case "pending": return { label: "PENDING", color: colors.mutedForeground };
  }
}

export function FileItem({ file, onPress, onLongPress }: FileItemProps) {
  const colors = useColors();
  const icon = getFileIcon(file.type);
  const badge = getStatusBadge(file.encryptionStatus, colors);

  return (
    <TouchableOpacity onPress={onPress} onLongPress={onLongPress} activeOpacity={0.7}>
      <View style={[styles.row, { borderBottomColor: colors.border }]}>
        <View style={[styles.iconWrap, { backgroundColor: `${colors.primary}15` }]}>
          <MaterialCommunityIcons name={icon as any} size={20} color={colors.primary} />
        </View>

        <View style={styles.info}>
          <Text style={[styles.name, { color: colors.foreground, fontFamily: "Inter_500Medium" }]} numberOfLines={1}>
            {file.name}
          </Text>
          <View style={styles.meta}>
            <Text style={[styles.metaText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              {formatBytes(file.sizeBytes)}
            </Text>
            <Text style={[styles.metaDot, { color: colors.border }]}>·</Text>
            <Text style={[styles.metaText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              {file.chunks} chunk{file.chunks !== 1 ? "s" : ""}
            </Text>
            <Text style={[styles.metaDot, { color: colors.border }]}>·</Text>
            <Text style={[styles.metaText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              {formatDate(file.modifiedAt)}
            </Text>
          </View>
          <Text style={[styles.checksum, { color: `${colors.primary}60`, fontFamily: "Inter_400Regular" }]}>
            sha256:{file.checksum.slice(0, 16)}…
          </Text>
        </View>

        <View style={styles.right}>
          <View style={[styles.encBadge, { borderColor: `${badge.color}40`, backgroundColor: `${badge.color}15` }]}>
            <Text style={[styles.encText, { color: badge.color, fontFamily: "Inter_600SemiBold" }]}>{badge.label}</Text>
          </View>
          <Text style={[styles.algo, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            {file.algorithm}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  iconWrap: { width: 40, height: 40, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  info: { flex: 1, gap: 3 },
  name: { fontSize: 14 },
  meta: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 11 },
  metaDot: { fontSize: 11 },
  checksum: { fontSize: 10, fontFamily: "monospace" },
  right: { alignItems: "flex-end", gap: 4 },
  encBadge: { borderWidth: 1, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  encText: { fontSize: 9, letterSpacing: 0.8 },
  algo: { fontSize: 9 },
});
