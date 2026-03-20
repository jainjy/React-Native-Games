/**
 * Composants UI du jeu Fanorona
 * ScoreCard, CaptureChoicePanel, Legend, RulesPanel, HistoryPanel
 */

import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { RED, DARK, Move, PendingChoice } from "../hooks/useFanorona";

// ─── SCORE CARD ────────────────────────────────────────────────────────────
export const ScoreCard = ({
  label, count, wins, dotColor, active,
}: {
  label: string; count: number; wins: number;
  dotColor: string; active: boolean;
}) => (
  <View style={[S.scoreCard, active && S.scoreActive]}>
    <View style={[S.scoreDot, { backgroundColor: dotColor }]} />
    <Text style={S.scoreLabel}>{label}</Text>
    <Text style={[S.scoreNum, { color: dotColor }]}>{count}</Text>
    <Text style={S.scoreWins}>{wins}W</Text>
  </View>
);

// ─── CAPTURE CHOICE PANEL ─────────────────────────────────────────────────
export const CaptureChoicePanel = ({
  appMove, retMove, onChoose, onCancel,
}: {
  appMove: Move; retMove: Move;
  onChoose: (m: Move) => void;
  onCancel: () => void;
}) => (
  <View style={S.choicePanel}>
    <Text style={S.choiceTitle}>⚔️ Choisir le type de capture</Text>
    <View style={S.choiceRow}>
      <TouchableOpacity
        style={[S.choiceBtn, S.choiceBtnRed]}
        onPress={() => onChoose(appMove)}
      >
        <Text style={S.choiceBtnIcon}>⬆</Text>
        <Text style={S.choiceBtnLabel}>Approche</Text>
        <Text style={S.choiceBtnCount}>
          -{appMove.captured.length} pièce{appMove.captured.length > 1 ? "s" : ""}
        </Text>
        <View style={S.choiceVictimRow}>
          {appMove.captured.map((_, i) => (
            <View key={i} style={[S.choiceVictimDot, { backgroundColor: "#EF4444" }]} />
          ))}
        </View>
        <Text style={S.choiceBtnSub}>(devant)</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[S.choiceBtn, S.choiceBtnBlue]}
        onPress={() => onChoose(retMove)}
      >
        <Text style={S.choiceBtnIcon}>⬇</Text>
        <Text style={S.choiceBtnLabel}>Retrait</Text>
        <Text style={S.choiceBtnCount}>
          -{retMove.captured.length} pièce{retMove.captured.length > 1 ? "s" : ""}
        </Text>
        <View style={S.choiceVictimRow}>
          {retMove.captured.map((_, i) => (
            <View key={i} style={[S.choiceVictimDot, { backgroundColor: "#3B82F6" }]} />
          ))}
        </View>
        <Text style={S.choiceBtnSub}>(derrière)</Text>
      </TouchableOpacity>
    </View>
    <TouchableOpacity style={S.choiceCancelBtn} onPress={onCancel}>
      <Text style={S.choiceCancelTxt}>Annuler</Text>
    </TouchableOpacity>
  </View>
);

// ─── LEGEND ───────────────────────────────────────────────────────────────
const LegItem = ({
  color, border, label, dashed,
}: {
  color: string; border: string; label: string; dashed?: boolean;
}) => (
  <View style={S.legItem}>
    <View style={[S.legDot, {
      backgroundColor: color,
      borderColor: border,
      borderStyle: dashed ? "dashed" : "solid",
    }]} />
    <Text style={S.legTxt}>{label}</Text>
  </View>
);

export const Legend = () => (
  <>
    <View style={S.legendRow}>
      <LegItem color="rgba(34,197,94,0.4)" border="#16A34A" label="Paika" />
      <LegItem color="rgba(239,68,68,0.4)" border="#EF4444" label="Capture" />
      <LegItem color="rgba(249,115,22,0.45)" border="#F97316" label="Chaîne" />
    </View>
    <View style={S.legendRow}>
      <LegItem color="rgba(239,68,68,0.18)" border="#EF4444" label="Victime approche" dashed />
      <LegItem color="rgba(59,130,246,0.18)" border="#3B82F6" label="Victime retrait" dashed />
    </View>
  </>
);

// ─── RULES PANEL ──────────────────────────────────────────────────────────
const RC = ({
  icon, title, color, text,
}: {
  icon: string; title: string; color: string; text: string;
}) => (
  <View style={[S.ruleCard, { borderLeftColor: color }]}>
    <Text style={[S.ruleTitle, { color }]}>{icon} {title}</Text>
    <Text style={S.ruleTxt}>{text}</Text>
  </View>
);

export const RulesPanel = () => (
  <View style={S.rulesWrap}>
    <Text style={S.rulesH}>📋 Règles Complètes</Text>
    <RC icon="🎯" title="Objectif" color="#2563EB"
      text="Capturer toutes les pièces adverses ou bloquer l'adversaire." />
    <RC icon="🏁" title="Position Initiale" color="#7C3AED"
      text={"Rangées 1-2 (haut): Noirs\nRangée 3 milieu: N R N R VIDE N R N R\nRangées 4-5 (bas): Rouges\n22 pièces chacun. Rouge commence."} />
    <RC icon="♟" title="Déplacement" color="#059669"
      text={"Une case vers intersection adjacente libre.\nHorizontal, vertical ou diagonal selon les lignes."} />
    <RC icon="⬆" title="Capture par Approche" color="#DC2626"
      text={"Avancez VERS l'ennemi → toutes les pièces ennemies consécutives devant sont capturées."} />
    <RC icon="⬇" title="Capture par Retrait" color="#3B82F6"
      text={"Éloignez-vous de l'ennemi → toutes les pièces ennemies consécutives derrière sont capturées."} />
    <RC icon="🔗" title="Capture en Chaîne" color="#7C3AED"
      text={"Après capture, même pièce peut continuer.\n✗ Pas de retour arrière\n✗ Pas même direction + même type\n→ Toucher sa pièce = fin de chaîne"} />
    <RC icon="🕊" title="Coup Paika" color="#6B7280"
      text="Si aucune capture possible: déplacement simple vers case adjacente libre." />
    <RC icon="⚠️" title="Capture Obligatoire" color="#DC2626"
      text="Si une capture existe → OBLIGATOIRE. Pas de Paika possible." />
  </View>
);

// ─── HISTORY PANEL ────────────────────────────────────────────────────────
export const HistoryPanel = ({ history }: { history: Move[] }) => {
  if (history.length === 0) return null;
  return (
    <View style={S.hist}>
      <Text style={S.histTitle}>Historique</Text>
      {[...history].reverse().slice(0, 8).map((m, i) => (
        <Text key={i} style={S.histItem}>
          {m.type === "paika" ? "🕊️" : "⚔️"}{" "}
          ({m.from[0]},{m.from[1]})→({m.to[0]},{m.to[1]}){" "}
          {m.captured?.length > 0 ? `-${m.captured.length}p` : ""}{" "}
          <Text style={S.histType}>{m.type}</Text>
        </Text>
      ))}
    </View>
  );
};

// ─── STYLES ───────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  scoreCard: {
    flex: 1, alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 14, padding: 10,
    borderWidth: 1.5, borderColor: "rgba(255,255,255,0.12)",
  },
  scoreActive: {
    borderColor: "#FFD700",
    backgroundColor: "rgba(255,215,0,0.12)",
    shadowColor: "#FFD700", shadowOpacity: 0.4,
    shadowRadius: 10, elevation: 5,
  },
  scoreDot: { width: 16, height: 16, borderRadius: 8, marginBottom: 3 },
  scoreLabel: { fontSize: 12, color: "rgba(255,255,255,0.65)", fontWeight: "600" },
  scoreNum: { fontSize: 26, fontWeight: "800" },
  scoreWins: { fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 1 },

  choicePanel: {
    width: "100%",
    backgroundColor: "rgba(20,12,5,0.85)",
    borderRadius: 14, padding: 14, marginBottom: 10,
    borderWidth: 1.5, borderColor: "rgba(200,160,60,0.3)",
    shadowColor: "#000", shadowOpacity: 0.4,
    shadowRadius: 12, elevation: 6,
  },
  choiceTitle: {
    fontSize: 14, fontWeight: "700",
    color: "rgba(255,230,160,0.95)",
    textAlign: "center", marginBottom: 12,
  },
  choiceRow: { flexDirection: "row", gap: 10, marginBottom: 8 },
  choiceBtn: {
    flex: 1, borderRadius: 10, padding: 12,
    alignItems: "center", borderWidth: 2,
  },
  choiceBtnRed: {
    backgroundColor: "rgba(239,68,68,0.12)",
    borderColor: "#EF4444",
  },
  choiceBtnBlue: {
    backgroundColor: "rgba(59,130,246,0.12)",
    borderColor: "#3B82F6",
  },
  choiceBtnIcon: { fontSize: 22, marginBottom: 2 },
  choiceBtnLabel: { fontSize: 14, fontWeight: "700", color: "#FFF", marginBottom: 2 },
  choiceBtnCount: { fontSize: 13, fontWeight: "600", color: "rgba(255,255,255,0.6)", marginBottom: 6 },
  choiceVictimRow: {
    flexDirection: "row", gap: 4, flexWrap: "wrap",
    justifyContent: "center", marginBottom: 4,
  },
  choiceVictimDot: { width: 10, height: 10, borderRadius: 5 },
  choiceBtnSub: { fontSize: 11, color: "rgba(255,255,255,0.4)" },
  choiceCancelBtn: { alignItems: "center", paddingVertical: 6 },
  choiceCancelTxt: { fontSize: 13, color: "rgba(255,255,255,0.35)" },

  legendRow: {
    flexDirection: "row", flexWrap: "wrap",
    gap: 10, marginBottom: 6, justifyContent: "center",
  },
  legItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legDot: { width: 14, height: 14, borderRadius: 7, borderWidth: 1.5 },
  legTxt: { fontSize: 11, color: "rgba(255,220,160,0.7)" },

  rulesWrap: { width: "100%", marginBottom: 16 },
  rulesH: {
    fontSize: 16, fontWeight: "700",
    color: "rgba(255,230,160,0.95)",
    marginBottom: 10, textAlign: "center",
  },
  ruleCard: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 10, padding: 12, marginBottom: 8,
    borderLeftWidth: 4,
    shadowColor: "#000", shadowOpacity: 0.15,
    shadowRadius: 4, elevation: 2,
  },
  ruleTitle: { fontSize: 14, fontWeight: "700", marginBottom: 6 },
  ruleTxt: { fontSize: 13, color: "rgba(255,220,170,0.8)", lineHeight: 21 },

  hist: {
    width: "100%",
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 10, padding: 12,
    borderWidth: 0.5, borderColor: "rgba(200,160,60,0.2)",
  },
  histTitle: {
    fontSize: 12, fontWeight: "700",
    color: "rgba(200,160,60,0.8)", marginBottom: 6,
  },
  histItem: { fontSize: 12, color: "rgba(255,200,150,0.7)", paddingVertical: 2 },
  histType: { color: "rgba(255,255,255,0.3)", fontSize: 11 },
});
