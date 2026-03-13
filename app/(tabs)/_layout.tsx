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
      {/* 1. HOME - Profil John Doe */}
      <Tabs.Screen
        name="index"
        options={{
          title: "Profil",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="person.fill" color={color} />
          ),
        }}
      />

      {/* 2. GRID - Chiffres aléatoires */}
      <Tabs.Screen
        name="grid"
        options={{
          title: "Grille",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="square.grid.3x3.fill" color={color} />
          ),
        }}
      />

      {/* 3. EXPLORE - Calendrier dynamique */}
      <Tabs.Screen
        name="explore"
        options={{
          title: "Calendrier",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="calendar" color={color} />
          ),
        }}
      />

      {/* 4. CHAT - Discussion avec Jane Doe */}
      <Tabs.Screen
        name="chat"
        options={{
          title: "Chat",
          tabBarIcon: ({ color }) => (
            <IconSymbol
              size={28}
              name="bubble.left.and.bubble.right.fill"
              color={color}
            />
          ),
        }}
      />

      {/* 5. SETTINGS - Cartes de statistiques/paramètres */}
      <Tabs.Screen
        name="settings"
        options={{
          title: "Réglages",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="gearshape.fill" color={color} />
          ),
        }}
      />

      {/* 6. MAGIC NUMBER */}
      <Tabs.Screen
        name="Magic-number"
        options={{
          title: "Nombre magic",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="number" color={color} />
          ),
        }}
      />

      {/* 8. NOUVEAU JEU MEMORY */}
      <Tabs.Screen
        name="memory"
        options={{
          title: "Mémoire",
          tabBarIcon: ({ color }) => (
            // Utilise 'brain' si dispo, sinon 'puzzlepiece' ou autre
            <IconSymbol size={28} name="brain.head.profile" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="fanorona"
        options={{
          title: "Fanorona 3",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="grid" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="Couleurmagique"
        options={{
          title: "couleur magique",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="grid" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="PanierGame"
        options={{
          title: "jeu de Panier",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="basket.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="fanorona_9"
        options={{
          title: "Fanorona 9",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="basket.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="chimestryGame"
        options={{
          title: "Jeu Chimie 1",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="basket.fill" color={color} />
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
    </Tabs>
  );
}
