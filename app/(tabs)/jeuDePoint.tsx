// FARINTANY — Jeu traditionnel malgasy
// Règles : encercler les pions adverses pour les capturer.
// Un pion capturé est mort (ne peut plus faire partie d'un cycle).
// Territoire créé UNIQUEMENT si le cycle encercle ≥ 1 pion adverse.

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
} from "react-native";
import Svg, { Path, Line, Circle } from "react-native-svg";

// ── Constantes ────────────────────────────────────────────────────────────────
const EMPTY = 0,
  P1 = 1,
  P2 = 2;
const CELL = 38,
  SIZE = 12,
  MAX_D = 28;
const D8 = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];
const C_BG = "#0d0d0e",
  C_HDR = "#0f172a",
  C_GRID = "#1e293b";
const C_P1 = "#38bdf8",
  C_P2 = "#fb7185";
const F_P1 = "rgba(56,189,248,0.18)",
  F_P2 = "rgba(251,113,129,0.18)";
const BPX = SIZE * CELL;
const K = (x, y) => `${x},${y}`;

// ── Algorithme : détection de cycle ──────────────────────────────────────────
// Valide UNIQUEMENT quand le DFS revient au point de départ exact (≥3 pions).
// Les cellules capturées (mortes) sont ignorées → pas de superposition.
function findCycle(grid, sx, sy, player, captured) {
  if (captured.has(K(sx, sy))) return null;
  const rows = grid.length,
    cols = grid[0].length;
  const vis = new Set([K(sx, sy)]),
    path = [{ x: sx, y: sy }];

  function dfs(x, y, fx, fy) {
    if (path.length > MAX_D) return null;
    for (const [dx, dy] of D8) {
      const nx = x + dx,
        ny = y + dy;
      if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) continue;
      if (nx === fx && ny === fy) continue;
      if (nx === sx && ny === sy && path.length >= 3) return [...path]; // cycle !
      const k = K(nx, ny);
      if (captured.has(k) || grid[ny][nx] !== player || vis.has(k)) continue;
      vis.add(k);
      path.push({ x: nx, y: ny });
      const r = dfs(nx, ny, x, y);
      if (r) return r;
      path.pop();
      vis.delete(k);
    }
    return null;
  }
  return dfs(sx, sy, -1, -1);
}

// ── Ray-casting : point dans un polygone ─────────────────────────────────────
function inPoly(px, py, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const { x: xi, y: yi } = poly[i],
      { x: xj, y: yj } = poly[j];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi)
      inside = !inside;
  }
  return inside;
}

// ── Application d'un coup (pure) ─────────────────────────────────────────────
function applyMove(grid, x, y, player, captured, terrs) {
  const newGrid = grid.map((r) => [...r]);
  newGrid[y][x] = player;
  const cycle = findCycle(newGrid, x, y, player, captured);
  let newTerrs = [...terrs],
    newCap = captured,
    pts = 0;

  if (cycle) {
    const opp = player === P1 ? P2 : P1;
    const caps = [];
    newGrid.forEach((row, ry) =>
      row.forEach((cell, rx) => {
        const k = K(rx, ry);
        if (cell === opp && !captured.has(k) && inPoly(rx, ry, cycle))
          caps.push(k);
      }),
    );
    if (caps.length > 0) {
      newTerrs = [...terrs, { cycle, owner: player }];
      newCap = new Set(captured);
      caps.forEach((k) => newCap.add(k));
      pts = caps.length;
    }
  }
  return { newGrid, newTerrs, newCap, pts };
}

// ── IA : évaluation + choix du meilleur coup ─────────────────────────────────
function evalMove(grid, x, y, captured) {
  let score = 0;
  const g2 = grid.map((r) => [...r]);
  g2[y][x] = P2;

  // Attaque directe
  const c2 = findCycle(g2, x, y, P2, captured);
  if (c2) {
    const caps = [];
    g2.forEach((row, ry) =>
      row.forEach((cell, rx) => {
        if (cell === P1 && !captured.has(K(rx, ry)) && inPoly(rx, ry, c2))
          caps.push(1);
      }),
    );
    if (caps.length) score += caps.length * 50;
  }

  // Connectivité + pions P1 proches
  for (const [dx, dy] of D8) {
    const nx = x + dx,
      ny = y + dy;
    if (nx < 0 || nx >= SIZE || ny < 0 || ny >= SIZE) continue;
    if (g2[ny][nx] === P2) score += 5;
    if (g2[ny][nx] === P1 && !captured.has(K(nx, ny))) score += 20;
  }

  // Réponse de P1 (look-ahead)
  let threat = 0;
  grid.forEach((row, ry) =>
    row.forEach((_, rx) => {
      if (g2[ry][rx] !== EMPTY) return;
      const gP1 = g2.map((r) => [...r]);
      gP1[ry][rx] = P1;
      const cP1 = findCycle(gP1, rx, ry, P1, captured);
      if (!cP1) return;
      let n = 0;
      gP1.forEach((row2, ry2) =>
        row2.forEach((cell, rx2) => {
          if (
            cell === P2 &&
            !captured.has(K(rx2, ry2)) &&
            inPoly(rx2, ry2, cP1)
          )
            n++;
        }),
      );
      if (n > threat) threat = n;
    }),
  );
  score -= threat * 8;

  // Défense
  const gDef = grid.map((r) => [...r]);
  gDef[y][x] = P1;
  const cDef = findCycle(gDef, x, y, P1, captured);
  if (cDef) {
    let n = 0;
    gDef.forEach((row, ry) =>
      row.forEach((cell, rx) => {
        if (cell === P2 && !captured.has(K(rx, ry)) && inPoly(rx, ry, cDef))
          n++;
      }),
    );
    if (n > 0) score += n * 15;
  }

  return score;
}

function aiPick(grid, captured) {
  const cands = [];
  grid.forEach((row, y) =>
    row.forEach((cell, x) => {
      if (cell !== EMPTY) return;
      cands.push({ x, y, score: evalMove(grid, x, y, captured) });
    }),
  );
  if (!cands.length) return null;
  cands.sort((a, b) => b.score - a.score);
  const best = cands[0].score;
  const top = cands.filter(
    (c) => c.score >= best - Math.max(1, Math.abs(best) * 0.05),
  );
  return top[Math.floor(Math.random() * top.length)];
}

// ── Chemin SVG lisse pour les territoires ────────────────────────────────────
function bubble(poly) {
  if (!poly || poly.length < 2) return "";
  const pts = poly.map((p) => ({
    x: p.x * CELL + CELL / 2,
    y: p.y * CELL + CELL / 2,
  }));
  const n = pts.length,
    mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  const s = mid(pts[n - 1], pts[0]);
  let d = `M ${s.x} ${s.y}`;
  for (let i = 0; i < n; i++) {
    const e = mid(pts[i], pts[(i + 1) % n]);
    d += ` Q ${pts[i].x} ${pts[i].y} ${e.x} ${e.y}`;
  }
  return d + " Z";
}

// ── Composant principal ───────────────────────────────────────────────────────
export default function jeuDePoint() {
  const [screen, setScreen] = useState("menu");
  const [isAI, setIsAI] = useState(false);
  const [grid, setGrid] = useState(null);
  const [player, setPlayer] = useState(P1);
  const [terrs, setTerrs] = useState([]);
  const [capSet, setCapSet] = useState(new Set());
  const [score, setScore] = useState({ p1: 0, p2: 0 });
  const [over, setOver] = useState(false);
  const [think, setThink] = useState(false);
  const [toast, setToast] = useState(null);

  const toastT = useRef(null),
    aiT = useRef(null);
  useEffect(
    () => () => {
      clearTimeout(toastT.current);
      clearTimeout(aiT.current);
    },
    [],
  );

  const showToast = useCallback((msg, owner) => {
    clearTimeout(toastT.current);
    setToast({ msg, owner });
    toastT.current = setTimeout(() => setToast(null), 2000);
  }, []);

  const startGame = useCallback((ai) => {
    clearTimeout(aiT.current);
    setGrid(Array.from({ length: SIZE }, () => Array(SIZE).fill(EMPTY)));
    setPlayer(P1);
    setTerrs([]);
    setCapSet(new Set());
    setScore({ p1: 0, p2: 0 });
    setOver(false);
    setThink(false);
    setToast(null);
    setIsAI(ai);
    setScreen("game");
  }, []);

  const processMove = useCallback(
    (x, y, who, g, cs, ts) => {
      const { newGrid, newTerrs, newCap, pts } = applyMove(
        g,
        x,
        y,
        who,
        cs,
        ts,
      );
      setGrid(newGrid);
      setTerrs(newTerrs);
      setCapSet(newCap);
      if (pts > 0) {
        setScore((s) => ({
          ...s,
          [who === P1 ? "p1" : "p2"]: s[who === P1 ? "p1" : "p2"] + pts,
        }));
        showToast(`+${pts} capture${pts > 1 ? "s" : ""}`, who);
      }
      if (newGrid.every((r) => r.every((c) => c !== EMPTY))) {
        setOver(true);
        return;
      }
      setPlayer(who === P1 ? P2 : P1);
    },
    [showToast],
  );

  const handlePress = useCallback(
    (x, y) => {
      if (
        !grid ||
        over ||
        think ||
        (isAI && player === P2) ||
        grid[y][x] !== EMPTY
      )
        return;
      processMove(x, y, player, grid, capSet, terrs);
    },
    [grid, over, think, isAI, player, capSet, terrs, processMove],
  );

  // Tour IA
  useEffect(() => {
    if (!grid || !isAI || player !== P2 || over || think) return;
    const [g, cs, ts] = [grid, capSet, terrs];
    setThink(true);
    aiT.current = setTimeout(() => {
      const mv = aiPick(g, cs);
      setThink(false);
      if (!mv) {
        setOver(true);
        return;
      }
      processMove(mv.x, mv.y, P2, g, cs, ts);
    }, 500);
    return () => clearTimeout(aiT.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player, isAI, over]);

  // ── Menu ──────────────────────────────────────────────────────────────────
  if (screen === "menu")
    return (
      <View style={s.menu}>
        <Text style={s.mTitle}>FARINTANY</Text>
        <Text style={s.mSub}>Jeu traditionnel malgasy</Text>
        <Text style={s.mDesc}>
          Encerclez les pions adverses pour les capturer.{"\n"}Un pion capturé
          ne peut plus être utilisé.
        </Text>
        <TouchableOpacity style={s.mBtn} onPress={() => startGame(false)}>
          <Text style={s.mBtnT}>DEUX JOUEURS (PVP)</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.mBtn} onPress={() => startGame(true)}>
          <Text style={s.mBtnT}>CONTRE L'IA</Text>
        </TouchableOpacity>
      </View>
    );

  // ── Jeu ───────────────────────────────────────────────────────────────────
  const winner = over
    ? score.p1 > score.p2
      ? "P1"
      : score.p2 > score.p1
        ? isAI
          ? "IA"
          : "P2"
        : null
    : null;
  const turnLbl = over
    ? winner
      ? `${winner} GAGNE !`
      : "ÉGALITÉ !"
    : think
      ? "IA réfléchit…"
      : `Tour : ${player === P1 ? "P1" : isAI ? "IA" : "P2"}`;

  return (
    <SafeAreaView style={s.root}>
      {/* En-tête */}
      <View style={s.hdr}>
        <View style={[s.pill, player === P1 && !over && s.pillP1]}>
          <Text style={[s.pTxt, player === P1 && !over ? s.tP1 : s.tIdle]}>
            P1 : {score.p1}
          </Text>
        </View>
        <View style={{ alignItems: "center", gap: 6 }}>
          <Text style={s.turn}>{turnLbl}</Text>
          <TouchableOpacity
            style={s.menuSmall}
            onPress={() => {
              clearTimeout(aiT.current);
              setScreen("menu");
            }}
          >
            <Text style={s.menuSmallT}>MENU</Text>
          </TouchableOpacity>
        </View>
        <View style={[s.pill, player === P2 && !over && s.pillP2]}>
          <Text style={[s.pTxt, player === P2 && !over ? s.tP2 : s.tIdle]}>
            {isAI ? "IA" : "P2"} : {score.p2}
          </Text>
        </View>
      </View>

      {/* Plateau */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={s.board}>
            {toast && (
              <View
                style={[
                  s.toast,
                  { borderColor: toast.owner === P1 ? C_P1 : C_P2 },
                ]}
              >
                <Text
                  style={[
                    s.toastT,
                    { color: toast.owner === P1 ? C_P1 : C_P2 },
                  ]}
                >
                  {toast.msg}
                </Text>
              </View>
            )}
            <Svg width={BPX} height={BPX} style={s.svg}>
              {/* Grille */}
              {Array.from({ length: SIZE }, (_, i) => (
                <React.Fragment key={`g${i}`}>
                  <Line
                    x1={CELL / 2}
                    y1={i * CELL + CELL / 2}
                    x2={BPX - CELL / 2}
                    y2={i * CELL + CELL / 2}
                    stroke={C_GRID}
                    strokeWidth="0.6"
                  />
                  <Line
                    x1={i * CELL + CELL / 2}
                    y1={CELL / 2}
                    x2={i * CELL + CELL / 2}
                    y2={BPX - CELL / 2}
                    stroke={C_GRID}
                    strokeWidth="0.6"
                  />
                </React.Fragment>
              ))}
              {/* Territoires */}
              {terrs.map((t, i) => (
                <Path
                  key={`t${i}`}
                  d={bubble(t.cycle)}
                  fill={t.owner === P1 ? F_P1 : F_P2}
                  stroke={t.owner === P1 ? C_P1 : C_P2}
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                />
              ))}
              {/* Pions */}
              {grid &&
                grid.map((row, y) =>
                  row.map((cell, x) => {
                    if (cell === EMPTY) return null;
                    const px = x * CELL + CELL / 2,
                      py = y * CELL + CELL / 2;
                    const color = cell === P1 ? C_P1 : C_P2;
                    const dead = capSet.has(K(x, y));
                    return (
                      <React.Fragment key={`d${x}${y}`}>
                        <Circle
                          cx={px}
                          cy={py}
                          r="9"
                          fill={color}
                          opacity={dead ? "0.07" : "0.15"}
                        />
                        <Circle
                          cx={px}
                          cy={py}
                          r="5.5"
                          fill={color}
                          opacity={dead ? "0.45" : "1"}
                        />
                        {dead && (
                          <Circle
                            cx={px}
                            cy={py}
                            r="8.5"
                            fill="none"
                            stroke={color}
                            strokeWidth="1.5"
                            opacity="0.6"
                          />
                        )}
                      </React.Fragment>
                    );
                  }),
                )}
            </Svg>
            {/* Overlay tactile */}
            {grid &&
              grid.map((row, y) =>
                row.map((_, x) => (
                  <Pressable
                    key={`p${x}${y}`}
                    onPress={() => handlePress(x, y)}
                    style={{
                      position: "absolute",
                      left: x * CELL,
                      top: y * CELL,
                      width: CELL,
                      height: CELL,
                    }}
                  />
                )),
              )}
          </View>
        </ScrollView>
      </ScrollView>

      {/* Pied de page */}
      <View style={s.footer}>
        <Text style={[s.fDot, { color: C_P1 }]}>● P1</Text>
        <Text style={s.fInfo}>encercler → capturer</Text>
        <Text style={[s.fDot, { color: C_P2 }]}>● {isAI ? "IA" : "P2"}</Text>
      </View>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  // Menu
  menu: {
    flex: 1,
    backgroundColor: C_BG,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  mTitle: {
    fontSize: 36,
    fontWeight: "500",
    color: C_P1,
    letterSpacing: 3,
    marginBottom: 4,
  },
  mSub: {
    fontSize: 12,
    color: "#ccafaf",
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  mDesc: {
    fontSize: 13,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 280,
    marginBottom: 40,
  },
  mBtn: {
    width: "80%",
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C_GRID,
    backgroundColor: C_HDR,
    alignItems: "center",
    marginBottom: 12,
  },
  mBtnT: {
    color: "#cbd5e1",
    fontWeight: "500",
    fontSize: 14,
    letterSpacing: 0.8,
  },
  // Jeu
  root: { flex: 1, backgroundColor: C_BG },
  hdr: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: C_HDR,
    borderBottomWidth: 1,
    borderBottomColor: C_GRID,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  pillP1: { borderColor: C_P1 },
  pillP2: { borderColor: C_P2 },
  pTxt: { fontSize: 15, fontWeight: "500" },
  tP1: { color: C_P1 },
  tP2: { color: C_P2 },
  tIdle: { color: "#475569" },
  turn: { fontSize: 12, color: "#94a3b8", letterSpacing: 0.3 },
  menuSmall: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: "#1e293b",
    borderRadius: 5,
  },
  menuSmallT: { color: "#94a3b8", fontSize: 11, fontWeight: "500" },
  board: { margin: 16, position: "relative" },
  svg: {
    backgroundColor: C_BG,
    borderWidth: 1,
    borderColor: C_GRID,
    borderRadius: 4,
  },
  toast: {
    position: "absolute",
    top: -8,
    alignSelf: "center",
    zIndex: 20,
    backgroundColor: C_HDR,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 16,
  },
  toastT: { fontSize: 12, fontWeight: "500" },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
    paddingVertical: 8,
    backgroundColor: C_HDR,
    borderTopWidth: 1,
    borderTopColor: C_GRID,
  },
  fDot: { fontSize: 12, fontWeight: "500" },
  fInfo: { fontSize: 11, color: "#475569" },
});
