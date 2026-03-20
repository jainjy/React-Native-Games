import { Tabs } from "expo-router";
import React from "react";

import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
        headerShown: false,
        tabBarButton: HapticTab,
        // Style optionnel pour rendre la barre plus moderne
        tabBarStyle: {
          borderTopWidth: 0,
          elevation: 0,
          height: 60,
          paddingBottom: 10,
        },
      }}
    >
      <Tabs.Screen
        name="FanoronaFinal"
        options={{
          title: "Fanorona final",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="grid" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: "accueil",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="grid" color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="Chimestry"
        options={{
          title: "Jeu Chimie 2",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="basket.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="jeuDePoint"
        options={{
          title: "Jeu de Point",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="basket.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="fanorona"
        options={{
          title: "Jeu Fanorona",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="basket.fill" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
