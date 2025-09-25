import { Tabs } from "expo-router";
import { Waves, Settings, BarChart3 } from "lucide-react-native";
import React from "react";
import { COLORS } from "@/constants/dsp-config";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: COLORS.primary.mint,
        tabBarInactiveTintColor: COLORS.text.secondary,
        tabBarStyle: {
          backgroundColor: COLORS.background.card,
          borderTopColor: COLORS.background.cardLight,
        },
        headerStyle: {
          backgroundColor: COLORS.background.dark,
        },
        headerTintColor: COLORS.text.primary,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "DSP Waveform Builder",
          tabBarLabel: "Builder",
          tabBarIcon: ({ color }) => <Waves size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="waterfall"
        options={{
          title: "Waterfall Display",
          tabBarLabel: "Waterfall",
          tabBarIcon: ({ color }) => <BarChart3 size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color }) => <Settings size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
