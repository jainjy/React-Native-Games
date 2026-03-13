/**
 * FANORONA 9 — Jeu Traditionnel Malgasy
 * React Native + react-native-svg
 *
 * CORRECTIONS v3:
 * 1. Lignes diagonales corrigées — la connexion entre zones gauche/droite
 *    et zone centrale est maintenant correcte. Un segment diagonal existe
 *    entre (c1,r1) et (c2,r2) si l'UNE OU L'AUTRE des deux extrémités
 *    est un point "diagonal actif". Avant on testait seulement le point source.
 *
 * 2. Choix de capture visuel sur le plateau — quand approche ET retrait
 *    sont possibles depuis la même destination, on affiche les deux groupes
 *    de victimes en couleurs différentes (rouge=approche, bleu=retrait)
 *    avec un panel de choix en bas, SANS Alert.
 *
 * Installation: expo install react-native-svg
 */

import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Dimensions,
} from "react-native";
import Svg, {
  Circle,
  Line,
  Rect,
  G,
  Defs,
  RadialGradient,
  LinearGradient,
  Stop,
} from "react-native-svg";

const { width: SW } = Dimensions.get("window");

// ─── CONSTANTES ────────────────────────────────────────────────────────────────
const COLS = 9;
const ROWS = 5;
const EMPTY = 0;
const RED = 1;
const DARK = 2;

const BOARD_W = Math.min(SW - 16, 440);
const PAD_H = 32;
const PAD_V = 30;
const BOARD_H = BOARD_W * 0.55 + PAD_V * 2;
const CW = (BOARD_W - PAD_H * 2) / (COLS - 1);
const CH = (BOARD_H - PAD_V * 2) / (ROWS - 1);
const PR = Math.min(CW, CH) * 0.38;

const gx = (c) => PAD_H + c * CW;
const gy = (r) => PAD_V + r * CH;
const key = (c, r) => `${c},${r}`;
const inBounds = (c, r) => c >= 0 && c < COLS && r >= 0 && r < ROWS;

// ─── DIAGONALES ────────────────────────────────────────────────────────────────
/**
 * Un point (c,r) est "diagonal actif" si (c+r)%2===0
 * SAUF les points strictement intérieurs de la zone centrale.
 *
 * Zone centrale = rows 1..3, cols 3..5
 * Points intérieurs = ceux qui NE sont PAS sur le bord du carré central.
 * Bord du carré = (col===3||col===5) OU (row===1||row===3)
 * Intérieur strict = row===2 ET col===4 (le seul point pair intérieur)
 *
 * Donc hasDiag(4,2) = false  (centre exact, intérieur)
 * Et   hasDiag(3,1) = true   (coin du carré central)
 *      hasDiag(5,3) = true   (coin du carré central)
 *      hasDiag(2,2) = true   (hors zone centrale)
 */
const hasDiag = (c, r) => {
  if ((c + r) % 2 !== 0) return false;
  // Seul point pair dans l'intérieur strict de la zone centrale
  if (c === 4 && r === 2) return false;
  return true;
};

/**
 * Un SEGMENT diagonal entre (c1,r1) et (c2,r2) existe si
 * AU MOINS UN des deux points est diagonal actif.
 * C'est le fix principal: avant on testait seulement le point source.
 */
const diagSegExists = (c1, r1, c2, r2) => hasDiag(c1, r1) || hasDiag(c2, r2);

/**
 * Directions depuis (c,r): orthogonales toujours + diagonales si hasDiag
 */
const getDirs = (c, r) => {
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  if (hasDiag(c, r)) dirs.push([1, 1], [1, -1], [-1, 1], [-1, -1]);
  return dirs;
};

// ─── SEGMENTS À DESSINER ────────────────────────────────────────────────────────
const buildSegments = () => {
  const segs = [];
  const seen = new Set();
  const add = (c1, r1, c2, r2) => {
    const a = `${c1},${r1},${c2},${r2}`,
      b = `${c2},${r2},${c1},${r1}`;
    if (seen.has(a) || seen.has(b)) return;
    seen.add(a);
    segs.push([c1, r1, c2, r2]);
  };
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      // Orthogonaux toujours
      if (inBounds(c + 1, r)) add(c, r, c + 1, r);
      if (inBounds(c, r + 1)) add(c, r, c, r + 1);
      // Diagonaux: segment existe si l'un OU l'autre des deux bouts est actif
      [
        [1, 1],
        [1, -1],
      ].forEach(([dc, dr]) => {
        const nc = c + dc,
          nr = r + dr;
        if (inBounds(nc, nr) && diagSegExists(c, r, nc, nr)) add(c, r, nc, nr);
      });
    }
  return segs;
};
const SEGMENTS = buildSegments();

// Séparer orthogonaux et diagonaux pour l'affichage
const SEG_ORTHO = SEGMENTS.filter(([c1, r1, c2, r2]) => c1 === c2 || r1 === r2);
const SEG_DIAG = SEGMENTS.filter(([c1, r1, c2, r2]) => c1 !== c2 && r1 !== r2);

// ─── POSITION INITIALE ─────────────────────────────────────────────────────────
// row=2 milieu: N,R,N,R,VIDE,N,R,N,R
const MID_ROW = [DARK, RED, DARK, RED, EMPTY, DARK, RED, DARK, RED];

const initBoard = () => {
  const b = Array.from({ length: ROWS }, () => Array(COLS).fill(EMPTY));
  for (let c = 0; c < COLS; c++) {
    b[0][c] = DARK;
    b[1][c] = DARK;
    b[2][c] = MID_ROW[c];
    b[3][c] = RED;
    b[4][c] = RED;
  }
  return b;
};

// ─── LOGIQUE DE JEU ────────────────────────────────────────────────────────────
const opp = (p) => (p === RED ? DARK : RED);

const collectLine = (board, sc, sr, dc, dr, enemy) => {
  const list = [];
  let nc = sc + dc,
    nr = sr + dr;
  while (inBounds(nc, nr) && board[nr][nc] === enemy) {
    list.push([nc, nr]);
    nc += dc;
    nr += dr;
  }
  return list;
};

const getCaptures = (board, fc, fr, tc, tr, player) => {
  const enemy = opp(player),
    dc = tc - fc,
    dr = tr - fr;
  return {
    approach: collectLine(board, tc, tr, dc, dr, enemy),
    retreat: collectLine(board, fc, fr, -dc, -dr, enemy),
  };
};

const canMove = (board, fc, fr, tc, tr) => {
  if (!inBounds(tc, tr) || board[tr][tc] !== EMPTY) return false;
  const dc = tc - fc,
    dr = tr - fr;
  if (Math.abs(dc) > 1 || Math.abs(dr) > 1) return false;
  // On vérifie que le segment existe bien (orthogonal toujours, diagonal selon règle)
  if (dc === 0 || dr === 0) return true; // orthogonal
  return diagSegExists(fc, fr, tc, tr);
};

const allCaptureMoves = (board, player) => {
  const moves = [];
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      if (board[r][c] !== player) continue;
      for (const [dc, dr] of getDirs(c, r)) {
        const tc = c + dc,
          tr = r + dr;
        if (!canMove(board, c, r, tc, tr)) continue;
        const { approach, retreat } = getCaptures(board, c, r, tc, tr, player);
        if (approach.length > 0)
          moves.push({
            from: [c, r],
            to: [tc, tr],
            type: "approach",
            captured: approach,
          });
        if (retreat.length > 0)
          moves.push({
            from: [c, r],
            to: [tc, tr],
            type: "retreat",
            captured: retreat,
          });
      }
    }
  return moves;
};

const allPaikaMoves = (board, player) => {
  const moves = [];
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      if (board[r][c] !== player) continue;
      for (const [dc, dr] of getDirs(c, r)) {
        const tc = c + dc,
          tr = r + dr;
        if (canMove(board, c, r, tc, tr))
          moves.push({
            from: [c, r],
            to: [tc, tr],
            type: "paika",
            captured: [],
          });
      }
    }
  return moves;
};

const applyMove = (board, from, to, captured) => {
  const nb = board.map((r) => [...r]);
  nb[to[1]][to[0]] = nb[from[1]][from[0]];
  nb[from[1]][from[0]] = EMPTY;
  for (const [cc, cr] of captured) nb[cr][cc] = EMPTY;
  return nb;
};

const getContinuations = (board, c, r, player, lastDC, lastDR, lastType) => {
  const moves = [];
  for (const [dc, dr] of getDirs(c, r)) {
    if (dc === -lastDC && dr === -lastDR) continue;
    const tc = c + dc,
      tr = r + dr;
    if (!canMove(board, c, r, tc, tr)) continue;
    const { approach, retreat } = getCaptures(board, c, r, tc, tr, player);
    if (
      approach.length > 0 &&
      !(dc === lastDC && dr === lastDR && lastType === "approach")
    )
      moves.push({
        from: [c, r],
        to: [tc, tr],
        type: "approach",
        captured: approach,
      });
    if (
      retreat.length > 0 &&
      !(dc === lastDC && dr === lastDR && lastType === "retreat")
    )
      moves.push({
        from: [c, r],
        to: [tc, tr],
        type: "retreat",
        captured: retreat,
      });
  }
  return moves;
};

const countPieces = (board) => {
  let red = 0,
    dark = 0;
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      if (board[r][c] === RED) red++;
      if (board[r][c] === DARK) dark++;
    }
  return { red, dark };
};

// ─── PIÈCE SVG ────────────────────────────────────────────────────────────────
const Piece = ({ cx, cy, color, selected, canCapture }) => {
  const isRed = color === RED;
  const fill = isRed ? "#C84B30" : "#252523";
  const stroke = isRed ? "#7A1E00" : "#000";
  const shine = isRed ? "rgba(255,170,130,0.55)" : "rgba(255,255,255,0.2)";
  return (
    <G>
      {selected && (
        <Circle
          cx={cx}
          cy={cy}
          r={PR + 6}
          fill="none"
          stroke="#FFD700"
          strokeWidth={2.5}
          strokeDasharray="5,3"
        />
      )}
      {canCapture && !selected && (
        <Circle
          cx={cx}
          cy={cy}
          r={PR + 5}
          fill="rgba(251,146,60,0.25)"
          stroke="#F97316"
          strokeWidth={1.5}
        />
      )}
      <Circle cx={cx + 1.5} cy={cy + 2} r={PR} fill="rgba(0,0,0,0.22)" />
      <Circle cx={cx} cy={cy} r={PR} fill={fill} />
      <Circle
        cx={cx}
        cy={cy}
        r={PR}
        fill="none"
        stroke={stroke}
        strokeWidth={1.5}
      />
      <Circle
        cx={cx}
        cy={cy}
        r={PR * 0.7}
        fill="none"
        stroke={isRed ? "rgba(255,100,60,0.3)" : "rgba(255,255,255,0.1)"}
        strokeWidth={1}
      />
      <Circle
        cx={cx - PR * 0.27}
        cy={cy - PR * 0.3}
        r={PR * 0.3}
        fill={shine}
      />
    </G>
  );
};

// ─── INDICATEURS ─────────────────────────────────────────────────────────────
const MoveHint = ({ cx, cy, hintType }) => {
  if (hintType === "paika")
    return (
      <G>
        <Circle
          cx={cx}
          cy={cy}
          r={PR * 0.5}
          fill="rgba(34,197,94,0.3)"
          stroke="#16A34A"
          strokeWidth={2}
        />
        <Circle cx={cx} cy={cy} r={PR * 0.22} fill="#22C55E" />
      </G>
    );
  if (hintType === "capture")
    return (
      <G>
        <Circle
          cx={cx}
          cy={cy}
          r={PR * 0.54}
          fill="rgba(239,68,68,0.35)"
          stroke="#EF4444"
          strokeWidth={2}
        />
        <Circle cx={cx} cy={cy} r={PR * 0.23} fill="#DC2626" />
      </G>
    );
  if (hintType === "continuation")
    return (
      <G>
        <Circle
          cx={cx}
          cy={cy}
          r={PR * 0.58}
          fill="rgba(249,115,22,0.4)"
          stroke="#F97316"
          strokeWidth={2}
        />
        <Circle
          cx={cx}
          cy={cy}
          r={PR * 0.35}
          fill="none"
          stroke="#FED7AA"
          strokeWidth={1}
          strokeDasharray="3,2"
        />
        <Circle cx={cx} cy={cy} r={PR * 0.2} fill="#FB923C" />
      </G>
    );
  return null;
};

// Victime approche = rouge, victime retrait = bleu
const VictimMark = ({ cx, cy, victimType }) => {
  const color = victimType === "retreat" ? "#3B82F6" : "#EF4444";
  const fill =
    victimType === "retreat" ? "rgba(59,130,246,0.18)" : "rgba(239,68,68,0.18)";
  return (
    <G>
      <Circle
        cx={cx}
        cy={cy}
        r={PR * 0.62}
        fill={fill}
        stroke={color}
        strokeWidth={1.5}
        strokeDasharray="4,2"
      />
      <Line
        x1={cx - PR * 0.38}
        y1={cy - PR * 0.38}
        x2={cx + PR * 0.38}
        y2={cy + PR * 0.38}
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
      />
      <Line
        x1={cx + PR * 0.38}
        y1={cy - PR * 0.38}
        x2={cx - PR * 0.38}
        y2={cy + PR * 0.38}
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
      />
    </G>
  );
};

// ─── PLATEAU SVG ─────────────────────────────────────────────────────────────
const Board = ({ board, selected, hints, victims, capturingSet, onPress }) => (
  <Svg width={BOARD_W} height={BOARD_H}>
    <Defs>
      <RadialGradient id="bg" cx="50%" cy="40%" rx="60%" ry="60%">
        <Stop offset="0%" stopColor="#ECCA6A" />
        <Stop offset="100%" stopColor="#A97025" />
      </RadialGradient>
      <LinearGradient id="zR" x1="0" y1="0" x2="1" y2="0">
        <Stop offset="0%" stopColor="rgba(190,70,20,0.22)" />
        <Stop offset="100%" stopColor="rgba(190,70,20,0.04)" />
      </LinearGradient>
      <LinearGradient id="zD" x1="0" y1="0" x2="1" y2="0">
        <Stop offset="0%" stopColor="rgba(20,20,20,0.02)" />
        <Stop offset="100%" stopColor="rgba(20,20,20,0.18)" />
      </LinearGradient>
    </Defs>

    {/* Fond bois */}
    <Rect
      x={0}
      y={0}
      width={BOARD_W}
      height={BOARD_H}
      rx={10}
      fill="url(#bg)"
    />
    <Rect
      x={2}
      y={2}
      width={BOARD_W - 4}
      height={BOARD_H - 4}
      rx={9}
      fill="none"
      stroke="#6A3A10"
      strokeWidth={2.5}
    />

    {/* Zones colorées */}
    <Rect
      x={2}
      y={2}
      width={BOARD_W / 2 - 2}
      height={BOARD_H - 4}
      rx={9}
      fill="url(#zR)"
    />
    <Rect
      x={BOARD_W / 2}
      y={2}
      width={BOARD_W / 2 - 4}
      height={BOARD_H - 4}
      rx={9}
      fill="url(#zD)"
    />

    {/* Zone centrale grise */}
    <Rect
      x={gx(3) - CW * 0.5 + 1}
      y={gy(1) - CH * 0.5 + 1}
      width={CW * 3 - 2}
      height={CH * 3 - 2}
      rx={3}
      fill="rgba(150,150,145,0.2)"
      stroke="rgba(90,60,10,0.2)"
      strokeWidth={0.75}
    />

    {/* Lignes diagonales (en premier, sous les orthogonaux) */}
    {SEG_DIAG.map(([c1, r1, c2, r2], i) => (
      <Line
        key={"d" + i}
        x1={gx(c1)}
        y1={gy(r1)}
        x2={gx(c2)}
        y2={gy(r2)}
        stroke="#5A3010"
        strokeWidth={0.85}
        opacity={0.8}
      />
    ))}

    {/* Lignes orthogonales */}
    {SEG_ORTHO.map(([c1, r1, c2, r2], i) => (
      <Line
        key={"o" + i}
        x1={gx(c1)}
        y1={gy(r1)}
        x2={gx(c2)}
        y2={gy(r2)}
        stroke="#5A3010"
        strokeWidth={1.5}
      />
    ))}

    {/* Indicateurs de coups */}
    {Array.from({ length: ROWS }, (_, r) =>
      Array.from({ length: COLS }, (_, c) => {
        const h = hints?.get(key(c, r));
        return h ? (
          <MoveHint key={"h" + key(c, r)} cx={gx(c)} cy={gy(r)} hintType={h} />
        ) : null;
      }),
    )}

    {/* Pièces */}
    {Array.from({ length: ROWS }, (_, r) =>
      Array.from({ length: COLS }, (_, c) => {
        const cell = board[r][c];
        if (cell === EMPTY) {
          if (c === 4 && r === 2)
            return (
              <Circle
                key="ctr"
                cx={gx(4)}
                cy={gy(2)}
                r={PR * 0.3}
                fill="none"
                stroke="#7A5020"
                strokeWidth={1}
                opacity={0.6}
              />
            );
          return null;
        }
        const k = key(c, r);
        return (
          <Piece
            key={k}
            cx={gx(c)}
            cy={gy(r)}
            color={cell}
            selected={selected && selected[0] === c && selected[1] === r}
            canCapture={
              capturingSet?.has(k) &&
              !(selected && selected[0] === c && selected[1] === r)
            }
          />
        );
      }),
    )}

    {/* Marques X sur victimes (par-dessus pièces) */}
    {victims &&
      Array.from(victims).map(([k, t]) => {
        const [c, r] = k.split(",").map(Number);
        return (
          <VictimMark key={"v" + k} cx={gx(c)} cy={gy(r)} victimType={t} />
        );
      })}

    {/* Zones tactiles */}
    {Array.from({ length: ROWS }, (_, r) =>
      Array.from({ length: COLS }, (_, c) => (
        <Rect
          key={"t" + key(c, r)}
          x={gx(c) - CW / 2}
          y={gy(r) - CH / 2}
          width={CW}
          height={CH}
          fill="transparent"
          onPress={() => onPress(c, r)}
        />
      )),
    )}
  </Svg>
);

// ─── PANEL DE CHOIX DE CAPTURE ────────────────────────────────────────────────
/**
 * Affiché sous le plateau quand approche ET retrait sont disponibles.
 * Montre clairement les deux options avec leur nombre de pièces capturées.
 * Rouge = approche, Bleu = retrait.
 */
const CaptureChoicePanel = ({ appMove, retMove, onChoose, onCancel }) => (
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
          -{appMove.captured.length} pièce
          {appMove.captured.length > 1 ? "s" : ""}
        </Text>
        <View style={S.choiceVictimRow}>
          {appMove.captured.map(([cc, cr], i) => (
            <View
              key={i}
              style={[S.choiceVictimDot, { backgroundColor: "#EF4444" }]}
            />
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
          -{retMove.captured.length} pièce
          {retMove.captured.length > 1 ? "s" : ""}
        </Text>
        <View style={S.choiceVictimRow}>
          {retMove.captured.map(([cc, cr], i) => (
            <View
              key={i}
              style={[S.choiceVictimDot, { backgroundColor: "#3B82F6" }]}
            />
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

// ─── COMPOSANT PRINCIPAL ──────────────────────────────────────────────────────
export default function FanoronaGame() {
  const [board, setBoard] = useState(initBoard);
  const [player, setPlayer] = useState(RED);
  const [selected, setSelected] = useState(null);
  const [phase, setPhase] = useState("select");

  // Suggestions visuelles
  const [hints, setHints] = useState(new Map());
  // victims: Array de [key, type] où type='approach'|'retreat'|'both'
  const [victims, setVictims] = useState([]);
  const [capturingSet, setCapturingSet] = useState(new Set());

  // Choix de capture en attente
  const [pendingChoice, setPendingChoice] = useState(null); // {appMove, retMove}

  // Capture en chaîne
  const [contMoves, setContMoves] = useState([]);
  const [chainInfo, setChainInfo] = useState(null);

  const [gameOver, setGameOver] = useState(false);
  const [message, setMessage] = useState("🔴 Rouge commence !");
  const [scores, setScores] = useState({ red: 0, dark: 0 });
  const [history, setHistory] = useState([]);
  const [showRules, setShowRules] = useState(false);

  // ── Helpers de hints ──────────────────────────────────────────────────────
  const globalHints = useCallback((b, pl) => {
    const caps = allCaptureMoves(b, pl);
    const pks = caps.length === 0 ? allPaikaMoves(b, pl) : [];
    const h = new Map(),
      cs = new Set();
    if (caps.length > 0) {
      caps.forEach((m) => {
        h.set(key(m.to[0], m.to[1]), "capture");
        cs.add(key(m.from[0], m.from[1]));
      });
    } else {
      pks.forEach((m) => h.set(key(m.to[0], m.to[1]), "paika"));
    }
    return { h, cs };
  }, []);

  const pieceHints = useCallback((b, pl, pc, pr) => {
    const caps = allCaptureMoves(b, pl);
    const pks = caps.length === 0 ? allPaikaMoves(b, pl) : [];
    const h = new Map();
    const pieceCaps = caps.filter((m) => m.from[0] === pc && m.from[1] === pr);
    const piecePks = pks.filter((m) => m.from[0] === pc && m.from[1] === pr);
    // Victimes: Map dest → {app:[],ret:[]}
    const victimMap = new Map();
    for (const m of pieceCaps) {
      h.set(key(m.to[0], m.to[1]), "capture");
      const dk = key(m.to[0], m.to[1]);
      if (!victimMap.has(dk)) victimMap.set(dk, { app: [], ret: [] });
      if (m.type === "approach") victimMap.get(dk).app.push(...m.captured);
      if (m.type === "retreat") victimMap.get(dk).ret.push(...m.captured);
    }
    for (const m of piecePks) h.set(key(m.to[0], m.to[1]), "paika");

    // Construire la liste victims avec type coloré
    // Si une destination a seulement approach → marquer rouges
    // Si seulement retreat → marquer bleus
    // Si les deux → marquer rouges (approche) + bleus (retrait)
    const vlist = [];
    for (const [, { app, ret }] of victimMap) {
      for (const [vc, vr] of app) vlist.push([key(vc, vr), "approach"]);
      for (const [vc, vr] of ret) vlist.push([key(vc, vr), "retreat"]);
    }
    // Déduplique en gardant la priorité approach
    const seen = new Map();
    for (const [k, t] of vlist) {
      if (!seen.has(k)) seen.set(k, t);
    }
    const victims = Array.from(seen.entries());

    return { h, victims, pieceCaps, piecePks };
  }, []);

  const contHints = useCallback((contList) => {
    const h = new Map();
    const victimMap = new Map();
    for (const m of contList) {
      h.set(key(m.to[0], m.to[1]), "continuation");
      const dk = key(m.to[0], m.to[1]);
      if (!victimMap.has(dk)) victimMap.set(dk, { app: [], ret: [] });
      if (m.type === "approach") victimMap.get(dk).app.push(...m.captured);
      if (m.type === "retreat") victimMap.get(dk).ret.push(...m.captured);
    }
    const vlist = [];
    for (const [, { app, ret }] of victimMap) {
      for (const [vc, vr] of app) vlist.push([key(vc, vr), "approach"]);
      for (const [vc, vr] of ret) vlist.push([key(vc, vr), "retreat"]);
    }
    const seen = new Map();
    for (const [k, t] of vlist) {
      if (!seen.has(k)) seen.set(k, t);
    }
    return { h, victims: Array.from(seen.entries()) };
  }, []);

  // Init
  useEffect(() => {
    const b = initBoard();
    const { h, cs } = globalHints(b, RED);
    setHints(h);
    setCapturingSet(cs);
  }, []);

  // ── Fin de tour ───────────────────────────────────────────────────────────
  const endTurn = useCallback(
    (nb) => {
      const next = player === RED ? DARK : RED;
      const { red, dark } = countPieces(nb);
      const checkWin = (w) => {
        setGameOver(true);
        setMessage(
          w === RED
            ? "🔴 Rouge remporte la partie !"
            : "⚫ Noir remporte la partie !",
        );
        setScores((s) => ({
          red: s.red + (w === RED ? 1 : 0),
          dark: s.dark + (w === DARK ? 1 : 0),
        }));
        setHints(new Map());
        setVictims([]);
        setCapturingSet(new Set());
      };
      if (red === 0) {
        checkWin(DARK);
        return;
      }
      if (dark === 0) {
        checkWin(RED);
        return;
      }
      const nc = allCaptureMoves(nb, next),
        np = nc.length === 0 ? allPaikaMoves(nb, next) : [];
      if (nc.length === 0 && np.length === 0) {
        checkWin(player);
        return;
      }
      setPlayer(next);
      setPhase("select");
      setSelected(null);
      setChainInfo(null);
      setContMoves([]);
      setPendingChoice(null);
      const { h, cs } = globalHints(nb, next);
      setHints(h);
      setVictims([]);
      setCapturingSet(cs);
      setMessage(next === RED ? "🔴 Tour de Rouge" : "⚫ Tour de Noir");
    },
    [player, globalHints],
  );

  // ── Exécute une capture ───────────────────────────────────────────────────
  const doCapture = useCallback(
    (b, move) => {
      const nb = applyMove(b, move.from, move.to, move.captured);
      setBoard(nb);
      setHistory((h) => [...h.slice(-19), move]);
      setPendingChoice(null);
      const dc = move.to[0] - move.from[0],
        dr = move.to[1] - move.from[1];
      const cont = getContinuations(
        nb,
        move.to[0],
        move.to[1],
        player,
        dc,
        dr,
        move.type,
      );
      if (cont.length === 0) {
        endTurn(nb);
      } else {
        setSelected(move.to);
        setPhase("continue");
        setContMoves(cont);
        setChainInfo({ dc, dr, type: move.type });
        const { h, victims } = contHints(cont);
        setHints(h);
        setVictims(victims);
        setCapturingSet(new Set());
        setMessage(
          "🔗 Capture en chaîne ! Continuez ou touchez votre pièce pour terminer.",
        );
      }
    },
    [player, endTurn, contHints],
  );

  // ── Gestion des clics ─────────────────────────────────────────────────────
  const handlePress = useCallback(
    (c, r) => {
      if (gameOver) return;
      // Si un choix est en attente, annuler en cliquant autre part
      if (pendingChoice) {
        setPendingChoice(null);
        setMessage("Choix annulé. Sélectionnez à nouveau.");
        return;
      }

      // ═══ CONTINUE ═══════════════════════════════════════════════════════════
      if (phase === "continue") {
        if (selected && selected[0] === c && selected[1] === r) {
          endTurn(board);
          return;
        }
        const move = contMoves.find((m) => m.to[0] === c && m.to[1] === r);
        if (!move) {
          setMessage(
            "Touchez une destination orange ou votre pièce pour terminer.",
          );
          return;
        }
        // Vérifier si approche+retrait possibles sur cette destination
        const appM = contMoves.find(
          (m) => m.to[0] === c && m.to[1] === r && m.type === "approach",
        );
        const retM = contMoves.find(
          (m) => m.to[0] === c && m.to[1] === r && m.type === "retreat",
        );
        if (appM && retM) {
          setPendingChoice({ appMove: appM, retMove: retM });
          // Montrer les deux groupes de victimes
          const v = [];
          appM.captured.forEach(([vc, vr]) =>
            v.push([key(vc, vr), "approach"]),
          );
          retM.captured.forEach(([vc, vr]) => v.push([key(vc, vr), "retreat"]));
          setVictims(v);
          setMessage("Choisissez le type de capture ci-dessous.");
        } else {
          doCapture(board, move);
        }
        return;
      }

      // ═══ SELECT ══════════════════════════════════════════════════════════════
      if (phase === "select") {
        if (board[r][c] !== player) {
          if (board[r][c] !== EMPTY)
            setMessage("⚠️ Ce n'est pas votre pièce !");
          return;
        }
        const caps = allCaptureMoves(board, player);
        const pks = caps.length === 0 ? allPaikaMoves(board, player) : [];
        const pieceCaps = caps.filter(
          (m) => m.from[0] === c && m.from[1] === r,
        );
        const piecePks = pks.filter((m) => m.from[0] === c && m.from[1] === r);
        if (caps.length > 0 && pieceCaps.length === 0) {
          setMessage(
            "⚠️ Capture obligatoire ! Choisissez une pièce avec halo orange.",
          );
          return;
        }
        if (pieceCaps.length === 0 && piecePks.length === 0) {
          setMessage("Cette pièce est bloquée.");
          return;
        }
        setSelected([c, r]);
        setPhase("move");
        const { h, victims } = pieceHints(board, player, c, r);
        setHints(h);
        setVictims(victims);
        setCapturingSet(new Set());
        if (pieceCaps.length > 0)
          setMessage(
            "🎯 Touchez une destination rouge (X = pièces capturées).",
          );
        else setMessage("🕊️ Paika — touchez où bouger (vert).");
        return;
      }

      // ═══ MOVE ═════════════════════════════════════════════════════════════════
      if (phase === "move") {
        if (selected && selected[0] === c && selected[1] === r) {
          setSelected(null);
          setPhase("select");
          const { h, cs } = globalHints(board, player);
          setHints(h);
          setVictims([]);
          setCapturingSet(cs);
          return;
        }
        if (board[r][c] === player) {
          setSelected(null);
          setPhase("select");
          const caps = allCaptureMoves(board, player);
          const pks = caps.length === 0 ? allPaikaMoves(board, player) : [];
          const pieceCaps = caps.filter(
            (m) => m.from[0] === c && m.from[1] === r,
          );
          if (caps.length > 0 && pieceCaps.length === 0) {
            setMessage("⚠️ Capture obligatoire !");
            const { h, cs } = globalHints(board, player);
            setHints(h);
            setVictims([]);
            setCapturingSet(cs);
            return;
          }
          setSelected([c, r]);
          setPhase("move");
          const { h, victims } = pieceHints(board, player, c, r);
          setHints(h);
          setVictims(victims);
          setCapturingSet(new Set());
          if (pieceCaps.length > 0)
            setMessage("🎯 Touchez une destination rouge.");
          else setMessage("🕊️ Paika — touchez où bouger.");
          return;
        }

        const caps = allCaptureMoves(board, player);
        const isPaika = caps.length === 0;

        if (isPaika) {
          if (!canMove(board, selected[0], selected[1], c, r)) {
            setMessage("Destination invalide. Choisissez une case verte.");
            return;
          }
          const nb = applyMove(board, selected, [c, r], []);
          setBoard(nb);
          setHistory((h) => [
            ...h.slice(-19),
            { from: selected, to: [c, r], type: "paika", captured: [] },
          ]);
          endTurn(nb);
          return;
        }

        const destCaps = caps.filter(
          (m) =>
            m.from[0] === selected[0] &&
            m.from[1] === selected[1] &&
            m.to[0] === c &&
            m.to[1] === r,
        );
        if (destCaps.length === 0) {
          setMessage("Destination invalide. Choisissez une case rouge.");
          return;
        }

        const appM = destCaps.find((m) => m.type === "approach");
        const retM = destCaps.find((m) => m.type === "retreat");

        if (appM && retM) {
          // Afficher les deux groupes de victimes + panel de choix
          setPendingChoice({ appMove: appM, retMove: retM });
          const v = [];
          appM.captured.forEach(([vc, vr]) =>
            v.push([key(vc, vr), "approach"]),
          );
          retM.captured.forEach(([vc, vr]) => v.push([key(vc, vr), "retreat"]));
          setVictims(v);
          setMessage("Choisissez le type de capture ci-dessous ↓");
        } else {
          doCapture(board, appM || retM);
        }
      }
    },
    [
      board,
      player,
      selected,
      phase,
      contMoves,
      pendingChoice,
      gameOver,
      endTurn,
      doCapture,
      globalHints,
      pieceHints,
    ],
  );

  const resetGame = () => {
    const b = initBoard();
    setBoard(b);
    setPlayer(RED);
    setSelected(null);
    setPhase("select");
    setGameOver(false);
    setHistory([]);
    setChainInfo(null);
    setContMoves([]);
    setPendingChoice(null);
    const { h, cs } = globalHints(b, RED);
    setHints(h);
    setVictims([]);
    setCapturingSet(cs);
    setMessage("🔴 Rouge commence !");
  };

  const { red: redC, dark: darkC } = countPieces(board);

  return (
    <SafeAreaView style={S.safe}>
      <ScrollView
        contentContainerStyle={S.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={S.header}>
          <Text style={S.title}>FANORONA 9</Text>
          <Text style={S.subtitle}>Jeu Traditionnel Malgasy</Text>
        </View>

        <View style={S.scoreRow}>
          <ScoreCard
            label="Rouge"
            count={redC}
            wins={scores.red}
            dotColor="#C84B30"
            active={player === RED && !gameOver}
          />
          <Text style={S.vs}>⚔</Text>
          <ScoreCard
            label="Noir"
            count={darkC}
            wins={scores.dark}
            dotColor="#252523"
            active={player === DARK && !gameOver}
          />
        </View>

        <View style={[S.msg, gameOver && S.msgWin]}>
          <Text style={S.msgTxt}>{message}</Text>
        </View>

        <View style={S.boardWrap}>
          <Board
            board={board}
            selected={selected}
            hints={hints}
            victims={victims}
            capturingSet={capturingSet}
            onPress={handlePress}
          />
        </View>

        {/* Panel de choix de capture — sous le plateau */}
        {pendingChoice && (
          <CaptureChoicePanel
            appMove={pendingChoice.appMove}
            retMove={pendingChoice.retMove}
            onChoose={(move) => doCapture(board, move)}
            onCancel={() => {
              setPendingChoice(null);
              setMessage("Choix annulé. Resélectionnez.");
              if (selected) {
                const { h, victims } = pieceHints(
                  board,
                  player,
                  selected[0],
                  selected[1],
                );
                setHints(h);
                setVictims(victims);
              }
            }}
          />
        )}

        {/* Légende */}
        <View style={S.legendRow}>
          <LegItem
            color="rgba(34,197,94,0.45)"
            border="#16A34A"
            label="Paika"
          />
          <LegItem
            color="rgba(239,68,68,0.45)"
            border="#EF4444"
            label="Capture"
          />
          <LegItem
            color="rgba(249,115,22,0.5)"
            border="#F97316"
            label="Chaîne"
          />
        </View>
        <View style={S.legendRow}>
          <LegItem
            color="rgba(239,68,68,0.2)"
            border="#EF4444"
            label="Victime approche"
            dashed
          />
          <LegItem
            color="rgba(59,130,246,0.2)"
            border="#3B82F6"
            label="Victime retrait"
            dashed
          />
        </View>

        <View style={S.btnRow}>
          <TouchableOpacity style={S.btnR} onPress={resetGame}>
            <Text style={S.btnTxtW}>Nouvelle Partie</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={S.btnW}
            onPress={() => setShowRules((v) => !v)}
          >
            <Text style={S.btnTxtB}>{showRules ? "Masquer" : "Règles"}</Text>
          </TouchableOpacity>
        </View>

        {showRules && <RulesPanel />}

        {history.length > 0 && (
          <View style={S.hist}>
            <Text style={S.histTitle}>Historique</Text>
            {[...history]
              .reverse()
              .slice(0, 8)
              .map((m, i) => (
                <Text key={i} style={S.histItem}>
                  {m.type === "paika" ? "🕊️" : "⚔️"} ({m.from[0]},{m.from[1]})→(
                  {m.to[0]},{m.to[1]}){" "}
                  {m.captured?.length > 0 ? `-${m.captured.length}p` : ""}{" "}
                  <Text style={S.histType}>{m.type}</Text>
                </Text>
              ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── SOUS-COMPOSANTS ─────────────────────────────────────────────────────────
const ScoreCard = ({ label, count, wins, dotColor, active }) => (
  <View style={[S.scoreCard, active && S.scoreActive]}>
    <View style={[S.scoreDot, { backgroundColor: dotColor }]} />
    <Text style={S.scoreLabel}>{label}</Text>
    <Text style={[S.scoreNum, { color: dotColor }]}>{count}</Text>
    <Text style={S.scoreWins}>{wins}W</Text>
  </View>
);

const LegItem = ({ color, border, label, dashed }) => (
  <View style={S.legItem}>
    <View
      style={[
        S.legDot,
        {
          backgroundColor: color,
          borderColor: border,
          borderStyle: dashed ? "dashed" : "solid",
        },
      ]}
    />
    <Text style={S.legTxt}>{label}</Text>
  </View>
);

const RC = ({ icon, title, color, text }) => (
  <View style={[S.ruleCard, { borderLeftColor: color }]}>
    <Text style={[S.ruleTitle, { color }]}>
      {icon} {title}
    </Text>
    <Text style={S.ruleTxt}>{text}</Text>
  </View>
);

const RulesPanel = () => (
  <View style={S.rulesWrap}>
    <Text style={S.rulesH}>📋 Règles Complètes</Text>
    <RC
      icon="🎯"
      title="Objectif"
      color="#2563EB"
      text="Capturer toutes les pièces adverses ou bloquer l'adversaire."
    />
    <RC
      icon="🏁"
      title="Position Initiale"
      color="#7C3AED"
      text={
        "Rangées 1-2 (haut): Noirs\nRangée 3 milieu: N R N R VIDE N R N R\nRangées 4-5 (bas): Rouges\n22 pièces chacun. Rouge commence."
      }
    />
    <RC
      icon="♟"
      title="Déplacement"
      color="#059669"
      text={
        "Une case vers intersection adjacente libre.\nHorizontal, vertical ou diagonal selon les lignes.\nDiagonales: (col+row)%2===0, sauf centre exact (4,2)."
      }
    />
    <RC
      icon="⬆"
      title="Capture par Approche"
      color="#DC2626"
      text={
        "Avancez VERS l'ennemi → toutes les pièces ennemies consécutives devant sont capturées.\n\nEx: 🔴⬛⬛⬛ → rouge avance → -3 noirs"
      }
    />
    <RC
      icon="⬇"
      title="Capture par Retrait"
      color="#3B82F6"
      text={
        "Éloignez-vous de l'ennemi → toutes les pièces ennemies consécutives derrière sont capturées.\n\nEx: ⬛⬛⬛🔴 → rouge recule → -3 noirs"
      }
    />
    <RC
      icon="🔗"
      title="Capture en Chaîne"
      color="#7C3AED"
      text={
        "Après capture, même pièce peut continuer.\n✗ Pas de retour arrière\n✗ Pas même direction + même type\n→ Toucher sa pièce = fin de chaîne"
      }
    />
    <RC
      icon="🕊"
      title="Coup Paika"
      color="#6B7280"
      text="Si aucune capture possible: déplacement simple vers case adjacente libre. Fin de tour."
    />
    <RC
      icon="⚠️"
      title="Capture Obligatoire"
      color="#DC2626"
      text="Si une capture existe → OBLIGATOIRE. Pas de Paika possible."
    />
  </View>
);

// ─── STYLES ──────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F5F0E8" },
  scroll: { padding: 12, alignItems: "center", paddingBottom: 50 },

  header: { alignItems: "center", marginBottom: 12 },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#4A2A08",
    letterSpacing: 4,
  },
  subtitle: { fontSize: 12, color: "#8B6040", marginTop: 2, letterSpacing: 1 },

  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 10,
    width: "100%",
  },
  scoreCard: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 10,
    borderWidth: 1.5,
    borderColor: "#E0D4C0",
  },
  scoreActive: {
    borderColor: "#FFD700",
    backgroundColor: "#FFFBEB",
    shadowColor: "#FFD700",
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  scoreDot: { width: 16, height: 16, borderRadius: 8, marginBottom: 3 },
  scoreLabel: { fontSize: 12, color: "#8B6040", fontWeight: "600" },
  scoreNum: { fontSize: 24, fontWeight: "800" },
  scoreWins: { fontSize: 10, color: "#AAA", marginTop: 1 },
  vs: { fontSize: 20, fontWeight: "700", color: "#8B6040" },

  msg: {
    backgroundColor: "#FFF",
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    width: "100%",
    alignItems: "center",
    borderWidth: 0.5,
    borderColor: "#D4C4A0",
  },
  msgWin: { backgroundColor: "#FEF9C3", borderColor: "#F59E0B" },
  msgTxt: {
    fontSize: 14,
    fontWeight: "600",
    color: "#3A2010",
    textAlign: "center",
  },

  boardWrap: {
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.28,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
    marginBottom: 8,
  },

  // Panel choix capture
  choicePanel: {
    width: "100%",
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: "#E0D4C0",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  choiceTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#3A2010",
    textAlign: "center",
    marginBottom: 12,
  },
  choiceRow: { flexDirection: "row", gap: 10, marginBottom: 8 },
  choiceBtn: {
    flex: 1,
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
    borderWidth: 2,
  },
  choiceBtnRed: {
    backgroundColor: "rgba(239,68,68,0.08)",
    borderColor: "#EF4444",
  },
  choiceBtnBlue: {
    backgroundColor: "rgba(59,130,246,0.08)",
    borderColor: "#3B82F6",
  },
  choiceBtnIcon: { fontSize: 22, marginBottom: 2 },
  choiceBtnLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 2,
  },
  choiceBtnCount: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666",
    marginBottom: 6,
  },
  choiceVictimRow: {
    flexDirection: "row",
    gap: 4,
    flexWrap: "wrap",
    justifyContent: "center",
    marginBottom: 4,
  },
  choiceVictimDot: { width: 10, height: 10, borderRadius: 5 },
  choiceBtnSub: { fontSize: 11, color: "#999" },
  choiceCancelBtn: { alignItems: "center", paddingVertical: 6 },
  choiceCancelTxt: { fontSize: 13, color: "#999" },

  legendRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 6,
    justifyContent: "center",
  },
  legItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legDot: { width: 14, height: 14, borderRadius: 7, borderWidth: 1.5 },
  legTxt: { fontSize: 11, color: "#6B5040" },

  btnRow: { flexDirection: "row", gap: 10, marginBottom: 12, width: "100%" },
  btnR: {
    flex: 1,
    backgroundColor: "#C84B30",
    borderRadius: 8,
    paddingVertical: 11,
    alignItems: "center",
  },
  btnW: {
    flex: 1,
    backgroundColor: "#FFF",
    borderRadius: 8,
    paddingVertical: 11,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D4C4A0",
  },
  btnTxtW: { color: "#FFF", fontWeight: "700", fontSize: 13 },
  btnTxtB: { color: "#5A3010", fontWeight: "600", fontSize: 13 },

  rulesWrap: { width: "100%", marginBottom: 16 },
  rulesH: {
    fontSize: 16,
    fontWeight: "700",
    color: "#3A2010",
    marginBottom: 10,
    textAlign: "center",
  },
  ruleCard: {
    backgroundColor: "#FFF",
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  ruleTitle: { fontSize: 14, fontWeight: "700", marginBottom: 6 },
  ruleTxt: { fontSize: 13, color: "#4A3A2A", lineHeight: 21 },

  hist: {
    width: "100%",
    backgroundColor: "#FFF",
    borderRadius: 10,
    padding: 12,
    borderWidth: 0.5,
    borderColor: "#E0D4C0",
  },
  histTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#8B6040",
    marginBottom: 6,
  },
  histItem: { fontSize: 12, color: "#6A5040", paddingVertical: 2 },
  histType: { color: "#AAA", fontSize: 11 },
});
