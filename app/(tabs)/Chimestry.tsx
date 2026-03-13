import React, { useState, useEffect } from "react";
import {
  View, Text, Pressable, ScrollView, StyleSheet, SafeAreaView, TouchableOpacity
} from "react-native";
import Svg, { Path } from "react-native-svg";

const EMPTY = 0;
const P1 = 1; 
const P2 = 2; 
const CELL_SIZE = 32;

export default function ChemistryGame() {
  const [size, setSize] = useState(12); // Taille initiale
  const [grid, setGrid] = useState(null);
  const [player, setPlayer] = useState(P1);
  const [isAiMode, setIsAiMode] = useState(null);
  const [territories, setTerritories] = useState([]);
  const [capturedSet, setCapturedSet] = useState(new Set());
  const [score, setScore] = useState({ p1: 0, p2: 0 });

  const initGame = (modeIA) => {
    setGrid(Array.from({ length: 12 }, () => Array(12).fill(EMPTY)));
    setIsAiMode(modeIA);
    setScore({ p1: 0, p2: 0 });
    setTerritories([]);
    setCapturedSet(new Set());
    setPlayer(P1);
  };

  const expandGrid = (currentGrid) => {
    const newSize = size + 4;
    const newGrid = Array.from({ length: newSize }, () => Array(newSize).fill(EMPTY));
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) newGrid[y][x] = currentGrid[y][x];
    }
    setSize(newSize);
    setGrid(newGrid);
  };

  const handlePress = (x, y) => {
    if (!grid || grid[y][x] !== EMPTY) return;

    const newGrid = grid.map(r => [...r]);
    newGrid[y][x] = player;

    const captureResult = detectCapture(newGrid, x, y, player, capturedSet);
    
    if (captureResult.cycle) {
      setTerritories(prev => [...prev, { points: captureResult.cycle, owner: player }]);
      
      if (captureResult.newlyCapturedPoints.length > 0) {
        const newCapturedSet = new Set(capturedSet);
        captureResult.newlyCapturedPoints.forEach(ptKey => newCapturedSet.add(ptKey));
        setCapturedSet(newCapturedSet);

        setScore(s => ({
          ...s,
          [player === P1 ? 'p1' : 'p2']: s[player === P1 ? 'p1' : 'p2'] + captureResult.newlyCapturedPoints.length
        }));
      }
    }

    if (newGrid.every(row => row.every(c => c !== EMPTY))) {
      expandGrid(newGrid);
    } else {
      setGrid(newGrid);
    }
    setPlayer(player === P1 ? P2 : P1);
  };

  const renderCurvePath = (points) => {
    if (!points || points.length < 3) return "";
    const pts = points.map(p => ({ x: p.x * CELL_SIZE + CELL_SIZE/2, y: p.y * CELL_SIZE + CELL_SIZE/2 }));
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length; i++) {
      const p1 = pts[(i + 1) % pts.length];
      const p2 = pts[(i + 2) % pts.length];
      d += ` Q ${p1.x} ${p1.y} ${(p1.x + p2.x) / 2} ${(p1.y + p2.y) / 2}`;
    }
    return d + " Z";
  };

  if (isAiMode === null) {
    return (
      <View style={styles.menuContainer}>
        <Text style={styles.menuTitle}>🧪 LABO-REACTION</Text>
        <TouchableOpacity style={styles.menuBtn} onPress={() => initGame(false)}>
          <Text style={styles.menuBtnText}>👤 PVP (DIAGONALES OK)</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuBtn} onPress={() => initGame(true)}>
          <Text style={styles.menuBtnText}>🤖 VS IA</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.scoreRow}>
          <Text style={[styles.pillText, player === P1 && styles.glowP1]}>P1: {score.p1}</Text>
          <TouchableOpacity style={styles.resetBtn} onPress={() => setIsAiMode(null)}>
            <Text style={styles.resetText}>QUITTER</Text>
          </TouchableOpacity>
          <Text style={[styles.pillText, player === P2 && styles.glowP2]}>{isAiMode ? "IA" : "P2"}: {score.p2}</Text>
        </View>
      </View>

      <ScrollView horizontal>
        <ScrollView>
          <View style={{ width: size * CELL_SIZE, height: size * CELL_SIZE, backgroundColor: '#020617', margin: 20 }}>
            <Svg style={StyleSheet.absoluteFill}>
              {territories.map((t, i) => (
                <Path key={i} d={renderCurvePath(t.points)} fill={t.owner === P1 ? "rgba(56, 189, 248, 0.2)" : "rgba(251, 113, 129, 0.2)"} stroke={t.owner === P1 ? "#38bdf8" : "#fb7185"} strokeWidth="2.5" />
              ))}
            </Svg>
            {grid && grid.map((row, y) => (
              <View key={y} style={styles.row}>
                {row.map((cell, x) => (
                  <Pressable key={x} onPress={() => handlePress(x, y)} style={styles.cell}>
                    <View style={styles.gridLineV} /><View style={styles.gridLineH} />
                    {cell !== EMPTY && <View style={[styles.dot, cell === P1 ? styles.dotP1 : styles.dotP2]} />}
                  </Pressable>
                ))}
              </View>
            ))}
          </View>
        </ScrollView>
      </ScrollView>
    </SafeAreaView>
  );
}

function detectCapture(grid, startX, startY, player, alreadyCaptured) {
  const opponent = player === P1 ? P2 : P1;
  
  function findCycle(x, y, px, py, path) {
    const key = `${x},${y}`;
    const idx = path.findIndex(p => p.x === x && p.y === y);
    if (idx !== -1) return path.slice(idx);
    
    // MODIFICATION : 8 DIRECTIONS (Inclus les diagonales)
    const neighbors = [
      [0, 1], [1, 0], [0, -1], [-1, 0], // Cardinaux
      [1, 1], [1, -1], [-1, 1], [-1, -1] // Diagonales
    ];
    
    for (const [dx, dy] of neighbors) {
      const nx = x + dx, ny = y + dy;
      if (nx === px && ny === py) continue;
      if (grid[ny]?.[nx] === player) {
        const cycle = findCycle(nx, ny, x, y, [...path, { x, y }]);
        if (cycle) return cycle;
      }
    }
    return null;
  }

  const cycle = findCycle(startX, startY, -1, -1, []);
  if (!cycle) return { cycle: null, newlyCapturedPoints: [] };

  let newlyCaptured = [];
  grid.forEach((row, y) => row.forEach((cell, x) => {
    if (cell === opponent) {
      const ptKey = `${x},${y}`;
      if (!alreadyCaptured.has(ptKey) && isPointInPoly({ x, y }, cycle)) newlyCaptured.push(ptKey);
    }
  }));
  return { cycle, newlyCapturedPoints: newlyCaptured };
}

function isPointInPoly(point, polygon) {
  let x = point.x, y = point.y, inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    let xi = polygon[i].x, yi = polygon[i].y, xj = polygon[j].x, yj = polygon[j].y;
    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#020617" },
  menuContainer: { flex: 1, backgroundColor: "#020617", justifyContent: "center", alignItems: "center" },
  menuTitle: { fontSize: 32, fontWeight: "bold", color: "#38bdf8", marginBottom: 40 },
  menuBtn: { width: '80%', padding: 20, borderRadius: 12, borderWidth: 1, borderColor: "#334155", marginBottom: 15, alignItems: "center" },
  menuBtnText: { color: "white", fontWeight: "600" },
  header: { padding: 15, backgroundColor: "#0f172a" },
  scoreRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  pillText: { color: "#64748b", fontSize: 18, fontWeight: "bold" },
  glowP1: { color: "#38bdf8" },
  glowP2: { color: "#fb7185" },
  resetBtn: { padding: 8, backgroundColor: "#1e293b", borderRadius: 6 },
  resetText: { color: "#94a3b8", fontSize: 12 },
  row: { flexDirection: "row" },
  cell: { width: CELL_SIZE, height: CELL_SIZE, justifyContent: "center", alignItems: "center" },
  gridLineV: { position: "absolute", width: 0.5, height: "100%", backgroundColor: "#1e293b" },
  gridLineH: { position: "absolute", width: "100%", height: 0.5, backgroundColor: "#1e293b" },
  dot: { width: 14, height: 14, borderRadius: 7, zIndex: 10 },
  dotP1: { backgroundColor: "#38bdf8" },
  dotP2: { backgroundColor: "#fb7185" },
});