import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View, Dimensions } from "react-native";
import { useColors } from "@/hooks/useColors";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export function ScanLine() {
  const colors = useColors();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: 4000,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [-2, SCREEN_HEIGHT + 2],
  });

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      <Animated.View
        style={[
          styles.line,
          { backgroundColor: `${colors.primary}20`, transform: [{ translateY }] },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  line: { height: 2, width: "100%", position: "absolute" },
});
