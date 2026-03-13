import React, { useEffect, useState } from "react";
import { SafeAreaView, StyleSheet, Text, View } from "react-native";

export default function GridScreen() {
  const [numbers, setNumbers] = useState<number[]>([]);

  // Fonction pour mélanger un tableau (Algorithme de Fisher-Yates)
  const shuffleNumbers = () => {
    const array = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    setNumbers(array);
  };

  // Se lance une seule fois au montage du composant
  useEffect(() => {
    shuffleNumbers();
  }, []);

  // Si le tableau est vide, on n'affiche rien ou un loader
  if (numbers.length === 0) return null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.gridContainer}>
          {/* Ligne 1 : Index 0, 1, 2 */}
          <View style={[styles.row, styles.borderBottom]}>
            <View style={[styles.cell, styles.borderRight]}>
              <Text style={styles.text}>{numbers[0]}</Text>
            </View>
            <View style={[styles.cell, styles.borderRight]}>
              <Text style={styles.text}>{numbers[1]}</Text>
            </View>
            <View style={styles.cell}>
              <Text style={styles.text}>{numbers[2]}</Text>
            </View>
          </View>

          {/* Ligne 2 : Index 3, 4, 5 */}
          <View style={[styles.row, styles.borderBottom]}>
            <View style={[styles.cell, styles.borderRight]}>
              <Text style={styles.text}>{numbers[3]}</Text>
            </View>
            <View style={[styles.cell, styles.borderRight]}>
              <Text style={styles.text}>{numbers[4]}</Text>
            </View>
            <View style={styles.cell}>
              <Text style={styles.text}>{numbers[5]}</Text>
            </View>
          </View>

          {/* Ligne 3 : Index 6, 7, 8 */}
          <View style={styles.row}>
            <View style={[styles.cell, styles.borderRight]}>
              <Text style={styles.text}>{numbers[6]}</Text>
            </View>
            <View style={[styles.cell, styles.borderRight]}>
              <Text style={styles.text}>{numbers[7]}</Text>
            </View>
            <View style={styles.cell}>
              <Text style={styles.text}>{numbers[8]}</Text>
            </View>
          </View>
        </View>
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
    justifyContent: "center",
    alignItems: "center",
  },
  gridContainer: {
    borderColor: "#000",
    borderWidth: 1,
    backgroundColor: "#F2F2F2",
  },
  row: {
    flexDirection: "row",
  },
  cell: {
    width: 100,
    height: 100,
    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#000",
  },
  borderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: "#000",
  },
  borderRight: {
    borderRightWidth: 1,
    borderRightColor: "#000",
  },
});
