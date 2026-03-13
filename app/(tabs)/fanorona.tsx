import React, { useEffect, useState } from "react";
import {
  Alert,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type Player = "Bleu" | "Rouge";
type Pawn = { player: Player; id: number } | null;
type GameMode = "PVP" | "PVE" | null;

export default function FanoronaTelo() {
  const initialBoard: Pawn[] = [
    { player: "Bleu", id: 0 },
    { player: "Bleu", id: 1 },
    null,
    { player: "Bleu", id: 2 },
    null,
    { player: "Rouge", id: 0 },
    null,
    { player: "Rouge", id: 1 },
    { player: "Rouge", id: 2 },
  ];

  const [board, setBoard] = useState<Pawn[]>(initialBoard);
  const [currentPlayer, setCurrentPlayer] = useState<Player>("Bleu");
  const [selectedPiece, setSelectedPiece] = useState<number | null>(null);
  const [hasWinner, setHasWinner] = useState<boolean>(false);
  const [gameMode, setGameMode] = useState<GameMode>(null);
  const [firstPlayerChoice, setFirstPlayerChoice] = useState<Player>("Bleu");

  const [movedStatus, setMovedStatus] = useState({
    Bleu: [false, false, false],
    Rouge: [false, false, false],
  });

  const victoryLines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];

  const adjacencies: { [key: number]: number[] } = {
    0: [1, 3, 4],
    1: [0, 2, 4],
    2: [1, 4, 5],
    3: [0, 4, 6],
    4: [0, 1, 2, 3, 5, 6, 7, 8],
    5: [2, 4, 8],
    6: [3, 4, 7],
    7: [6, 4, 8],
    8: [7, 4, 5],
  };

  useEffect(() => {
    if (gameMode === "PVE" && currentPlayer === "Rouge" && !hasWinner) {
      const timer = setTimeout(playAITurn, 800);
      return () => clearTimeout(timer);
    }
  }, [currentPlayer, gameMode, hasWinner]);

  const isPlayerAligned = (b: Pawn[], player: Player) =>
    victoryLines.some(
      ([a, b2, c]) =>
        b[a]?.player === player &&
        b[b2]?.player === player &&
        b[c]?.player === player,
    );

  const simulateMove = (from: number, to: number, b: Pawn[]) => {
    const clone = [...b];
    clone[to] = clone[from];
    clone[from] = null;
    return clone;
  };

  const playAITurn = () => {
    const ai = "Rouge";
    const human = "Bleu";

    const aiPawns = board
      .map((p, i) => (p?.player === ai ? i : -1))
      .filter((i) => i !== -1);

    // 1️⃣ GAGNER
    for (let from of aiPawns) {
      for (let to of adjacencies[from]) {
        if (!board[to]) {
          const test = simulateMove(from, to, board);
          if (isPlayerAligned(test, ai)) {
            handleMove(from, to);
            return;
          }
        }
      }
    }

    // 2️⃣ BLOQUER
    for (let from of aiPawns) {
      for (let to of adjacencies[from]) {
        if (!board[to]) {
          const test = simulateMove(from, to, board);
          if (isPlayerAligned(test, human)) {
            handleMove(from, to);
            return;
          }
        }
      }
    }

    // 3️⃣ CENTRE
    if (!board[4]) {
      const from = aiPawns.find((p) => adjacencies[p].includes(4));
      if (from !== undefined) {
        handleMove(from, 4);
        return;
      }
    }

    // 4️⃣ RANDOM INTELLIGENT
    const moves: [number, number][] = [];
    aiPawns.forEach((from) => {
      adjacencies[from].forEach((to) => {
        if (!board[to]) moves.push([from, to]);
      });
    });

    if (moves.length) {
      const [f, t] = moves[Math.floor(Math.random() * moves.length)];
      handleMove(f, t);
    }
  };

  const handleMove = (from: number, to: number) => {
    const movingPawn = board[from];
    if (!movingPawn) return;

    const newBoard = [...board];
    newBoard[to] = movingPawn;
    newBoard[from] = null;

    const newMovedStatus = { ...movedStatus };
    newMovedStatus[currentPlayer][movingPawn.id] = true;

    setMovedStatus(newMovedStatus);
    setBoard(newBoard);
    setSelectedPiece(null);

    const hasAligned = isPlayerAligned(newBoard, currentPlayer);
    const allMoved = newMovedStatus[currentPlayer].every(Boolean);

    if (hasAligned && allMoved) {
      setHasWinner(true);
      setTimeout(() => announceWinner(currentPlayer), 100);
      return;
    }

    setCurrentPlayer(currentPlayer === "Bleu" ? "Rouge" : "Bleu");
  };

  const handlePress = (index: number) => {
    if (hasWinner || (gameMode === "PVE" && currentPlayer === "Rouge")) return;
    if (board[index]?.player === currentPlayer) {
      setSelectedPiece(index);
    } else if (selectedPiece !== null && board[index] === null) {
      if (adjacencies[selectedPiece].includes(index)) {
        handleMove(selectedPiece, index);
      }
    }
  };

  const announceWinner = (winner: string) => {
    Alert.alert("🏆 Victoire !", `Le joueur ${winner} a gagné !`, [
      { text: "Menu Principal", onPress: () => setGameMode(null) },
    ]);
  };

  const resetGame = (mode: GameMode, first: Player = "Bleu") => {
    setBoard([...initialBoard]);
    setCurrentPlayer(first);
    setSelectedPiece(null);
    setHasWinner(false);
    setMovedStatus({
      Bleu: [false, false, false],
      Rouge: [false, false, false],
    });
    setGameMode(mode);
  };

  return (
    <View style={styles.container}>
      <Modal visible={gameMode === null} animationType="fade">
        <View style={styles.menuContainer}>
          <Text style={styles.menuTitle}>FANORON-TELO</Text>

          <TouchableOpacity
            style={styles.menuBtn}
            onPress={() => resetGame("PVP")}
          >
            <Text style={styles.menuBtnText}>👥 vs 👥 Joueurs</Text>
          </TouchableOpacity>

          <Text style={{ color: "#fff", marginTop: 20 }}>Qui commence ?</Text>

          <View style={{ flexDirection: "row", marginVertical: 10 }}>
            <TouchableOpacity
              style={[styles.menuBtn, { width: 120 }]}
              onPress={() => resetGame("PVE", "Bleu")}
            >
              <Text style={styles.menuBtnText}>👤 Bleu</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.menuBtn,
                { width: 120, backgroundColor: "#c0392b" },
              ]}
              onPress={() => resetGame("PVE", "Rouge")}
            >
              <Text style={styles.menuBtnText}>🤖 Rouge</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Text style={styles.title}>Fanoron-telo</Text>

      <View style={styles.statusCard}>
        {hasWinner ? (
          <Text style={styles.winnerMsg}>
            VICTOIRE : {currentPlayer.toUpperCase()}
          </Text>
        ) : (
          <>
            <Text
              style={[
                styles.turnText,
                { color: currentPlayer === "Bleu" ? "#3498db" : "#e74c3c" },
              ]}
            >
              Tour : {currentPlayer}{" "}
              {gameMode === "PVE" && currentPlayer === "Rouge" ? "(IA...)" : ""}
            </Text>
            <View style={styles.moveIndicatorContainer}>
              <Text style={styles.miniLabel}>Pions activés : </Text>
              {movedStatus[currentPlayer].map((moved, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.dot,
                    { backgroundColor: moved ? "#27ae60" : "#bdc3c7" },
                  ]}
                />
              ))}
            </View>
          </>
        )}
      </View>

      <View style={styles.boardContainer}>
        <View style={styles.lineH} />
        <View style={[styles.lineH, { top: "50%" }]} />
        <View style={[styles.lineH, { top: "100%" }]} />
        <View style={styles.lineV} />
        <View style={[styles.lineV, { left: "50%" }]} />
        <View style={[styles.lineV, { left: "100%" }]} />
        <View style={styles.diagL} />
        <View style={styles.diagR} />

        {board.map((cell, i) => (
          <TouchableOpacity
            key={i}
            style={[
              styles.intersection,
              styles[`pos${i}` as keyof typeof styles],
              selectedPiece === i && styles.selectedSpot,
            ]}
            onPress={() => handlePress(i)}
            disabled={hasWinner}
          >
            {cell && (
              <View
                style={[
                  styles.pawn,
                  {
                    backgroundColor:
                      cell.player === "Bleu" ? "#3498db" : "#e74c3c",
                  },
                ]}
              >
                {movedStatus[cell.player][cell.id] && (
                  <View style={styles.movedIndicator} />
                )}
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={styles.quitBtn}
        onPress={() => setGameMode(null)}
      >
        <Text style={styles.quitBtnText}>Quitter</Text>
      </TouchableOpacity>

      {/* LE RESTE DE TON RENDER NE CHANGE PAS */}
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ecf0f1",
    alignItems: "center",
    justifyContent: "center",
  },
  menuContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#34495e",
  },
  menuTitle: {
    fontSize: 40,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 50,
  },
  menuBtn: {
    backgroundColor: "#3498db",
    padding: 20,
    borderRadius: 15,
    width: "80%",
    marginVertical: 10,
    alignItems: "center",
  },
  menuBtnText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#2c3e50",
    marginBottom: 20,
  },
  statusCard: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 15,
    alignItems: "center",
    elevation: 4,
    marginBottom: 40,
    width: "85%",
    height: 100,
    justifyContent: "center",
  },
  turnText: { fontSize: 20, fontWeight: "bold" },
  winnerMsg: { fontSize: 22, fontWeight: "bold", color: "#27ae60" },
  moveIndicatorContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },
  miniLabel: { fontSize: 12, color: "#7f8c8d" },
  dot: { width: 10, height: 10, borderRadius: 5, marginHorizontal: 3 },
  boardContainer: { width: 280, height: 280, position: "relative" },
  lineH: {
    position: "absolute",
    width: "100%",
    height: 3,
    backgroundColor: "#95a5a6",
    top: 0,
  },
  lineV: {
    position: "absolute",
    width: 3,
    height: "100%",
    backgroundColor: "#95a5a6",
    left: 0,
  },
  diagL: {
    position: "absolute",
    width: "141%",
    height: 3,
    backgroundColor: "#95a5a6",
    top: 0,
    left: 0,
    transform: [{ rotate: "45deg" }],
    transformOrigin: "0% 0%",
  },
  diagR: {
    position: "absolute",
    width: "141%",
    height: 3,
    backgroundColor: "#95a5a6",
    top: 0,
    right: 0,
    transform: [{ rotate: "-45deg" }],
    transformOrigin: "100% 0%",
  },
  intersection: {
    position: "absolute",
    width: 60,
    height: 60,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
    transform: [{ translateX: -30 }, { translateY: -30 }],
  },
  selectedSpot: {
    backgroundColor: "rgba(46, 204, 113, 0.4)",
    borderRadius: 30,
    borderWidth: 2,
    borderColor: "#2ecc71",
  },
  pawn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    elevation: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  movedIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.7)",
  },
  pos0: { top: 0, left: 0 },
  pos1: { top: 0, left: "50%" },
  pos2: { top: 0, left: "100%" },
  pos3: { top: "50%", left: 0 },
  pos4: { top: "50%", left: "50%" },
  pos5: { top: "50%", left: "100%" },
  pos6: { top: "100%", left: 0 },
  pos7: { top: "100%", left: "50%" },
  pos8: { top: "100%", left: "100%" },
  quitBtn: { marginTop: 50, padding: 12 },
  quitBtnText: {
    color: "#7f8c8d",
    fontSize: 16,
    textDecorationLine: "underline",
  },
});
