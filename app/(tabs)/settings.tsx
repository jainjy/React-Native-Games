import React from "react";
import { StyleSheet, Text, View, SafeAreaView, FlatList } from "react-native";

const DATA = [
  {
    id: "1",
    title: "Statistiques",
    desc: "Consultez vos données en temps réel.",
  },
  {
    id: "2",
    title: "Notifications",
    desc: "Restez informé des dernières mises à jour.",
  },
  { id: "3", title: "Paramètres", desc: "Personnalisez votre expérience." },
  { id: "4", title: "Aide", desc: "Obtenez de l'aide en cas de besoin." },
];

export default function SettingsScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <FlatList
          data={DATA}
          numColumns={2}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardDesc}>{item.desc}</Text>
            </View>
          )}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F2F2F2",
  },
  container: {
    flex: 1,
    paddingTop: 50,
  },
  listContent: {
    paddingHorizontal: 10,
    alignItems: "center",
  },
  card: {
    backgroundColor: "#FFF",
    width: "45%", // Environ la moitié de l'écran moins les marges
    margin: 8,
    padding: 20,
    borderRadius: 15,
    minHeight: 120,
    // Style de l'ombre
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 8,
  },
  cardDesc: {
    fontSize: 13,
    color: "#666",
    lineHeight: 18,
  },
});
