import React, { useState } from "react";
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  Modal, TextInput, Alert, Platform,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useVault, VaultFileType } from "@/context/VaultContext";
import { FileItem } from "@/components/FileItem";
import { GlassCard } from "@/components/GlassCard";

const FILE_TYPES: { type: VaultFileType; label: string; icon: string }[] = [
  { type: "document", label: "Document", icon: "file-document-outline" },
  { type: "image", label: "Image", icon: "image-outline" },
  { type: "video", label: "Video", icon: "video-outline" },
  { type: "archive", label: "Archive", icon: "archive-outline" },
  { type: "key", label: "Key", icon: "key-outline" },
  { type: "config", label: "Config", icon: "cog-outline" },
];

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export default function VaultScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { files, totalEncryptedBytes, addFile, removeFile } = useVault();
  const [showAdd, setShowAdd] = useState(false);
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState("");
  const [fileType, setFileType] = useState<VaultFileType>("document");

  const webTop = Platform.OS === "web" ? 67 : insets.top;

  const handleAdd = () => {
    if (!fileName.trim()) return;
    const size = parseInt(fileSize) || Math.floor(Math.random() * 1024 * 1024 * 10 + 1024);
    addFile(fileName.trim(), fileType, size);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowAdd(false);
    setFileName(""); setFileSize("");
  };

  const handleLongPress = (id: string, name: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert("Delete file", `Remove "${name}" from vault?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => removeFile(id) },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: webTop + 12, borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.title, { color: colors.primary, fontFamily: "Inter_700Bold" }]}>VAULT</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            {files.length} FILES · {formatBytes(totalEncryptedBytes)} ENCRYPTED
          </Text>
        </View>
        <TouchableOpacity onPress={() => setShowAdd(true)} style={[styles.addBtn, { borderColor: `${colors.primary}40` }]}>
          <MaterialCommunityIcons name="plus" size={18} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <GlassCard style={styles.cryptoCard} noBorder>
        <View style={styles.cryptoRow}>
          {[
            { label: "Algorithm", value: "AES-256-GCM" },
            { label: "Chunks", value: "4 MB" },
            { label: "Integrity", value: "SHA-256" },
          ].map(({ label, value }) => (
            <View key={label} style={styles.cryptoStat}>
              <Text style={[styles.cryptoLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{label}</Text>
              <Text style={[styles.cryptoValue, { color: colors.primary, fontFamily: "Inter_600SemiBold" }]}>{value}</Text>
            </View>
          ))}
        </View>
      </GlassCard>

      {files.length === 0 ? (
        <View style={styles.empty}>
          <MaterialCommunityIcons name="shield-off-outline" size={44} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>Vault is empty</Text>
          <Text style={[styles.emptySubtext, { color: `${colors.mutedForeground}80`, fontFamily: "Inter_400Regular" }]}>Add encrypted files to secure storage</Text>
        </View>
      ) : (
        <FlatList
          data={files}
          keyExtractor={(f) => f.id}
          renderItem={({ item }) => (
            <FileItem file={item} onLongPress={() => handleLongPress(item.id, item.name)} />
          )}
          contentContainerStyle={{ paddingBottom: insets.bottom + 90 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      <Modal visible={showAdd} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <GlassCard style={[styles.modalCard, { backgroundColor: colors.secondary }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>ADD FILE</Text>

            <TextInput
              style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border, fontFamily: "Inter_400Regular" }]}
              placeholder="File name"
              placeholderTextColor={colors.mutedForeground}
              value={fileName}
              onChangeText={setFileName}
            />
            <TextInput
              style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border, fontFamily: "Inter_400Regular" }]}
              placeholder="Size in bytes (optional)"
              placeholderTextColor={colors.mutedForeground}
              value={fileSize}
              onChangeText={setFileSize}
              keyboardType="numeric"
            />

            <Text style={[styles.pickerLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>Type</Text>
            <View style={styles.typeGrid}>
              {FILE_TYPES.map(({ type, label, icon }) => (
                <TouchableOpacity
                  key={type}
                  onPress={() => setFileType(type)}
                  style={[styles.typeBtn, { backgroundColor: fileType === type ? `${colors.primary}20` : colors.muted, borderColor: fileType === type ? colors.primary : colors.border }]}
                >
                  <MaterialCommunityIcons name={icon as any} size={20} color={fileType === type ? colors.primary : colors.mutedForeground} />
                  <Text style={[styles.typeLabel, { color: fileType === type ? colors.primary : colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalBtns}>
              <TouchableOpacity onPress={() => setShowAdd(false)} style={[styles.btnCancel, { borderColor: colors.border }]}>
                <Text style={[styles.btnText, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleAdd} style={[styles.btnConfirm, { backgroundColor: `${colors.primary}20`, borderColor: colors.primary }]}>
                <Text style={[styles.btnText, { color: colors.primary, fontFamily: "Inter_600SemiBold" }]}>Encrypt</Text>
              </TouchableOpacity>
            </View>
          </GlassCard>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", borderBottomWidth: StyleSheet.hairlineWidth },
  title: { fontSize: 22, letterSpacing: 6 },
  subtitle: { fontSize: 10, letterSpacing: 1.5, marginTop: 2 },
  addBtn: { borderWidth: 1, borderRadius: 6, padding: 8 },
  cryptoCard: { marginHorizontal: 16, marginVertical: 14, padding: 14, borderRadius: 8, borderWidth: 1 },
  cryptoRow: { flexDirection: "row", justifyContent: "space-around" },
  cryptoStat: { alignItems: "center", gap: 4 },
  cryptoLabel: { fontSize: 9, letterSpacing: 1, textTransform: "uppercase" },
  cryptoValue: { fontSize: 12 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  emptyText: { fontSize: 15 },
  emptySubtext: { fontSize: 12, textAlign: "center" },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.7)" },
  modalCard: { margin: 16, marginBottom: 32, padding: 20 },
  modalTitle: { fontSize: 13, letterSpacing: 2, marginBottom: 16, textTransform: "uppercase" },
  input: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, marginBottom: 10 },
  pickerLabel: { fontSize: 11, marginBottom: 8, letterSpacing: 1 },
  typeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  typeBtn: { width: "30%", borderWidth: 1, borderRadius: 6, paddingVertical: 10, alignItems: "center", gap: 4 },
  typeLabel: { fontSize: 11 },
  modalBtns: { flexDirection: "row", gap: 12 },
  btnCancel: { flex: 1, borderWidth: 1, borderRadius: 6, paddingVertical: 12, alignItems: "center" },
  btnConfirm: { flex: 1, borderWidth: 1, borderRadius: 6, paddingVertical: 12, alignItems: "center" },
  btnText: { fontSize: 14 },
});
