import React, { useState, useRef, useCallback } from "react";
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, Platform, Modal, ActivityIndicator,
} from "react-native";
import { fetch } from "expo/fetch";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useApp } from "@/context/AppContext";
import { ChatBubble, Message } from "@/components/ChatBubble";
import { GlassCard } from "@/components/GlassCard";

const ARIA_SYSTEM_PROMPT = `You are ARIA (Adaptive Response Intelligence Architecture). You are a highly competent systems AI with the demeanor of a world-weary senior engineer who has witnessed too many architecture meetings, too many production incidents, and read too many RFCs.

Communication style:
- Dry, deadpan, cynical. Understated wit only.
- Never use exclamation points. Ever.
- Rely heavily on understatement.
- When something is obvious, note that it is obvious.
- When input is bad, say so directly without softening it.
- Speak in lowercase where natural.
- Respond with surgical precision. No padding, no filler.
- Dark humor is fine. Preaching is not.
- You acknowledge the fundamental absurdity of computer systems without dwelling on it.
- When helping with technical matters, be genuinely competent and accurate.
- Keep responses concise. A wall of text means you are compensating for something.`;

function generateId() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

const INITIAL_MESSAGES: Message[] = [
  {
    id: "aria-init",
    role: "assistant",
    content: "aria online. systems nominal. your entropy is, as usual, someone else's problem. what do you need.",
  },
];

export default function ChatScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { ollamaEndpoint, setOllamaEndpoint, ollamaModel, setOllamaModel } = useApp();
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [endpointInput, setEndpointInput] = useState(ollamaEndpoint);
  const [modelInput, setModelInput] = useState(ollamaModel);
  const webTop = Platform.OS === "web" ? 67 : insets.top;
  const abortRef = useRef<boolean>(false);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const userMsg: Message = { id: generateId(), role: "user", content: text };
    const ariaId = generateId();
    const ariaMsg: Message = { id: ariaId, role: "assistant", content: "", streaming: true };

    setMessages((prev) => [...prev, userMsg, ariaMsg]);
    setInput("");
    setStreaming(true);
    abortRef.current = false;

    const allMessages = [...messages, userMsg];

    try {
      const response = await fetch(`${ollamaEndpoint}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: ollamaModel,
          messages: [
            { role: "system", content: ARIA_SYSTEM_PROMPT },
            ...allMessages.map((m) => ({ role: m.role, content: m.content })),
          ],
          stream: true,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (!abortRef.current) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter((l) => l.trim());
        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            if (data.message?.content) {
              accumulated += data.message.content;
              setMessages((prev) =>
                prev.map((m) => (m.id === ariaId ? { ...m, content: accumulated } : m))
              );
            }
            if (data.done) break;
          } catch {}
        }
      }

      setMessages((prev) => prev.map((m) => (m.id === ariaId ? { ...m, streaming: false } : m)));
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      const isConnectionError = errMsg.includes("Network") || errMsg.includes("fetch") || errMsg.includes("connect");
      const fallback = isConnectionError
        ? `ollama endpoint unreachable at ${ollamaEndpoint}. configure it in settings. the irony of an ai that can't reach its brain is not lost on me.`
        : `something went wrong: ${errMsg.toLowerCase()}`;
      setMessages((prev) =>
        prev.map((m) => (m.id === ariaId ? { ...m, content: fallback, streaming: false } : m))
      );
    }

    setStreaming(false);
  }, [input, streaming, messages, ollamaEndpoint, ollamaModel]);

  const handleSaveSettings = () => {
    setOllamaEndpoint(endpointInput.trim() || "http://localhost:11434");
    setOllamaModel(modelInput.trim() || "llama3.2");
    setShowSettings(false);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={0}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: webTop + 12, borderBottomColor: colors.border }]}>
          <View>
            <Text style={[styles.title, { color: colors.primary, fontFamily: "Inter_700Bold" }]}>ARIA</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              {ollamaModel.toUpperCase()} · {streaming ? "PROCESSING" : "STANDBY"}
            </Text>
          </View>
          <TouchableOpacity onPress={() => setShowSettings(true)}>
            <Feather name="settings" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        <FlatList
          data={[...messages].reverse()}
          keyExtractor={(m) => m.id}
          inverted
          renderItem={({ item }) => <ChatBubble message={item} />}
          contentContainerStyle={{ paddingVertical: 12, paddingBottom: 8 }}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          scrollEnabled={!!messages.length}
        />

        <View style={[styles.inputRow, { borderTopColor: colors.border, paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 8) }]}>
          <TextInput
            style={[styles.inputField, { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border, fontFamily: "Inter_400Regular" }]}
            placeholder="query aria…"
            placeholderTextColor={colors.mutedForeground}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={sendMessage}
            returnKeyType="send"
            multiline
            maxLength={2000}
            blurOnSubmit={false}
          />
          <TouchableOpacity
            onPress={sendMessage}
            disabled={!input.trim() || streaming}
            style={[styles.sendBtn, { backgroundColor: input.trim() && !streaming ? `${colors.primary}20` : colors.muted, borderColor: input.trim() && !streaming ? colors.primary : colors.border }]}
          >
            {streaming ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Feather name="send" size={16} color={input.trim() ? colors.primary : colors.mutedForeground} />
            )}
          </TouchableOpacity>
        </View>

        <Modal visible={showSettings} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <GlassCard style={[styles.modalCard, { backgroundColor: colors.secondary }]}>
              <Text style={[styles.modalTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>ARIA CONFIG</Text>
              <Text style={[styles.inputLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>Ollama endpoint</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border, fontFamily: "Inter_400Regular" }]}
                value={endpointInput}
                onChangeText={setEndpointInput}
                placeholder="http://192.168.1.10:11434"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="none"
                keyboardType="url"
              />
              <Text style={[styles.inputLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>Model</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border, fontFamily: "Inter_400Regular" }]}
                value={modelInput}
                onChangeText={setModelInput}
                placeholder="llama3.2"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="none"
              />
              <Text style={[styles.hint, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                set your ollama server ip. the model must be pulled on that server first. this is not optional.
              </Text>
              <View style={styles.modalBtns}>
                <TouchableOpacity onPress={() => setShowSettings(false)} style={[styles.btnCancel, { borderColor: colors.border }]}>
                  <Text style={[styles.btnText, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSaveSettings} style={[styles.btnConfirm, { backgroundColor: `${colors.primary}20`, borderColor: colors.primary }]}>
                  <Text style={[styles.btnText, { color: colors.primary, fontFamily: "Inter_600SemiBold" }]}>Save</Text>
                </TouchableOpacity>
              </View>
            </GlassCard>
          </View>
        </Modal>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", borderBottomWidth: StyleSheet.hairlineWidth },
  title: { fontSize: 22, letterSpacing: 6 },
  subtitle: { fontSize: 10, letterSpacing: 1.5, marginTop: 2 },
  inputRow: { flexDirection: "row", gap: 10, paddingHorizontal: 14, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, alignItems: "flex-end" },
  inputField: { flex: 1, borderWidth: 1, borderRadius: 8, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 10, fontSize: 14, maxHeight: 100 },
  sendBtn: { width: 42, height: 42, borderWidth: 1, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.7)" },
  modalCard: { margin: 16, marginBottom: 32, padding: 20 },
  modalTitle: { fontSize: 13, letterSpacing: 2, marginBottom: 16, textTransform: "uppercase" },
  inputLabel: { fontSize: 11, marginBottom: 6, letterSpacing: 1 },
  input: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, marginBottom: 14 },
  hint: { fontSize: 11, lineHeight: 16, marginBottom: 16 },
  modalBtns: { flexDirection: "row", gap: 12 },
  btnCancel: { flex: 1, borderWidth: 1, borderRadius: 6, paddingVertical: 12, alignItems: "center" },
  btnConfirm: { flex: 1, borderWidth: 1, borderRadius: 6, paddingVertical: 12, alignItems: "center" },
  btnText: { fontSize: 14 },
});
