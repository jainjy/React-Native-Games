/**
 * fanorona.tsx — Écran principal redesigné
 * Design: Fond sombre mystique avec image d'arrière-plan
 * Architecture: logique → useFanorona hook, UI → composants séparés
 */

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ImageBackground,
  StatusBar,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { useFanorona, RED, DARK } from "../../hooks/useFanorona";
import { FanoronaBoard } from "../../components/FanoronaBoard";
import {
  ScoreCard,
  CaptureChoicePanel,
  Legend,
  RulesPanel,
  HistoryPanel,
} from "../../components/FanoronaUI";

export default function fanorona() {
  const {
    board,
    player,
    selected,
    hints,
    victims,
    capturingSet,
    pendingChoice,
    setPendingChoice,
    gameOver,
    winner,
    message,
    scores,
    history,
    handlePress,
    doCapture,
    resetGame,
    pieceHints,
    setHints,
    setVictims,
    performAIMove,
    isAiThinking,
  } = useFanorona();

  const [showRules, setShowRules] = useState(false);
  const [mode, setMode] = useState<"PVP" | "PVAI">("PVP");
  const AI_PLAYER = DARK;

  useEffect(() => {
    if (mode !== "PVAI") return;
    if (gameOver) return;
    if (player !== AI_PLAYER) return;
    if (pendingChoice) return;
    if (isAiThinking) return;
    performAIMove();
  }, [mode, gameOver, player, pendingChoice, isAiThinking, performAIMove]);

  const displayMessage =
    mode === "PVAI" && player === AI_PLAYER && !gameOver
      ? "🤖 IA réfléchit..."
      : message;

  return (
    <ImageBackground
      source={require("../../assets/images/dark-bg.png")}
      style={S.bg}
      resizeMode="cover"
    >
      {/* Overlay gradient pour lisibilité */}
      <LinearGradient
        colors={[
          "rgba(5,3,12,0.72)",
          "rgba(10,5,20,0.55)",
          "rgba(5,3,12,0.80)",
        ]}
        style={StyleSheet.absoluteFill}
      />

      <StatusBar barStyle="light-content" />
      <SafeAreaView style={S.safe}>
        <ScrollView
          contentContainerStyle={S.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* ── HEADER ── */}
          <View style={S.header}>
            <View style={S.titleRow}>
              <View style={S.titleAccent} />
              <Text style={S.title}>FANORONA</Text>
              <View style={S.titleBadge}>
                <Text style={S.titleBadgeTxt}>9</Text>
              </View>
            </View>
            <Text style={S.subtitle}>
              Jeu Traditionnel Malgasy · madagascar
            </Text>
            <View style={S.divider} />
          </View>

          {/* ── SCORES ── */}
          <View style={S.scoreRow}>
            <ScoreCard
              label={mode === "PVAI" ? "Joueur" : "Rouge"}
              count={board.flat().filter((c) => c === RED).length}
              wins={scores.red}
              dotColor="#D4503A"
              active={player === RED && !gameOver}
            />
            <View style={S.vsWrap}>
              <Text style={S.vs}>⚔</Text>
              {!gameOver && (
                <View
                  style={[
                    S.turnDot,
                    {
                      backgroundColor: player === RED ? "#D4503A" : "#E0E0E0",
                    },
                  ]}
                />
              )}
            </View>
            <ScoreCard
              label={mode === "PVAI" ? "IA" : "Noir"}
              count={board.flat().filter((c) => c === DARK).length}
              wins={scores.dark}
              dotColor="#C0C0C0"
              active={player === DARK && !gameOver}
            />
          </View>

          {/* ── MODE ── */}
          <View style={S.modeRow}>
            <TouchableOpacity
              style={[S.modeBtn, mode === "PVP" && S.modeBtnActive]}
              onPress={() => setMode("PVP")}
              activeOpacity={0.8}
            >
              <Text style={[S.modeTxt, mode === "PVP" && S.modeTxtActive]}>
                P1 vs P2
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[S.modeBtn, mode === "PVAI" && S.modeBtnActive]}
              onPress={() => setMode("PVAI")}
              activeOpacity={0.8}
            >
              <Text style={[S.modeTxt, mode === "PVAI" && S.modeTxtActive]}>
                Joueur vs IA
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── MESSAGE ── */}
          <View style={[S.msg, gameOver && S.msgWin]}>
            {gameOver && (
              <Text style={S.msgCrown}>{winner === RED ? "🔴" : "⚫"}</Text>
            )}
            <Text style={[S.msgTxt, gameOver && S.msgTxtWin]}>
              {displayMessage}
            </Text>
          </View>

          {/* ── PLATEAU ── */}
          <View style={S.boardWrap}>
            {/* Halo derrière le plateau */}
            <View style={S.boardGlow} />
            <FanoronaBoard
              board={board}
              selected={selected}
              hints={hints}
              victims={victims}
              capturingSet={capturingSet}
              onPress={
                mode === "PVAI" && player === AI_PLAYER ? () => {} : handlePress
              }
            />
          </View>

          {/* ── PANEL CHOIX CAPTURE ── */}
          {pendingChoice && (
            <CaptureChoicePanel
              appMove={pendingChoice.appMove}
              retMove={pendingChoice.retMove}
              onChoose={(move) => doCapture(board, move)}
              onCancel={() => {
                setPendingChoice(null);
                if (selected) {
                  const { h, victims: v } = pieceHints(
                    board,
                    player,
                    selected[0],
                    selected[1],
                  );
                  setHints(h);
                  setVictims(v);
                }
              }}
            />
          )}

          {/* ── LÉGENDE ── */}
          <View style={S.legendWrap}>
            <Legend />
          </View>

          {/* ── BOUTONS ── */}
          <View style={S.btnRow}>
            <TouchableOpacity
              style={S.btnPrimary}
              onPress={resetGame}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={["#C84B30", "#8B2500"]}
                style={S.btnGrad}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={S.btnTxtPrimary}>↺ Nouvelle Partie</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity
              style={S.btnSecondary}
              onPress={() => setShowRules((v) => !v)}
              activeOpacity={0.8}
            >
              <Text style={S.btnTxtSecondary}>
                {showRules ? "✕  Masquer" : "?  Règles"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── RÈGLES ── */}
          {showRules && <RulesPanel />}

          {/* ── HISTORIQUE ── */}
          <HistoryPanel history={history} />

          <View style={{ height: 30 }} />
        </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  bg: { flex: 1, backgroundColor: "#06030F" },
  safe: { flex: 1 },
  scroll: { padding: 14, alignItems: "center" },

  // Header
  header: { alignItems: "center", marginBottom: 14, width: "100%" },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 4,
  },
  titleAccent: {
    width: 4,
    height: 28,
    borderRadius: 2,
    backgroundColor: "#C84B30",
  },
  title: {
    fontSize: 30,
    fontWeight: "900",
    color: "#F5E6C0",
    letterSpacing: 6,
    textShadowColor: "rgba(200,75,48,0.6)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 12,
  },
  titleBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#C84B30",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#C84B30",
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 4,
  },
  titleBadgeTxt: { color: "#FFF", fontWeight: "900", fontSize: 15 },
  subtitle: {
    fontSize: 11,
    color: "rgba(200,170,100,0.6)",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  divider: {
    width: 60,
    height: 1,
    borderRadius: 1,
    backgroundColor: "rgba(200,160,60,0.35)",
    marginTop: 10,
  },

  // Scores
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 10,
    width: "100%",
  },
  vsWrap: { alignItems: "center", gap: 4 },
  vs: { fontSize: 20, color: "rgba(200,160,60,0.7)" },
  turnDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 3,
  },

  // Mode
  modeRow: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
    marginBottom: 10,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(200,160,60,0.3)",
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  modeBtnActive: {
    borderColor: "#FFD700",
    backgroundColor: "rgba(255,215,0,0.12)",
    shadowColor: "#FFD700",
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  modeTxt: {
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(200,175,120,0.9)",
    letterSpacing: 0.4,
  },
  modeTxtActive: {
    color: "#FFD700",
  },

  // Message
  msg: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 10,
    width: "100%",
    alignItems: "center",
    borderWidth: 0.5,
    borderColor: "rgba(200,160,60,0.2)",
  },
  msgWin: {
    backgroundColor: "rgba(255,215,0,0.12)",
    borderColor: "rgba(255,215,0,0.5)",
  },
  msgCrown: { fontSize: 22, marginBottom: 2 },
  msgTxt: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255,230,180,0.9)",
    textAlign: "center",
  },
  msgTxtWin: { fontSize: 15, color: "#FFD700", fontWeight: "700" },

  // Board
  boardWrap: { position: "relative", marginBottom: 10 },
  boardGlow: {
    position: "absolute",
    top: 10,
    left: 10,
    right: 10,
    bottom: 10,
    borderRadius: 14,
    backgroundColor: "transparent",
    shadowColor: "#C8932A",
    shadowOpacity: 0.5,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },

  // Legend
  legendWrap: { width: "100%", marginBottom: 12, alignItems: "center" },

  // Buttons
  btnRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
    width: "100%",
  },
  btnPrimary: {
    flex: 1,
    borderRadius: 10,
    overflow: "hidden",
    shadowColor: "#C84B30",
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 6,
  },
  btnGrad: {
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  btnTxtPrimary: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 13,
    letterSpacing: 0.5,
  },
  btnSecondary: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(200,160,60,0.3)",
  },
  btnTxtSecondary: {
    color: "rgba(200,175,120,0.9)",
    fontWeight: "600",
    fontSize: 13,
  },
});
