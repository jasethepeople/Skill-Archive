import React, { useState, useRef, useEffect } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Modal, TextInput, Platform, Animated,
} from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useApp, NodeProtocol, NodeOS } from "@/context/AppContext";
import { NodeCard } from "@/components/NodeCard";
import { GlassCard } from "@/components/GlassCard";
import { ScanLine } from "@/components/ScanLine";

const PROTOCOLS: NodeProtocol[] = ["SSH", "WebRTC", "WireGuard"];
const OS_OPTIONS: NodeOS[] = ["linux", "macos", "windows", "android", "ios"];

function Clock() {
  const [time, setTime] = useState(() => new Date());
  const colors = useColors();
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <Text style={{ color: colors.primary, fontFamily: "Inter_500Medium", fontSize: 12, letterSpacing: 2 }}>
      {time.toLocaleTimeString("en-US", { hour12: false })} UTC
    </Text>
  );
}

function StatBar({ label, value, color }: { label: string; value: number; color: string }) {
  const colors = useColors();
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: value, duration: 800, useNativeDriver: false }).start();
  }, [value]);
  return (
    <View style={statStyles.container}>
      <Text style={[statStyles.label, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{label}</Text>
      <View style={[statStyles.track, { backgroundColor: colors.muted }]}>
        <Animated.View style={[statStyles.fill, { backgroundColor: color, width: anim.interpolate({ inputRange: [0, 100], outputRange: ["0%", "100%"] }) }]} />
      </View>
      <Text style={[statStyles.pct, { color, fontFamily: "Inter_500Medium" }]}>{value}%</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  container: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  label: { fontSize: 10, width: 32, letterSpacing: 0.5, textTransform: "uppercase" },
  track: { flex: 1, height: 4, borderRadius: 2, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 2 },
  pct: { fontSize: 10, width: 32, textAlign: "right" },
});

export default function OrchestratorScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { nodes, addNode, removeNode } = useApp();
  const [showAdd, setShowAdd] = useState(false);
  const [nodeName, setNodeName] = useState("");
  const [nodeHost, setNodeHost] = useState("");
  const [nodePort, setNodePort] = useState("22");
  const [nodeProtocol, setNodeProtocol] = useState<NodeProtocol>("SSH");
  const [nodeOS, setNodeOS] = useState<NodeOS>("linux");
  const [cpu] = useState(Math.floor(Math.random() * 40 + 20));
  const [mem] = useState(Math.floor(Math.random() * 50 + 30));
  const [net] = useState(Math.floor(Math.random() * 60 + 10));

  const connected = nodes.filter((n) => n.status === "connected").length;

  const handleAdd = () => {
    if (!nodeName.trim() || !nodeHost.trim()) return;
    addNode({ name: nodeName.trim(), host: nodeHost.trim(), port: parseInt(nodePort) || 22, os: nodeOS, protocol: nodeProtocol, tags: [] });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowAdd(false);
    setNodeName(""); setNodeHost(""); setNodePort("22");
  };

  const webTop = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScanLine />

      <View style={[styles.header, { paddingTop: webTop + 12, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.title, { color: colors.primary, fontFamily: "Inter_700Bold" }]}>NEXUS</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            ORCHESTRATOR · {connected}/{nodes.length} ONLINE
          </Text>
        </View>
        <Clock />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: insets.bottom + 90, paddingTop: 16 }} showsVerticalScrollIndicator={false}>
        <GlassCard style={styles.statsCard}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>SYSTEM METRICS</Text>
          <StatBar label="CPU" value={cpu} color={colors.primary} />
          <StatBar label="MEM" value={mem} color={colors.purple} />
          <StatBar label="NET" value={net} color={colors.warning} />
        </GlassCard>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>NODES ({nodes.length})</Text>
          <TouchableOpacity onPress={() => setShowAdd(true)} style={[styles.addBtn, { borderColor: `${colors.primary}40` }]}>
            <Feather name="plus" size={14} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {nodes.length === 0 ? (
          <View style={styles.empty}>
            <MaterialCommunityIcons name="server-network-off" size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>No nodes configured</Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {nodes.map((node) => (
              <View key={node.id} style={styles.gridCell}>
                <NodeCard node={node} onLongPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); removeNode(node.id); }} />
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal visible={showAdd} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <GlassCard style={[styles.modalCard, { backgroundColor: colors.secondary }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>ADD NODE</Text>

            {[
              { placeholder: "Node name", value: nodeName, set: setNodeName },
              { placeholder: "Host / IP", value: nodeHost, set: setNodeHost },
              { placeholder: "Port", value: nodePort, set: setNodePort, keyboardType: "numeric" as const },
            ].map(({ placeholder, value, set, keyboardType }) => (
              <TextInput
                key={placeholder}
                style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border, fontFamily: "Inter_400Regular" }]}
                placeholder={placeholder}
                placeholderTextColor={colors.mutedForeground}
                value={value}
                onChangeText={set}
                keyboardType={keyboardType}
              />
            ))}

            <Text style={[styles.pickerLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>Protocol</Text>
            <View style={styles.pills}>
              {PROTOCOLS.map((p) => (
                <TouchableOpacity key={p} onPress={() => setNodeProtocol(p)} style={[styles.pill, { backgroundColor: nodeProtocol === p ? `${colors.primary}30` : colors.muted, borderColor: nodeProtocol === p ? colors.primary : colors.border }]}>
                  <Text style={[styles.pillText, { color: nodeProtocol === p ? colors.primary : colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.pickerLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>OS</Text>
            <View style={styles.pills}>
              {OS_OPTIONS.map((o) => (
                <TouchableOpacity key={o} onPress={() => setNodeOS(o)} style={[styles.pill, { backgroundColor: nodeOS === o ? `${colors.primary}30` : colors.muted, borderColor: nodeOS === o ? colors.primary : colors.border }]}>
                  <Text style={[styles.pillText, { color: nodeOS === o ? colors.primary : colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>{o}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalBtns}>
              <TouchableOpacity onPress={() => setShowAdd(false)} style={[styles.btnCancel, { borderColor: colors.border }]}>
                <Text style={[styles.btnText, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleAdd} style={[styles.btnConfirm, { backgroundColor: `${colors.primary}20`, borderColor: colors.primary }]}>
                <Text style={[styles.btnText, { color: colors.primary, fontFamily: "Inter_600SemiBold" }]}>Add Node</Text>
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
  scroll: { flex: 1 },
  statsCard: { marginHorizontal: 16, marginBottom: 20, padding: 16 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, marginBottom: 8 },
  sectionLabel: { fontSize: 10, letterSpacing: 2, textTransform: "uppercase" },
  addBtn: { borderWidth: 1, borderRadius: 4, padding: 5 },
  grid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 12 },
  gridCell: { width: "50%" },
  empty: { alignItems: "center", paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 14 },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.7)" },
  modalCard: { margin: 16, marginBottom: 32, padding: 20 },
  modalTitle: { fontSize: 13, letterSpacing: 2, marginBottom: 16, textTransform: "uppercase" },
  input: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, marginBottom: 10 },
  pickerLabel: { fontSize: 11, marginBottom: 8, letterSpacing: 1 },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  pill: { borderWidth: 1, borderRadius: 4, paddingHorizontal: 10, paddingVertical: 5 },
  pillText: { fontSize: 12 },
  modalBtns: { flexDirection: "row", gap: 12, marginTop: 8 },
  btnCancel: { flex: 1, borderWidth: 1, borderRadius: 6, paddingVertical: 12, alignItems: "center" },
  btnConfirm: { flex: 1, borderWidth: 1, borderRadius: 6, paddingVertical: 12, alignItems: "center" },
  btnText: { fontSize: 14 },
});
