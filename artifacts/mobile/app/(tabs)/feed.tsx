import React, { useState } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Modal, TextInput, RefreshControl, ScrollView, Platform, Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useFeed } from "@/context/FeedContext";
import { FeedItem } from "@/components/FeedItem";
import { GlassCard } from "@/components/GlassCard";

export default function FeedScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { sources, items, loading, addSource, removeSource, refresh, activeSource, setActiveSource } = useFeed();
  const [showAdd, setShowAdd] = useState(false);
  const [srcName, setSrcName] = useState("");
  const [srcUrl, setSrcUrl] = useState("");
  const webTop = Platform.OS === "web" ? 67 : insets.top;

  const filteredItems = activeSource ? items.filter((i) => i.sourceId === activeSource) : items;

  const handleAddSource = () => {
    if (!srcName.trim() || !srcUrl.trim()) return;
    let url = srcUrl.trim();
    if (!url.startsWith("http")) url = `https://${url}`;
    addSource(srcName.trim(), url);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowAdd(false);
    setSrcName(""); setSrcUrl("");
  };

  const handleLongPressSource = (id: string, name: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert("Remove source", `Remove "${name}"?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => removeSource(id) },
    ]);
  };

  const sourceColor = (id: string) => sources.find((s) => s.id === id)?.color ?? colors.primary;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: webTop + 12, borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.title, { color: colors.primary, fontFamily: "Inter_700Bold" }]}>FEED</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            {items.length} ITEMS · {sources.length} SOURCES
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={refresh} style={[styles.iconBtn, { borderColor: `${colors.primary}30` }]}>
            <Feather name="refresh-cw" size={15} color={loading ? colors.mutedForeground : colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowAdd(true)} style={[styles.iconBtn, { borderColor: `${colors.primary}30` }]}>
            <Feather name="plus" size={15} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sourceChips} style={{ flexGrow: 0 }}>
        <TouchableOpacity
          onPress={() => setActiveSource(null)}
          style={[styles.chip, { backgroundColor: !activeSource ? `${colors.primary}20` : colors.muted, borderColor: !activeSource ? colors.primary : colors.border }]}
        >
          <Text style={[styles.chipText, { color: !activeSource ? colors.primary : colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>ALL</Text>
        </TouchableOpacity>
        {sources.map((src) => (
          <TouchableOpacity
            key={src.id}
            onPress={() => setActiveSource(activeSource === src.id ? null : src.id)}
            onLongPress={() => handleLongPressSource(src.id, src.name)}
            style={[styles.chip, { backgroundColor: activeSource === src.id ? `${src.color}20` : colors.muted, borderColor: activeSource === src.id ? src.color : colors.border }]}
          >
            <View style={[styles.chipDot, { backgroundColor: src.color }]} />
            <Text style={[styles.chipText, { color: activeSource === src.id ? src.color : colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>{src.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {filteredItems.length === 0 && !loading ? (
        <View style={styles.empty}>
          <Feather name="rss" size={40} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            {items.length === 0 ? "Pull to refresh feeds" : "No items from this source"}
          </Text>
          {items.length === 0 && (
            <TouchableOpacity onPress={refresh} style={[styles.refreshBtn, { borderColor: `${colors.primary}40`, backgroundColor: `${colors.primary}10` }]}>
              <Text style={[styles.refreshBtnText, { color: colors.primary, fontFamily: "Inter_500Medium" }]}>Fetch now</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(i) => i.id}
          renderItem={({ item }) => <FeedItem item={item} accentColor={sourceColor(item.sourceId)} />}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={colors.primary} colors={[colors.primary]} />}
          contentContainerStyle={{ paddingBottom: insets.bottom + 90 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      <Modal visible={showAdd} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <GlassCard style={[styles.modalCard, { backgroundColor: colors.secondary }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>ADD SOURCE</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border, fontFamily: "Inter_400Regular" }]}
              placeholder="Source name"
              placeholderTextColor={colors.mutedForeground}
              value={srcName}
              onChangeText={setSrcName}
            />
            <TextInput
              style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border, fontFamily: "Inter_400Regular" }]}
              placeholder="RSS / Atom URL"
              placeholderTextColor={colors.mutedForeground}
              value={srcUrl}
              onChangeText={setSrcUrl}
              autoCapitalize="none"
              keyboardType="url"
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity onPress={() => setShowAdd(false)} style={[styles.btnCancel, { borderColor: colors.border }]}>
                <Text style={[styles.btnText, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleAddSource} style={[styles.btnConfirm, { backgroundColor: `${colors.primary}20`, borderColor: colors.primary }]}>
                <Text style={[styles.btnText, { color: colors.primary, fontFamily: "Inter_600SemiBold" }]}>Add</Text>
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
  headerActions: { flexDirection: "row", gap: 8 },
  iconBtn: { borderWidth: 1, borderRadius: 6, padding: 8 },
  sourceChips: { paddingHorizontal: 14, paddingVertical: 10, gap: 8, flexDirection: "row" },
  chip: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, gap: 5 },
  chipDot: { width: 5, height: 5, borderRadius: 3 },
  chipText: { fontSize: 11 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14 },
  emptyText: { fontSize: 14 },
  refreshBtn: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 20, paddingVertical: 10 },
  refreshBtnText: { fontSize: 14 },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.7)" },
  modalCard: { margin: 16, marginBottom: 32, padding: 20 },
  modalTitle: { fontSize: 13, letterSpacing: 2, marginBottom: 16, textTransform: "uppercase" },
  input: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, marginBottom: 10 },
  modalBtns: { flexDirection: "row", gap: 12, marginTop: 4 },
  btnCancel: { flex: 1, borderWidth: 1, borderRadius: 6, paddingVertical: 12, alignItems: "center" },
  btnConfirm: { flex: 1, borderWidth: 1, borderRadius: 6, paddingVertical: 12, alignItems: "center" },
  btnText: { fontSize: 14 },
});
