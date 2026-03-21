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
const CELL = 38;
// MAX_D : profondeur maximale du DFS pour trouver un cycle
const MAX_D = 28;

// ── Palette de couleurs ───────────────────────────────────────────────────────
// Fond général et en-tête
const C_BG = "#0a0a12"; // fond très sombre, bleu-nuit
const C_HDR = "#10101e"; // en-tête légèrement plus clair
const C_GRID = "#1a1a2e"; // lignes de la grille, violet très sombre

// Joueur 1 : or/ambre chaud
const C_P1 = "#f59e0b"; // ambre vif
const F_P1 = "rgba(245,158,11,0.18)"; // remplissage territoire P1

// Joueur 2 : violet électrique
const C_P2 = "#a855f7"; // violet vif
const F_P2 = "rgba(168,85,247,0.18)"; // remplissage territoire P2

// ── Directions 8-voisins ─────────────────────────────────────────────────────
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

// ── Utilitaire : clé string d'une cellule ────────────────────────────────────
const K = (x, y) => `${x},${y}`;

// ── Algorithme : détection de cycle ──────────────────────────────────────────
// DFS récursif depuis (sx,sy) pour le joueur `player`.
// Retourne le tableau de points du cycle si trouvé (≥ 3 pions), sinon null.
// Les cellules capturées (mortes) sont exclues du parcours.
function findCycle(grid, sx, sy, player, captured) {
  // Un pion capturé ne peut pas initier ou faire partie d'un cycle
  if (captured.has(K(sx, sy))) return null;
  const rows = grid.length,
    cols = grid[0].length;
  // vis : nœuds déjà visités dans ce chemin DFS
  const vis = new Set([K(sx, sy)]);
  // path : chemin courant (liste ordonnée de coords)
  const path = [{ x: sx, y: sy }];

  function dfs(x, y, fx, fy) {
    // Limite de profondeur pour éviter les cycles trop longs / perfs
    if (path.length > MAX_D) return null;
    for (const [dx, dy] of D8) {
      const nx = x + dx,
        ny = y + dy;
      if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) continue;
      // Interdire de revenir immédiatement sur le nœud parent
      if (nx === fx && ny === fy) continue;
      // Fermeture du cycle : on revient au départ avec ≥ 3 pions
      if (nx === sx && ny === sy && path.length >= 3) return [...path];
      const k = K(nx, ny);
      // Ignorer les morts, les ennemis et les déjà-visités
      if (captured.has(k) || grid[ny][nx] !== player || vis.has(k)) continue;
      vis.add(k);
      path.push({ x: nx, y: ny });
      const r = dfs(nx, ny, x, y);
      if (r) return r;
      // Backtrack
      path.pop();
      vis.delete(k);
    }
    return null;
  }
  return dfs(sx, sy, -1, -1);
}

// ── Ray-casting : point dans un polygone ─────────────────────────────────────
// Retourne true si le point (px,py) est strictement à l'intérieur de `poly`.
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

// ── Application d'un coup (pure, sans mutation d'état React) ─────────────────
// Retourne { newGrid, newTerrs, newCap, pts } :
//   newGrid  : grille mise à jour
//   newTerrs : liste des territoires (cycles + propriétaire)
//   newCap   : Set des clés capturées
//   pts      : nombre de pions capturés par ce coup (0 si aucun cycle)
function applyMove(grid, x, y, player, captured, terrs) {
  const newGrid = grid.map((r) => [...r]);
  newGrid[y][x] = player;

  // Cherche un cycle valide depuis le pion qu'on vient de poser
  const cycle = findCycle(newGrid, x, y, player, captured);
  let newTerrs = [...terrs],
    newCap = captured,
    pts = 0;

  if (cycle) {
    const opp = player === P1 ? P2 : P1;
    // Collecte les pions adverses vivants à l'intérieur du cycle
    const caps = [];
    newGrid.forEach((row, ry) =>
      row.forEach((cell, rx) => {
        const k = K(rx, ry);
        if (cell === opp && !captured.has(k) && inPoly(rx, ry, cycle))
          caps.push(k);
      }),
    );
    // Un territoire n'est créé que si au moins 1 pion est capturé
    if (caps.length > 0) {
      newTerrs = [...terrs, { cycle, owner: player }];
      newCap = new Set(captured);
      caps.forEach((k) => newCap.add(k));
      pts = caps.length;
    }
  }
  return { newGrid, newTerrs, newCap, pts };
}

// ── IA : fonction d'évaluation d'un coup ─────────────────────────────────────
// Retourne un score numérique pour le coup (x,y) joué par P2.
// Critères : capture directe, connectivité, menace adverse (look-ahead), défense.
function evalMove(grid, x, y, captured, size) {
  let score = 0;
  const g2 = grid.map((r) => [...r]);
  g2[y][x] = P2;

  // Critère 1 — Capture directe : +50 par pion P1 capturé
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

  // Critère 2 — Connectivité : bonus si on est adjacent à d'autres P2,
  //             ou proche d'un P1 vivant (cible potentielle)
  for (const [dx, dy] of D8) {
    const nx = x + dx,
      ny = y + dy;
    if (nx < 0 || nx >= size || ny < 0 || ny >= size) continue;
    if (g2[ny][nx] === P2) score += 5; // voisin allié
    if (g2[ny][nx] === P1 && !captured.has(K(nx, ny))) score += 20; // cible proche
  }

  // Critère 3 — Look-ahead : évalue la meilleure réponse possible de P1
  //             et pénalise les coups qui lui offrent une grosse capture
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
  score -= threat * 8; // Pénalité proportionnelle à la menace

  // Critère 4 — Défense : bloquer un cycle que P1 pourrait fermer ici
  const gDef = grid.map((r) => [...r]);
  gDef[y][x] = P1; // simule P1 ici
  const cDef = findCycle(gDef, x, y, P1, captured);
  if (cDef) {
    let n = 0;
    gDef.forEach((row, ry) =>
      row.forEach((cell, rx) => {
        if (cell === P2 && !captured.has(K(rx, ry)) && inPoly(rx, ry, cDef))
          n++;
      }),
    );
    if (n > 0) score += n * 15; // valeur défensive
  }

  return score;
}

// ── IA : choix du meilleur coup ──────────────────────────────────────────────
// Évalue tous les coups disponibles et retourne le meilleur {x,y}.
// Si plusieurs coups ont un score proche du max (±5%), on tire au sort parmi eux
// pour éviter un comportement trop prévisible.
function aiPick(grid, captured, size) {
  const cands = [];
  grid.forEach((row, y) =>
    row.forEach((cell, x) => {
      if (cell !== EMPTY) return;
      cands.push({ x, y, score: evalMove(grid, x, y, captured, size) });
    }),
  );
  if (!cands.length) return null;
  cands.sort((a, b) => b.score - a.score);
  const best = cands[0].score;
  // Groupe des coups "quasi-optimaux" (à ±5% du meilleur)
  const top = cands.filter(
    (c) => c.score >= best - Math.max(1, Math.abs(best) * 0.05),
  );
  return top[Math.floor(Math.random() * top.length)];
}

// ── Chemin SVG lisse pour les territoires ────────────────────────────────────
// Algorithme "bubble" : Quadratic Bézier entre les milieux de chaque segment.
// Produit une forme organique et arrondie quel que soit le polygone.
function bubble(poly) {
  if (!poly || poly.length < 2) return "";
  // Convertit les coords grille → coords pixel (centre de chaque cellule)
  const pts = poly.map((p) => ({
    x: p.x * CELL + CELL / 2,
    y: p.y * CELL + CELL / 2,
  }));
  const n = pts.length;
  const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  // Point de départ : milieu entre le dernier et le premier sommet (boucle fermée)
  const s = mid(pts[n - 1], pts[0]);
  let d = `M ${s.x} ${s.y}`;
  for (let i = 0; i < n; i++) {
    const e = mid(pts[i], pts[(i + 1) % n]);
    // Courbe quadratique : contrôle = sommet, destination = milieu suivant
    d += ` Q ${pts[i].x} ${pts[i].y} ${e.x} ${e.y}`;
  }
  return d + " Z";
}

// ── Composant principal ───────────────────────────────────────────────────────
export default function jeuDePoint() {
  // ── État de navigation ───────────────────────────────────────────────────
  const [screen, setScreen] = useState("menu");
  const [isAI, setIsAI] = useState(false);

  // ── État du jeu ──────────────────────────────────────────────────────────
  // size : taille courante de la grille (peut grandir en cas d'égalité)
  const [size, setSize] = useState(12);
  const [grid, setGrid] = useState(null);
  const [player, setPlayer] = useState(P1);
  const [terrs, setTerrs] = useState([]); // territoires visuels (cycles)
  const [capSet, setCapSet] = useState(new Set()); // pions capturés (morts)
  const [score, setScore] = useState({ p1: 0, p2: 0 });
  const [over, setOver] = useState(false); // true si partie terminée
  const [think, setThink] = useState(false); // true pendant que l'IA calcule
  const [toast, setToast] = useState(null); // notification de capture

  // Refs pour annuler les timers proprement
  const toastT = useRef(null),
    aiT = useRef(null);
  useEffect(
    () => () => {
      clearTimeout(toastT.current);
      clearTimeout(aiT.current);
    },
    [],
  );

  // ── Affichage d'une notification temporaire ──────────────────────────────
  const showToast = useCallback((msg, owner) => {
    clearTimeout(toastT.current);
    setToast({ msg, owner });
    toastT.current = setTimeout(() => setToast(null), 2000);
  }, []);

  // ── Initialisation d'une nouvelle partie ────────────────────────────────
  const startGame = useCallback((ai) => {
    clearTimeout(aiT.current);
    const initSize = 12; // taille de départ
    setSize(initSize);
    setGrid(
      Array.from({ length: initSize }, () => Array(initSize).fill(EMPTY)),
    );
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

  // ── Traitement d'un coup (commun humain & IA) ────────────────────────────
  const processMove = useCallback(
    (x, y, who, g, cs, ts, currentSize) => {
      const { newGrid, newTerrs, newCap, pts } = applyMove(
        g,
        x,
        y,
        who,
        cs,
        ts,
      );

      // Mise à jour des captures visuelles et du score
      let updatedScore = { ...score };
      if (pts > 0) {
        updatedScore = {
          ...score,
          [who === P1 ? "p1" : "p2"]: score[who === P1 ? "p1" : "p2"] + pts,
        };
        showToast(`+${pts} capture${pts > 1 ? "s" : ""}`, who);
      }

      // ── Détection grille pleine ──────────────────────────────────────────
      const isFull = newGrid.every((r) => r.every((c) => c !== EMPTY));

      if (isFull) {
        const finalP1 = updatedScore.p1;
        const finalP2 = updatedScore.p2;

        if (finalP1 === finalP2) {
          // ── ÉGALITÉ → Agrandir la grille de +4 lignes et +4 colonnes ────
          // On conserve les pions existants et on ajoute des cases vides autour
          const newSize = currentSize + 4;
          const expandedGrid = Array.from({ length: newSize }, (_, row) =>
            Array.from({ length: newSize }, (_, col) => {
              // Copie l'ancienne grille dans le coin supérieur gauche
              if (row < currentSize && col < currentSize)
                return newGrid[row][col];
              return EMPTY; // nouvelles cases vides
            }),
          );
          // Applique l'extension sans terminer la partie
          setSize(newSize);
          setGrid(expandedGrid);
          setTerrs(newTerrs);
          setCapSet(newCap);
          setScore(updatedScore);
          setPlayer(who === P1 ? P2 : P1);
          showToast("Égalité ! +4×4", null);
          return; // ← ne pas appeler setOver
        }
        // Victoire si les scores diffèrent
        setGrid(newGrid);
        setTerrs(newTerrs);
        setCapSet(newCap);
        setScore(updatedScore);
        setOver(true);
        return;
      }

      // ── Cas normal : continuer la partie ────────────────────────────────
      setGrid(newGrid);
      setTerrs(newTerrs);
      setCapSet(newCap);
      setScore(updatedScore);
      setPlayer(who === P1 ? P2 : P1);
    },
    [score, showToast],
  );

  // ── Gestion du tap humain ────────────────────────────────────────────────
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
      processMove(x, y, player, grid, capSet, terrs, size);
    },
    [grid, over, think, isAI, player, capSet, terrs, size, processMove],
  );

  // ── Tour de l'IA ─────────────────────────────────────────────────────────
  // Déclenché automatiquement quand c'est au tour de P2 en mode IA
  useEffect(() => {
    if (!grid || !isAI || player !== P2 || over || think) return;
    const [g, cs, ts, sz] = [grid, capSet, terrs, size];
    setThink(true);
    aiT.current = setTimeout(() => {
      const mv = aiPick(g, cs, sz); // calcule le meilleur coup
      setThink(false);
      if (!mv) {
        setOver(true);
        return;
      }
      processMove(mv.x, mv.y, P2, g, cs, ts, sz);
    }, 500); // délai pour laisser l'UI se mettre à jour
    return () => clearTimeout(aiT.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player, isAI, over]);

  // ── Calcul du pixel-size du plateau ─────────────────────────────────────
  const BPX_DYN = size * CELL;

  // ── Rendu : Menu ─────────────────────────────────────────────────────────
  if (screen === "menu")
    return (
      <View style={s.menu}>
        <Text style={s.mTitle}>FARINTANY</Text>
        <Text style={s.mSub}>Jeu traditionnel malgasy</Text>
        <Text style={s.mDesc}>
          Encerclez les pions adverses pour les capturer.{"\n"}
          Un pion capturé ne peut plus être utilisé.{"\n"}
          Égalité sur grille pleine → extension +4×4.
        </Text>
        <TouchableOpacity style={s.mBtn} onPress={() => startGame(false)}>
          <Text style={s.mBtnT}>DEUX JOUEURS (PVP)</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.mBtn} onPress={() => startGame(true)}>
          <Text style={s.mBtnT}>CONTRE L'IA</Text>
        </TouchableOpacity>
      </View>
    );

  // ── Rendu : Jeu ──────────────────────────────────────────────────────────
  // Calcul du libellé de statut affiché en haut
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
      {/* ── En-tête : scores + statut ── */}
      <View style={s.hdr}>
        {/* Score P1 (ambre) */}
        <View style={[s.pill, player === P1 && !over && s.pillP1]}>
          <Text style={[s.pTxt, player === P1 && !over ? s.tP1 : s.tIdle]}>
            P1 : {score.p1}
          </Text>
        </View>

        {/* Centre : statut + bouton menu */}
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
          {/* Indicateur de taille de grille */}
          <Text style={s.sizeLabel}>
            {size}×{size}
          </Text>
        </View>

        {/* Score P2 / IA (violet) */}
        <View style={[s.pill, player === P2 && !over && s.pillP2]}>
          <Text style={[s.pTxt, player === P2 && !over ? s.tP2 : s.tIdle]}>
            {isAI ? "IA" : "P2"} : {score.p2}
          </Text>
        </View>
      </View>

      {/* ── Plateau scrollable ── */}
      <ScrollView horizontal showsHorizontalScrollIndicator>
        <ScrollView showsVerticalScrollIndicator>
          <View style={s.board}>
            {/* Toast de capture flottant */}
            {toast && (
              <View
                style={[
                  s.toast,
                  {
                    borderColor:
                      toast.owner === P1
                        ? C_P1
                        : toast.owner === P2
                          ? C_P2
                          : "#94a3b8",
                  },
                ]}
              >
                <Text
                  style={[
                    s.toastT,
                    {
                      color:
                        toast.owner === P1
                          ? C_P1
                          : toast.owner === P2
                            ? C_P2
                            : "#94a3b8",
                    },
                  ]}
                >
                  {toast.msg}
                </Text>
              </View>
            )}

            {/* ── SVG : grille + territoires + pions ── */}
            <Svg width={BPX_DYN} height={BPX_DYN} style={s.svg}>
              {/* Lignes de la grille */}
              {Array.from({ length: size }, (_, i) => (
                <React.Fragment key={`g${i}`}>
                  {/* Ligne horizontale */}
                  <Line
                    x1={CELL / 2}
                    y1={i * CELL + CELL / 2}
                    x2={BPX_DYN - CELL / 2}
                    y2={i * CELL + CELL / 2}
                    stroke={C_GRID}
                    strokeWidth="0.6"
                  />
                  {/* Ligne verticale */}
                  <Line
                    x1={i * CELL + CELL / 2}
                    y1={CELL / 2}
                    x2={i * CELL + CELL / 2}
                    y2={BPX_DYN - CELL / 2}
                    stroke={C_GRID}
                    strokeWidth="0.6"
                  />
                </React.Fragment>
              ))}

              {/* Territoires capturés (formes bulles lissées) */}
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

              {/* Pions vivants et capturés */}
              {grid &&
                grid.map((row, y) =>
                  row.map((cell, x) => {
                    if (cell === EMPTY) return null;
                    const px = x * CELL + CELL / 2,
                      py = y * CELL + CELL / 2;
                    const color = cell === P1 ? C_P1 : C_P2;
                    const dead = capSet.has(K(x, y)); // pion capturé = atténué
                    return (
                      <React.Fragment key={`d${x}${y}`}>
                        {/* Halo coloré autour du pion */}
                        <Circle
                          cx={px}
                          cy={py}
                          r="9"
                          fill={color}
                          opacity={dead ? "0.07" : "0.15"}
                        />
                        {/* Corps principal du pion */}
                        <Circle
                          cx={px}
                          cy={py}
                          r="5.5"
                          fill={color}
                          opacity={dead ? "0.45" : "1"}
                        />
                        {/* Cercle pointillé pour signaler qu'il est mort */}
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

            {/* ── Overlay tactile : zones de pression invisibles ── */}
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

      {/* ── Pied de page : légende ── */}
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
  // ── Menu ──
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
    color: C_P1, // titre en ambre
    letterSpacing: 3,
    marginBottom: 4,
  },
  mSub: {
    fontSize: 12,
    color: "#c4a55a", // sous-titre ambre atténué
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

  // ── Jeu ──
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
  pillP1: { borderColor: C_P1 }, // bordure ambre pour P1 actif
  pillP2: { borderColor: C_P2 }, // bordure violet pour P2 actif
  pTxt: { fontSize: 15, fontWeight: "500" },
  tP1: { color: C_P1 },
  tP2: { color: C_P2 },
  tIdle: { color: "#475569" }, // couleur neutre si inactif
  turn: { fontSize: 12, color: "#94a3b8", letterSpacing: 0.3 },
  sizeLabel: { fontSize: 10, color: "#334155" }, // affiche la taille courante
  menuSmall: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: "#1e293b",
    borderRadius: 5,
  },
  menuSmallT: { color: "#94a3b8", fontSize: 11, fontWeight: "500" },

  // ── Plateau ──
  board: { margin: 16, position: "relative" },
  svg: {
    backgroundColor: C_BG,
    borderWidth: 1,
    borderColor: C_GRID,
    borderRadius: 4,
  },

  // ── Toast de capture ──
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

  // ── Pied de page ──
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
