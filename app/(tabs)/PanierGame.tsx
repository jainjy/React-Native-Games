import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, TouchableOpacity, Alert, StatusBar } from 'react-native';

const { height } = Dimensions.get('window');
const EMOJIS = ['🍎', '🍌', '🍇', '🍓', '🍍', '🥝', '🍑', '🍒', '🍋', '🥥'];
const GAME_DURATION = 15;

export default function SequentialBasketGame() {
  const [gameState, setGameState] = useState('START'); 
  const [basket, setBasket] = useState([]);
  const [testEmoji, setTestEmoji] = useState('');
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  
  // Animations
  const fallAnim = useRef(new Animated.Value(-100)).current;
  const exitAnim = useRef(new Animated.Value(height * 0.45)).current;
  
  const [incomingEmoji, setIncomingEmoji] = useState('');
  const [outgoingEmoji, setOutgoingEmoji] = useState('');

  const startGame = () => {
    setGameState('PLAYING');
    setBasket([]);
    setTimeLeft(GAME_DURATION);
    runGameLoop();
  };

  const runGameLoop = () => {
    let timer = GAME_DURATION;
    const timerInterval = setInterval(() => {
      timer--;
      setTimeLeft(timer);
      if (timer <= 0) clearInterval(timerInterval);
    }, 1000);

    const mainLoop = (elapsed) => {
      if (elapsed >= GAME_DURATION * 1000) {
        setTimeout(() => {
          setTestEmoji(EMOJIS[Math.floor(Math.random() * EMOJIS.length)]);
          setGameState('END');
        }, 1500);
        return;
      }

      // --- ÉTAPE 1 : ENTRÉE ---
      const nextIn = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
      setIncomingEmoji(nextIn);
      setOutgoingEmoji(''); 

      fallAnim.setValue(-100);
      Animated.timing(fallAnim, {
        toValue: height * 0.45,
        duration: 800,
        useNativeDriver: true,
      }).start(() => {
        
        // Mise à jour du panier interne
        setBasket(current => {
          const newBasket = [...current, nextIn];
       
          if (newBasket.length > 2) {
            // Un petit délai pour simuler le temps de transit dans le panier
            setTimeout(() => {
              const randomIndex = Math.floor(Math.random() * newBasket.length);
              const removed = newBasket[randomIndex];
              
              setOutgoingEmoji(removed);
              
              // Animation de sortie vers le bas
              exitAnim.setValue(height * 0.45);
              Animated.timing(exitAnim, {
                toValue: height + 100,
                duration: 800,
                useNativeDriver: true,
              }).start();

              // Mise à jour réelle du panier après le retrait
              setBasket(b => b.filter((item, index) => {
                // On retire seulement la première occurrence de l'emoji choisi
                const firstIdx = b.indexOf(removed);
                return index !== firstIdx;
              }));
            }, 500); 
          }
          return newBasket;
        });

        // --- ÉTAPE 3 : ATTENTE AVANT LE PROCHAIN CYCLE ---
        setTimeout(() => mainLoop(elapsed + 2500), 2500);
      });
    };

    mainLoop(0);
  };

  const checkAnswer = (userThinksInside) => {
    const isInside = basket.includes(testEmoji);
    Alert.alert(
      userThinksInside === isInside ? "✅ BRAVO !" : "❌ PERDU !",
      `Le panier contenait : ${basket.length > 0 ? basket.join(' ') : "Rien"}`,
      [{ text: "REJOUER", onPress: () => setGameState('START') }]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {gameState === 'START' && (
        <View style={styles.card}>
          <Text style={styles.logo}>🧺</Text>
          <Text style={styles.title}>MÉMO-PANIER</Text>
          <Text style={styles.subtitle}>Retenez ce qui reste à l'intérieur.{"\n"}Capacité maximale : 2</Text>
          <TouchableOpacity style={styles.btnStart} onPress={startGame}>
            <Text style={styles.btnText}>COMMENCER</Text>
          </TouchableOpacity>
        </View>
      )}

      {gameState === 'PLAYING' && (
        <View style={styles.full}>
          <View style={styles.timerBox}>
            <Text style={styles.timerText}>{timeLeft}s</Text>
          </View>

          {/* L'emoji qui descend */}
          <Animated.Text style={[styles.emoji, { transform: [{ translateY: fallAnim }] }]}>
            {incomingEmoji}
          </Animated.Text>

          {/* Le Panier (Visuel) */}
          <View style={styles.basket}>
            <View style={styles.basketRim} />
            <Text style={styles.basketText}>CONTENU CACHÉ</Text>
          </View>

          {/* L'emoji qui sort (toujours après l'entrée) */}
          <Animated.Text style={[styles.emoji, { transform: [{ translateY: exitAnim }] }]}>
            {outgoingEmoji}
          </Animated.Text>
        </View>
      )}

      {gameState === 'END' && (
        <View style={styles.card}>
          <Text style={styles.question}>Cet emoji est-il toujours dans le panier ?</Text>
          <View style={styles.testZone}>
            <Text style={styles.testEmoji}>{testEmoji}</Text>
          </View>
          <View style={styles.row}>
            <TouchableOpacity style={[styles.btnAction, {backgroundColor: '#27ae60'}]} onPress={() => checkAnswer(true)}>
              <Text style={styles.btnText}>OUI</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btnAction, {backgroundColor: '#c0392b'}]} onPress={() => checkAnswer(false)}>
              <Text style={styles.btnText}>NON</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e', justifyContent: 'center', alignItems: 'center' },
  full: { flex: 1, width: '100%', alignItems: 'center' },
  card: { width: '85%', backgroundColor: '#16213e', padding: 30, borderRadius: 30, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10, elevation: 10 },
  logo: { fontSize: 80, marginBottom: 10 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#e94560', marginBottom: 10 },
  subtitle: { color: '#95a5a6', textAlign: 'center', marginBottom: 30, lineHeight: 22 },
  timerBox: { marginTop: 60, paddingHorizontal: 25, paddingVertical: 10, backgroundColor: '#e94560', borderRadius: 20 },
  timerText: { color: 'white', fontSize: 24, fontWeight: 'bold' },
  emoji: { fontSize: 75, position: 'absolute', zIndex: 5 },
  basket: {
    position: 'absolute', top: height * 0.45,
    width: 220, height: 140, backgroundColor: '#d35400',
    borderRadius: 25, borderWidth: 6, borderColor: '#a04000',
    zIndex: 10, justifyContent: 'center', alignItems: 'center', elevation: 15
  },
  basketRim: { position: 'absolute', top: -10, width: 230, height: 20, backgroundColor: '#a04000', borderRadius: 10 },
  basketText: { color: 'white', fontWeight: 'bold', opacity: 0.5, letterSpacing: 1 },
  testZone: { backgroundColor: '#0f3460', padding: 35, borderRadius: 25, marginVertical: 30 },
  testEmoji: { fontSize: 90 },
  row: { flexDirection: 'row', gap: 15 },
  btnStart: { backgroundColor: '#e94560', paddingHorizontal: 45, paddingVertical: 18, borderRadius: 20 },
  btnAction: { flex: 1, paddingVertical: 20, borderRadius: 20, alignItems: 'center' },
  btnText: { color: 'white', fontSize: 22, fontWeight: 'bold' },
  question: { color: 'white', fontSize: 22, textAlign: 'center', fontWeight: 'bold' }
});