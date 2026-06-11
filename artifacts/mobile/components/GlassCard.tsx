import React from "react";
import { View, StyleSheet, ViewStyle, Platform } from "react-native";
import { useColors } from "@/hooks/useColors";

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  accentColor?: string;
  noBorder?: boolean;
  padding?: number;
}

export function GlassCard({ children, style, accentColor, noBorder = false, padding = 16 }: GlassCardProps) {
  const colors = useColors();
  const border = accentColor ?? colors.primary;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: noBorder ? "transparent" : `${border}30`,
          borderWidth: noBorder ? 0 : 1,
          padding,
        },
        Platform.OS !== "web" && {
          shadowColor: border,
          shadowOpacity: 0.2,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 2 },
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 8,
    overflow: "hidden",
    elevation: 4,
  },
});
