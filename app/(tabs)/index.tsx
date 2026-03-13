import { SafeAreaView, StyleSheet, Text, View } from "react-native";

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* La "Carte" blanche contient tout le texte */}
        <View style={styles.card}>
          <Text style={styles.name}>John Doe</Text>
          <Text style={styles.title}>Développeur Full Stack</Text>

          <Text style={styles.description}>
            Passionné par les technologies web et mobiles, j'aime créer des
            applications performantes et intuitives.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F2F2F2", // Fond gris clair de l'écran
  },
  container: {
    flex: 1,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    backgroundColor: "#FFFFFF", // Fond blanc de la carte
    borderRadius: 20, // Coins arrondis
    paddingVertical: 40,
    paddingHorizontal: 25,
    width: "100%",
    alignItems: "center",

    // Ombres (Shadows) pour iOS
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,

    // Ombres (Elevation) pour Android
    elevation: 5,
  },
  name: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    color: "#555", // Gris foncé
    fontStyle: "italic", // Titre en italique comme sur l'image
    marginBottom: 20,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: "#777", // Gris plus clair pour la description
    textAlign: "center",
  },
});
