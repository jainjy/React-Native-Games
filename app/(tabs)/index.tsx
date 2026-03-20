import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";

export default function HomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Titre App */}
        <Text style={styles.appTitle}>🎮 Malagasy Games</Text>
        <Text style={styles.subtitle}>Jeux traditionnels malagasy</Text>

        {/* Carte principale */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Choisissez un jeu</Text>

          <Text style={styles.description}>
            Découvrez et jouez aux jeux traditionnels malagasy directement
            depuis votre téléphone. Défiez vos amis et améliorez votre stratégie
            !
          </Text>

          {/* Boutons */}
          <View style={styles.buttonsContainer}>
            <TouchableOpacity
              style={styles.buttonFanorona}
              onPress={() => router.push("/fanorona")}
            >
              <Text style={styles.buttonText}>Jouer au Fanorona</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.buttonPoints}
              onPress={() => router.push("/jeuDePoint")}
            >
              <Text style={styles.buttonText}>Jeu de Points</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0F172A",
  },

  container: {
    flex: 1,
    padding: 25,
    alignItems: "center",
    justifyContent: "center",
  },

  appTitle: {
    fontSize: 34,
    fontWeight: "bold",
    color: "#FACC15",
    marginBottom: 5,
  },

  subtitle: {
    fontSize: 16,
    color: "#CBD5F5",
    marginBottom: 40,
  },

  card: {
    backgroundColor: "#1E293B",
    borderRadius: 25,
    paddingVertical: 40,
    paddingHorizontal: 25,
    width: "100%",
    alignItems: "center",

    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,

    elevation: 8,
  },

  cardTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#F8FAFC",
    marginBottom: 15,
  },

  description: {
    fontSize: 15,
    lineHeight: 22,
    color: "#CBD5F5",
    textAlign: "center",
    marginBottom: 30,
  },

  buttonsContainer: {
    width: "100%",
    gap: 15,
  },

  buttonFanorona: {
    backgroundColor: "#F59E0B",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },

  buttonPoints: {
    backgroundColor: "#22C55E",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },

  buttonText: {
    color: "#FFF",
    fontSize: 17,
    fontWeight: "bold",
  },

  footer: {
    marginTop: 40,
    color: "#94A3B8",
    fontSize: 12,
  },
});
