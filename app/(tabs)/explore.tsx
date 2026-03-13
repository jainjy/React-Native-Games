import React from "react";
import { FlatList, SafeAreaView, StyleSheet, Text, View } from "react-native";

export default function CalendarScreen() {
  const daysOfWeek = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

  // Logique pour obtenir les jours du mois actuel
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0 = Janvier, 1 = Février...

  // 1. Nombre de jours dans le mois (ex: 31)
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // 2. Trouver le premier jour du mois (0 = Dimanche, 1 = Lundi...)
  // On ajuste pour que Lundi soit le premier index (0)
  let firstDayIndex = new Date(year, month, 1).getDay() - 1;
  if (firstDayIndex === -1) firstDayIndex = 6; // Ajustement pour Dimanche

  // 3. Créer le tableau de données (vides au début pour décalage + numéros)
  const calendarData = [
    ...Array(firstDayIndex).fill(null), // Cases vides avant le 1er du mois
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1), // Jours 1 à 31
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* En-tête des jours de la semaine */}
        <View style={styles.daysHeader}>
          {daysOfWeek.map((day) => (
            <View key={day} style={styles.dayHeaderBox}>
              <Text style={styles.dayHeaderText}>{day}</Text>
            </View>
          ))}
        </View>

        {/* Grille du calendrier */}
        <FlatList
          data={calendarData}
          numColumns={7}
          keyExtractor={(_, index) => index.toString()}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <View style={[styles.cell, !item && styles.emptyCell]}>
              {item && <Text style={styles.cellText}>{item}</Text>}
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
    padding: 10,
    marginTop: 50,
    alignItems: "center",
  },
  daysHeader: {
    flexDirection: "row",
    marginBottom: 5,
  },
  dayHeaderBox: {
    width: 45,
    height: 35,
    borderWidth: 1,
    borderColor: "#CCC",
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
    margin: 2,
  },
  dayHeaderText: {
    fontWeight: "bold",
    fontSize: 12,
  },
  cell: {
    width: 45,
    height: 45,
    borderWidth: 1,
    borderColor: "#CCC",
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
    margin: 2,
  },
  emptyCell: {
    backgroundColor: "transparent",
    borderWidth: 0,
  },
  cellText: {
    fontSize: 14,
    color: "#333",
  },
});
