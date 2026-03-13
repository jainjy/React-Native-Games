import React, { useEffect, useState } from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";

const INITIAL_MESSAGES = [
  {
    id: 1,
    text: "Salut John ! Tu as fini le design ?",
    sender: "other",
    user: "Jane Doe",
  },
  {
    id: 2,
    text: "Salut Jane ! Oui, je viens d'ajouter le Chat.",
    sender: "me",
  },
  {
    id: 3,
    text: "Super ! Ça respecte bien la maquette ?",
    sender: "other",
    user: "Jane Doe",
  },
  { id: 4, text: "Exactement comme sur l'image !", sender: "me" },
  {
    id: 5,
    text: "Parfait, j'ai hâte de voir ça. Merci !",
    sender: "other",
    user: "Jane Doe",
  },
  { id: 6, text: "Pas de souci, à plus tard !", sender: "me" },
];

export default function ChatScreen() {
  const [messages, setMessages] = useState<any[]>([]);

  useEffect(() => {
    // Mélange aléatoire des messages au chargement
    const shuffled = [...INITIAL_MESSAGES].sort(() => Math.random() - 0.5);
    setMessages(shuffled);
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        {messages.map((msg) => (
          <View
            key={msg.id}
            style={msg.sender === "me" ? styles.myWrapper : styles.otherWrapper}
          >
            {/* Nom de l'utilisateur : "Vous" pour moi, son nom pour l'autre */}
            <Text style={styles.userName}>
              {msg.sender === "me" ? "Vous" : msg.user}
            </Text>

            <View
              style={[
                styles.bubble,
                msg.sender === "me" ? styles.myBubble : styles.otherBubble,
              ]}
            >
              <Text
                style={[
                  styles.text,
                  msg.sender === "me" ? styles.myText : styles.otherText,
                ]}
              >
                {msg.text}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F2F2F2",
  },
  container: {
    padding: 15,
    paddingTop: 40,
  },
  myWrapper: {
    alignSelf: "flex-end",
    alignItems: "flex-end",
    marginBottom: 15,
  },
  otherWrapper: {
    alignSelf: "flex-start",
    alignItems: "flex-start",
    marginBottom: 15,
  },
  userName: {
    fontSize: 12,
    color: "#888",
    marginBottom: 4,
    fontWeight: "600",
    marginHorizontal: 8,
  },
  bubble: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    maxWidth: "85%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  myBubble: {
    backgroundColor: "#007AFF",
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: "#FFFFFF",
    borderBottomLeftRadius: 4,
  },
  myText: {
    color: "#FFF",
    fontSize: 15,
  },
  otherText: {
    color: "#1C1C1E",
    fontSize: 15,
  },
  text: {
    lineHeight: 20,
  },
});
