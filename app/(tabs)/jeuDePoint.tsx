import React, { useEffect, useRef, useState } from "react";
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Path } from "react-native-svg";

const EMPTY = 0;
const P1 = 1;
const P2 = 2;
// Valeurs spéciales pour marquer les points capturés dans la grille
// Un point P1 capturé = 3, un point P2 capturé = 4
// Ainsi ils ne peuvent PLUS servir de maillon pour un encerclement
const P1_DEAD = 3;
const P2_DEAD = 4;

const CELL_SIZE = 36;
const INIT_SIZE = 16;
const EXPAND_BY = 8; // Ajout de lignes/colonnes à chaque extension

export default function ChemistryGame() {
  const [gridSize, setGridSize] = useState(INIT_SIZE);
  const [grid, setGrid] = useState(null);
  const [player, setPlayer] = useState(P1);
  const [isAiMode, setIsAiMode] = useState(null);
  const [territories, setTerritories] = useState([]);
  // capturedSet stocke les clés "x,y" de tous les points déjà encerclés
  const [capturedSet, setCapturedSet] = useState(new Set());
  const [score, setScore] = useState({ p1: 0, p2: 0 });
  const [gameOver, setGameOver] = useState(null); // null | "p1" | "p2" | "draw"

  const scrollRef = useRef(null);
  const hScrollRef = useRef(null);

  const initGame = (modeIA) => {
    setGrid(
      Array.from({ length: INIT_SIZE }, () => Array(INIT_SIZE).fill(EMPTY)),
    );
    setGridSize(INIT_SIZE);
    setIsAiMode(modeIA);
    setScore({ p1: 0, p2: 0 });
    setTerritories([]);
    setCapturedSet(new Set());
    setPlayer(P1);
    setGameOver(null);
  };

  useEffect(() => {
    if (isAiMode && player === P2 && !gameOver) {
      const timer = setTimeout(makeAiMove, 450);
      return () => clearTimeout(timer);
    }
  }, [player, isAiMode, grid, gameOver]);

  const makeAiMove = () => {
    if (!grid) return;
    const available = [];
    grid.forEach((row, y) =>
      row.forEach((cell, x) => {
        if (cell === EMPTY) available.push({ x, y });
      }),
    );
    if (available.length > 0) {
      const move = available[Math.floor(Math.random() * available.length)];
      doPlace(move.x, move.y);
    }
  };

  const handlePress = (x, y) => {
    if (!grid || grid[y][x] !== EMPTY || gameOver) return;
    doPlace(x, y);
  };

  // ─── LOGIQUE CENTRALE ────────────────────────────────────────────────────
  const doPlace = (x, y) => {
    if (!grid || grid[y][x] !== EMPTY) return;

    let newGrid = grid.map((r) => [...r]);
    newGrid[y][x] = player;

    // Détecte si ce coup crée un encerclement
    const result = detectCapture(newGrid, x, y, player);

    let newCapturedSet = new Set(capturedSet);
    let newTerritories = [...territories];
    let scoreDelta = 0;

    if (result.newlyCapturedPoints.length > 0) {
      newTerritories = [
        ...territories,
        { points: result.cycle, owner: player },
      ];

      // CORRECTION BUG 1 :
      // On marque les points capturés comme "morts" dans la grille
      // → ils conservent leur couleur visuelle mais ne peuvent plus
      //   servir de maillon pour un futur encerclement
      result.newlyCapturedPoints.forEach((ptKey) => {
        newCapturedSet.add(ptKey);
        const [cx, cy] = ptKey.split(",").map(Number);
        // Marque selon qui était le propriétaire original
        newGrid[cy][cx] = newGrid[cy][cx] === P1 ? P1_DEAD : P2_DEAD;
      });

      scoreDelta = result.newlyCapturedPoints.length;
    }

    const nextPlayer = player === P1 ? P2 : P1;

    // CORRECTION BUG 2 :
    // Vérifie si la grille est entièrement remplie (aucune case EMPTY)
    const isFull = newGrid.every((row) => row.every((c) => c !== EMPTY));

    if (isFull) {
      // Calcule les scores finaux AVANT d'agrandir
      const finalP1 = score.p1 + (player === P1 ? scoreDelta : 0);
      const finalP2 = score.p2 + (player === P2 ? scoreDelta : 0);

      if (finalP1 > finalP2) {
        setGameOver("p1");
      } else if (finalP2 > finalP1) {
        setGameOver("p2");
      } else {
        // Égalité → on agrandit la grille
        const newSize = gridSize + EXPAND_BY;
        const expandedGrid = Array.from({ length: newSize }, (_, row) =>
          Array.from({ length: newSize }, (_, col) => {
            if (row < gridSize && col < gridSize) return newGrid[row][col];
            return EMPTY;
          }),
        );
        setGridSize(newSize);
        setGrid(expandedGrid);
        setTerritories(newTerritories);
        setCapturedSet(newCapturedSet);
        setScore({ p1: finalP1, p2: finalP2 });
        setPlayer(nextPlayer);
        return;
      }
    }

    setGrid(newGrid);
    setTerritories(newTerritories);
    setCapturedSet(newCapturedSet);
    setScore((s) => ({
      p1: s.p1 + (player === P1 ? scoreDelta : 0),
      p2: s.p2 + (player === P2 ? scoreDelta : 0),
    }));
    setPlayer(nextPlayer);
  };

  // ─── RENDU SVG TERRITOIRE — OVALE DOUX ───────────────────────────────
  // Algorithme : Catmull-Rom → Bézier cubique sur TOUS les segments.
  // Chaque segment est courbé vers l'extérieur du centroïde du cycle,
  // ce qui donne une forme ovale/bulle même sur des cycles orthogonaux.
  const renderTerritoryPath = (points) => {
    if (!points || points.length < 3) return "";

    const n = points.length;

    // Centre pixel de chaque point de la grille
    const ptx = (p) => p.x * CELL_SIZE + CELL_SIZE / 2;
    const pty = (p) => p.y * CELL_SIZE + CELL_SIZE / 2;

    // Centroïde du polygone → pour pousser les tangentes vers l'extérieur
    const cx = points.reduce((s, p) => s + ptx(p), 0) / n;
    const cy = points.reduce((s, p) => s + pty(p), 0) / n;

    // Tension Catmull-Rom : plus c'est grand, plus la courbe "gonfle"
    // 0.4 donne un bel ovale sans trop exagérer
    const TENSION = 0.4;

    // Conversion Catmull-Rom → Bézier cubique :
    // Pour le segment P[i] → P[i+1], les points de contrôle sont :
    //   CP1 = P[i]  + TENSION * (P[i+1] - P[i-1])
    //   CP2 = P[i+1] - TENSION * (P[i+2] - P[i])
    const get = (i) => {
      const p = points[((i % n) + n) % n];
      return { x: ptx(p), y: pty(p) };
    };

    // Point de départ : milieu entre P[n-1] et P[0] pour boucler proprement
    const start = {
      x: (get(n - 1).x + get(0).x) / 2,
      y: (get(n - 1).y + get(0).y) / 2,
    };
    let d = `M ${start.x} ${start.y}`;

    for (let i = 0; i < n; i++) {
      const p0 = get(i - 1); // précédent
      const p1 = get(i); // courant
      const p2 = get(i + 1); // suivant
      const p3 = get(i + 2); // après-suivant

      // Points de contrôle Catmull-Rom
      const cp1x = p1.x + TENSION * (p2.x - p0.x);
      const cp1y = p1.y + TENSION * (p2.y - p0.y);
      const cp2x = p2.x - TENSION * (p3.x - p1.x);
      const cp2y = p2.y - TENSION * (p3.y - p1.y);

      d += ` C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${p2.x} ${p2.y}`;
    }

    return d + " Z";
  };

  // ─── COULEUR VISUELLE D'UN POINT ──────────────────────────────────────
  // Les points morts gardent une couleur atténuée pour montrer qu'ils sont capturés
  const getDotStyle = (cell) => {
    if (cell === P1) return [styles.dot, styles.dotP1];
    if (cell === P2) return [styles.dot, styles.dotP2];
    if (cell === P1_DEAD) return [styles.dot, styles.dotP1Dead];
    if (cell === P2_DEAD) return [styles.dot, styles.dotP2Dead];
    return null;
  };

  // ─── ÉCRAN MENU ───────────────────────────────────────────────────────
  if (isAiMode === null) {
    return (
      <View style={styles.menuContainer}>
        <Text style={styles.menuTitle}>🧪 LABO-RÉACTION</Text>
        <Text style={styles.menuSub}>Encerclez les points adverses</Text>

        <View style={styles.menuRules}>
          <Text style={styles.menuRuleText}>
            • Posez vos points sur la grille
          </Text>
          <Text style={styles.menuRuleText}>
            • Formez un cycle fermé autour des points adverses
          </Text>
          <Text style={styles.menuRuleText}>
            • Les points capturés 🔒 ne peuvent plus être utilisés
          </Text>
          <Text style={styles.menuRuleText}>
            • Si égalité quand la grille est pleine → extension
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.menuBtn, { borderColor: "#38bdf8" }]}
          onPress={() => initGame(false)}
        >
          <Text style={styles.menuBtnText}>👤 JOUEUR VS JOUEUR</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.menuBtn, { borderColor: "#fb7185" }]}
          onPress={() => initGame(true)}
        >
          <Text style={styles.menuBtnText}>🤖 JOUEUR VS IA</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── ÉCRAN FIN DE PARTIE ──────────────────────────────────────────────
  if (gameOver) {
    const isP1Win = gameOver === "p1";
    return (
      <View style={styles.menuContainer}>
        <Text style={styles.winEmoji}>{isP1Win ? "🔵" : "🔴"}</Text>
        <Text style={styles.winTitle}>
          {isP1Win ? "P1 GAGNE !" : isAiMode ? "IA GAGNE !" : "P2 GAGNE !"}
        </Text>
        <Text style={styles.winScore}>
          {score.p1} — {score.p2}
        </Text>
        <TouchableOpacity
          style={[styles.menuBtn, { borderColor: "#38bdf8", marginTop: 30 }]}
          onPress={() => setIsAiMode(null)}
        >
          <Text style={styles.menuBtnText}>↩ RETOUR AU MENU</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── ÉCRAN DE JEU ─────────────────────────────────────────────────────
  const boardPx = gridSize * CELL_SIZE;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header scores */}
      <View style={styles.header}>
        <View style={styles.scoreRow}>
          <View style={[styles.scorePill, player === P1 && styles.activeP1]}>
            <Text style={styles.pillText}>🔵 P1: {score.p1}</Text>
          </View>
          <View style={styles.centerInfo}>
            <TouchableOpacity
              style={styles.resetBtn}
              onPress={() => setIsAiMode(null)}
            >
              <Text style={styles.resetText}>QUITTER</Text>
            </TouchableOpacity>
            <Text style={styles.gridSizeLabel}>
              {gridSize}×{gridSize}
            </Text>
          </View>
          <View style={[styles.scorePill, player === P2 && styles.activeP2]}>
            <Text style={styles.pillText}>
              🔴 {isAiMode ? "IA" : "P2"}: {score.p2}
            </Text>
          </View>
        </View>
      </View>

      {/* Plateau scrollable dans les deux sens */}
      <ScrollView
        ref={hScrollRef}
        horizontal
        showsHorizontalScrollIndicator={true}
        bounces={false}
        style={styles.scrollOuter}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={true}
          bounces={false}
          contentContainerStyle={{ flexGrow: 1 }}
        >
          <View
            style={{
              width: boardPx + 24,
              height: boardPx + 24,
              backgroundColor: "#020617",
              padding: 12,
            }}
          >
            <View style={{ width: boardPx, height: boardPx }}>
              {/* SVG territoires */}
              <Svg
                width={boardPx}
                height={boardPx}
                style={StyleSheet.absoluteFill}
              >
                {territories.map((t, i) => (
                  <Path
                    key={i}
                    d={renderTerritoryPath(t.points)}
                    fill={
                      t.owner === P1
                        ? "rgba(56,189,248,0.15)"
                        : "rgba(251,113,129,0.15)"
                    }
                    stroke={t.owner === P1 ? "#38bdf8" : "#fb7185"}
                    strokeWidth={2}
                    strokeLinejoin="round"
                  />
                ))}
              </Svg>

              {/* Grille */}
              {grid &&
                grid.map((row, y) => (
                  <View key={y} style={styles.row}>
                    {row.map((cell, x) => {
                      const isCaptured = cell === P1_DEAD || cell === P2_DEAD;
                      const dotStyles = getDotStyle(cell);
                      return (
                        <Pressable
                          key={x}
                          onPress={() => handlePress(x, y)}
                          style={styles.cell}
                          disabled={cell !== EMPTY}
                        >
                          <View style={styles.gridLineV} />
                          <View style={styles.gridLineH} />
                          {dotStyles && (
                            <View style={dotStyles}>
                              {/* Petite croix sur les points capturés */}
                              {isCaptured && (
                                <Text style={styles.deadMark}>×</Text>
                              )}
                            </View>
                          )}
                        </Pressable>
                      );
                    })}
                  </View>
                ))}
            </View>
          </View>
        </ScrollView>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── DÉTECTION DE CYCLE (8 DIRECTIONS) ────────────────────────────────────
/**
 * CORRECTION BUG 1 :
 * On n'utilise que les cellules actives (P1 ou P2 normal, pas DEAD)
 * comme maillons du chemin. Les points morts (P1_DEAD / P2_DEAD) sont
 * ignorés lors du parcours, donc ils ne peuvent plus fermer un cycle.
 */
function detectCapture(grid, startX, startY, player) {
  const opponent = player === P1 ? P2 : P1;
  const DIRS = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ];
  const rows = grid.length;
  const cols = grid[0].length;

  let foundCycle = null;

  const initialVisited = new Set([`${startX},${startY}`]);
  const stack = [
    {
      x: startX,
      y: startY,
      px: -1,
      py: -1,
      path: [{ x: startX, y: startY }],
      visited: initialVisited,
    },
  ];

  outer: while (stack.length > 0) {
    const { x, y, px, py, path, visited } = stack.pop();

    if (path.length > 80) continue;

    for (const [dx, dy] of DIRS) {
      const nx = x + dx;
      const ny = y + dy;

      if (nx === px && ny === py) continue;

      // Fermeture du cycle
      if (nx === startX && ny === startY && path.length >= 3) {
        foundCycle = path;
        break outer;
      }

      if (ny < 0 || ny >= rows || nx < 0 || nx >= cols) continue;

      const cell = grid[ny][nx];

      // SEULS les points VIVANTS du joueur peuvent être maillons
      // P1_DEAD (3) et P2_DEAD (4) sont exclus → ils ne ferment plus de cycle
      if (cell !== player) continue;

      const nk = `${nx},${ny}`;
      if (visited.has(nk)) continue;

      const newVisited = new Set(visited);
      newVisited.add(nk);
      stack.push({
        x: nx,
        y: ny,
        px: x,
        py: y,
        path: [...path, { x: nx, y: ny }],
        visited: newVisited,
      });
    }
  }

  if (!foundCycle) return { cycle: null, newlyCapturedPoints: [] };

  // Source de vérité = valeur dans la grille.
  // cell === opponent (P1 ou P2 exactement) → vivant, capturable.
  // P1_DEAD (3) et P2_DEAD (4) → déjà morts, IGNORÉS complètement.
  // On n'utilise plus alreadyCaptured ici : si la grille dit DEAD, c'est DEAD.
  const newlyCaptured = [];
  grid.forEach((row, y) =>
    row.forEach((cell, x) => {
      if (cell === opponent && isPointInPoly({ x, y }, foundCycle)) {
        newlyCaptured.push(`${x},${y}`);
      }
    }),
  );

  return { cycle: foundCycle, newlyCapturedPoints: newlyCaptured };
}

// Ray-casting standard
function isPointInPoly(point, polygon) {
  let inside = false;
  const { x, y } = point;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x,
      yi = polygon[i].y;
    const xj = polygon[j].x,
      yj = polygon[j].y;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

// ─── STYLES ───────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#020617" },

  // Menu
  menuContainer: {
    flex: 1,
    backgroundColor: "#020617",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  menuTitle: {
    fontSize: 36,
    fontWeight: "900",
    color: "#38bdf8",
    marginBottom: 6,
    letterSpacing: 2,
  },
  menuSub: {
    fontSize: 13,
    color: "#475569",
    marginBottom: 20,
  },
  menuRules: {
    backgroundColor: "#0f172a",
    borderRadius: 12,
    padding: 14,
    width: "85%",
    marginBottom: 28,
    gap: 5,
  },
  menuRuleText: { color: "#64748b", fontSize: 12, lineHeight: 20 },
  menuBtn: {
    width: "80%",
    padding: 18,
    borderRadius: 14,
    borderWidth: 2,
    marginBottom: 14,
    alignItems: "center",
    backgroundColor: "#0f172a",
  },
  menuBtnText: { color: "white", fontWeight: "700", fontSize: 15 },

  // Win screen
  winEmoji: { fontSize: 64, marginBottom: 10 },
  winTitle: {
    fontSize: 32,
    fontWeight: "900",
    color: "#f8fafc",
    marginBottom: 8,
  },
  winScore: { fontSize: 22, color: "#94a3b8", fontWeight: "600" },

  // Header
  header: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: "#0f172a",
  },
  scoreRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  scorePill: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: "#1e293b",
    minWidth: 90,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  activeP1: { borderColor: "#38bdf8" },
  activeP2: { borderColor: "#fb7185" },
  pillText: { color: "white", fontWeight: "bold", fontSize: 13 },
  centerInfo: { alignItems: "center", gap: 4 },
  resetBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "#334155",
    borderRadius: 6,
  },
  resetText: { color: "#94a3b8", fontSize: 11, fontWeight: "600" },
  gridSizeLabel: { color: "#334155", fontSize: 10 },

  // Scroll
  scrollOuter: { flex: 1 },

  // Grille
  row: { flexDirection: "row" },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    justifyContent: "center",
    alignItems: "center",
  },
  gridLineV: {
    position: "absolute",
    width: 1,
    height: "100%",
    backgroundColor: "#1e293b",
  },
  gridLineH: {
    position: "absolute",
    width: "100%",
    height: 1,
    backgroundColor: "#1e293b",
  },

  // Points
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    zIndex: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  dotP1: {
    backgroundColor: "#38bdf8",
    shadowColor: "#38bdf8",
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
  },
  dotP2: {
    backgroundColor: "#fb7185",
    shadowColor: "#fb7185",
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
  },
  // Points capturés → couleur atténuée + croix
  dotP1Dead: {
    backgroundColor: "#0e4a6e",
    borderWidth: 1,
    borderColor: "#38bdf8",
  },
  dotP2Dead: {
    backgroundColor: "#6e1a2a",
    borderWidth: 1,
    borderColor: "#fb7185",
  },
  deadMark: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 10,
    fontWeight: "900",
    lineHeight: 12,
  },
});
