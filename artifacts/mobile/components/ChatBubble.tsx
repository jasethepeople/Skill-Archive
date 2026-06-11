import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useColors } from "@/hooks/useColors";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

interface ChatBubbleProps {
  message: Message;
}

export function ChatBubble({ message }: ChatBubbleProps) {
  const colors = useColors();
  const isUser = message.role === "user";

  return (
    <View style={[styles.wrapper, isUser ? styles.wrapperUser : styles.wrapperAssistant]}>
      {!isUser && (
        <View style={[styles.avatarDot, { backgroundColor: colors.primary }]} />
      )}
      <View
        style={[
          styles.bubble,
          isUser
            ? [styles.bubbleUser, { backgroundColor: `${colors.primary}20`, borderColor: `${colors.primary}40` }]
            : [styles.bubbleAssistant, { backgroundColor: colors.card, borderColor: colors.border }],
        ]}
      >
        <Text
          style={[
            styles.text,
            {
              color: isUser ? colors.primary : colors.foreground,
              fontFamily: "Inter_400Regular",
            },
          ]}
        >
          {message.content}
          {message.streaming ? (
            <Text style={{ color: colors.primary }}> ▋</Text>
          ) : null}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flexDirection: "row", alignItems: "flex-end", marginVertical: 4, paddingHorizontal: 16 },
  wrapperUser: { justifyContent: "flex-end" },
  wrapperAssistant: { justifyContent: "flex-start", gap: 8 },
  avatarDot: { width: 6, height: 6, borderRadius: 3, marginBottom: 8 },
  bubble: {
    maxWidth: "82%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  bubbleUser: {},
  bubbleAssistant: {},
  text: { fontSize: 14, lineHeight: 21 },
});
