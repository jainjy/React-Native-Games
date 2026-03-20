/**
 * FanoronaBoard — Composant SVG du plateau de jeu
 */

import React from "react";
import { Dimensions } from "react-native";
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
import {
  ROWS, COLS, EMPTY, RED, DARK,
  Board, Coord,
  SEG_ORTHO, SEG_DIAG,
  key,
} from "../hooks/useFanorona";

const { width: SW } = Dimensions.get("window");

export const BOARD_W = Math.min(SW - 16, 440);
const PAD_H = 32;
const PAD_V = 30;
export const BOARD_H = BOARD_W * 0.55 + PAD_V * 2;
const CW = (BOARD_W - PAD_H * 2) / (COLS - 1);
const CH = (BOARD_H - PAD_V * 2) / (ROWS - 1);
export const PR = Math.min(CW, CH) * 0.38;

export const gx = (c: number) => PAD_H + c * CW;
export const gy = (r: number) => PAD_V + r * CH;

// ─── PIECE ────────────────────────────────────────────────────────────────
const Piece = ({
  cx, cy, color, selected, canCapture,
}: {
  cx: number; cy: number; color: number;
  selected: boolean; canCapture: boolean;
}) => {
  const isRed = color === RED;
  const fill = isRed ? "#D4503A" : "#1A1A1A";
  const stroke = isRed ? "#8B2500" : "#000";
  const shine = isRed ? "rgba(255,180,150,0.6)" : "rgba(255,255,255,0.22)";
  const rim = isRed ? "#FF7050" : "#444";
  return (
    <G>
      {selected && (
        <Circle cx={cx} cy={cy} r={PR + 7}
          fill="rgba(255,215,0,0.15)"
          stroke="#FFD700" strokeWidth={2.5} strokeDasharray="5,3" />
      )}
      {canCapture && !selected && (
        <Circle cx={cx} cy={cy} r={PR + 5}
          fill="rgba(251,146,60,0.2)"
          stroke="#F97316" strokeWidth={1.5} />
      )}
      {/* Shadow */}
      <Circle cx={cx + 2} cy={cy + 3} r={PR} fill="rgba(0,0,0,0.35)" />
      {/* Body */}
      <Circle cx={cx} cy={cy} r={PR} fill={fill} />
      {/* Rim */}
      <Circle cx={cx} cy={cy} r={PR} fill="none" stroke={stroke} strokeWidth={1.5} />
      {/* Inner ring */}
      <Circle cx={cx} cy={cy} r={PR * 0.68}
        fill="none" stroke={rim} strokeWidth={0.8} opacity={0.4} />
      {/* Shine */}
      <Circle cx={cx - PR * 0.28} cy={cy - PR * 0.3} r={PR * 0.32} fill={shine} />
      {/* Top micro-shine */}
      <Circle cx={cx - PR * 0.18} cy={cy - PR * 0.42} r={PR * 0.1}
        fill="rgba(255,255,255,0.7)" />
    </G>
  );
};

// ─── MOVE HINTS ───────────────────────────────────────────────────────────
const MoveHint = ({ cx, cy, hintType }: { cx: number; cy: number; hintType: string }) => {
  if (hintType === "paika")
    return (
      <G>
        <Circle cx={cx} cy={cy} r={PR * 0.52}
          fill="rgba(34,197,94,0.25)" stroke="#16A34A" strokeWidth={2} />
        <Circle cx={cx} cy={cy} r={PR * 0.22} fill="#22C55E" />
      </G>
    );
  if (hintType === "capture")
    return (
      <G>
        <Circle cx={cx} cy={cy} r={PR * 0.56}
          fill="rgba(239,68,68,0.3)" stroke="#EF4444" strokeWidth={2} />
        <Circle cx={cx} cy={cy} r={PR * 0.24} fill="#DC2626" />
      </G>
    );
  if (hintType === "continuation")
    return (
      <G>
        <Circle cx={cx} cy={cy} r={PR * 0.6}
          fill="rgba(249,115,22,0.35)" stroke="#F97316" strokeWidth={2} />
        <Circle cx={cx} cy={cy} r={PR * 0.37}
          fill="none" stroke="#FED7AA" strokeWidth={1} strokeDasharray="3,2" />
        <Circle cx={cx} cy={cy} r={PR * 0.2} fill="#FB923C" />
      </G>
    );
  return null;
};

// ─── VICTIM MARK ──────────────────────────────────────────────────────────
const VictimMark = ({
  cx, cy, victimType,
}: { cx: number; cy: number; victimType: string }) => {
  const color = victimType === "retreat" ? "#3B82F6" : "#EF4444";
  const fill = victimType === "retreat"
    ? "rgba(59,130,246,0.18)"
    : "rgba(239,68,68,0.18)";
  return (
    <G>
      <Circle cx={cx} cy={cy} r={PR * 0.62}
        fill={fill} stroke={color} strokeWidth={1.5} strokeDasharray="4,2" />
      <Line
        x1={cx - PR * 0.38} y1={cy - PR * 0.38}
        x2={cx + PR * 0.38} y2={cy + PR * 0.38}
        stroke={color} strokeWidth={2.5} strokeLinecap="round" />
      <Line
        x1={cx + PR * 0.38} y1={cy - PR * 0.38}
        x2={cx - PR * 0.38} y2={cy + PR * 0.38}
        stroke={color} strokeWidth={2.5} strokeLinecap="round" />
    </G>
  );
};

// ─── BOARD ────────────────────────────────────────────────────────────────
interface FanoronaBoardProps {
  board: Board;
  selected: Coord | null;
  hints: Map<string, string>;
  victims: [string, string][];
  capturingSet: Set<string>;
  onPress: (c: number, r: number) => void;
}

export const FanoronaBoard: React.FC<FanoronaBoardProps> = ({
  board, selected, hints, victims, capturingSet, onPress,
}) => (
  <Svg width={BOARD_W} height={BOARD_H}>
    <Defs>
      <RadialGradient id="bg" cx="50%" cy="40%" rx="60%" ry="60%">
        <Stop offset="0%" stopColor="#C8932A" />
        <Stop offset="60%" stopColor="#9A6A18" />
        <Stop offset="100%" stopColor="#6B4410" />
      </RadialGradient>
      <LinearGradient id="woodGrain" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0%" stopColor="rgba(255,220,130,0.12)" />
        <Stop offset="50%" stopColor="rgba(255,200,100,0.04)" />
        <Stop offset="100%" stopColor="rgba(100,50,0,0.15)" />
      </LinearGradient>
      <LinearGradient id="zR" x1="0" y1="0" x2="1" y2="0">
        <Stop offset="0%" stopColor="rgba(200,80,30,0.18)" />
        <Stop offset="100%" stopColor="rgba(200,80,30,0.02)" />
      </LinearGradient>
      <LinearGradient id="zD" x1="0" y1="0" x2="1" y2="0">
        <Stop offset="0%" stopColor="rgba(0,0,0,0.02)" />
        <Stop offset="100%" stopColor="rgba(0,0,0,0.14)" />
      </LinearGradient>
    </Defs>

    {/* Fond bois */}
    <Rect x={0} y={0} width={BOARD_W} height={BOARD_H} rx={14} fill="url(#bg)" />
    <Rect x={0} y={0} width={BOARD_W} height={BOARD_H} rx={14} fill="url(#woodGrain)" />

    {/* Bordure */}
    <Rect x={2} y={2} width={BOARD_W - 4} height={BOARD_H - 4}
      rx={12} fill="none" stroke="rgba(80,35,5,0.9)" strokeWidth={2.5} />
    <Rect x={5} y={5} width={BOARD_W - 10} height={BOARD_H - 10}
      rx={10} fill="none" stroke="rgba(220,160,60,0.25)" strokeWidth={1} />

    {/* Zones colorées légères */}
    <Rect x={2} y={2} width={BOARD_W / 2 - 2} height={BOARD_H - 4}
      rx={12} fill="url(#zR)" />
    <Rect x={BOARD_W / 2} y={2} width={BOARD_W / 2 - 4} height={BOARD_H - 4}
      rx={12} fill="url(#zD)" />

    {/* Zone centrale */}
    <Rect
      x={gx(3) - CW * 0.5 + 2} y={gy(1) - CH * 0.5 + 2}
      width={CW * 3 - 4} height={CH * 3 - 4}
      rx={4} fill="rgba(120,80,20,0.18)"
      stroke="rgba(80,40,0,0.3)" strokeWidth={1} />

    {/* Lignes diagonales */}
    {SEG_DIAG.map(([c1, r1, c2, r2], i) => (
      <Line key={"d" + i}
        x1={gx(c1)} y1={gy(r1)} x2={gx(c2)} y2={gy(r2)}
        stroke="rgba(60,28,5,0.55)" strokeWidth={0.9} />
    ))}

    {/* Lignes orthogonales */}
    {SEG_ORTHO.map(([c1, r1, c2, r2], i) => (
      <Line key={"o" + i}
        x1={gx(c1)} y1={gy(r1)} x2={gx(c2)} y2={gy(r2)}
        stroke="rgba(60,28,5,0.8)" strokeWidth={1.6} />
    ))}

    {/* Intersection dots */}
    {Array.from({ length: ROWS }, (_, r) =>
      Array.from({ length: COLS }, (_, c) => (
        <Circle key={`dot-${c}-${r}`}
          cx={gx(c)} cy={gy(r)} r={1.8}
          fill="rgba(50,22,3,0.5)" />
      ))
    )}

    {/* Hints */}
    {Array.from({ length: ROWS }, (_, r) =>
      Array.from({ length: COLS }, (_, c) => {
        const h = hints?.get(key(c, r));
        return h ? (
          <MoveHint key={"h" + key(c, r)} cx={gx(c)} cy={gy(r)} hintType={h} />
        ) : null;
      })
    )}

    {/* Pièces */}
    {Array.from({ length: ROWS }, (_, r) =>
      Array.from({ length: COLS }, (_, c) => {
        const cell = board[r][c];
        if (cell === EMPTY) {
          if (c === 4 && r === 2)
            return (
              <Circle key="ctr" cx={gx(4)} cy={gy(2)} r={PR * 0.3}
                fill="none" stroke="rgba(80,40,5,0.5)" strokeWidth={1} opacity={0.7} />
            );
          return null;
        }
        const k = key(c, r);
        return (
          <Piece key={k}
            cx={gx(c)} cy={gy(r)} color={cell}
            selected={!!(selected && selected[0] === c && selected[1] === r)}
            canCapture={!!(
              capturingSet?.has(k) &&
              !(selected && selected[0] === c && selected[1] === r)
            )} />
        );
      })
    )}

    {/* Victim marks */}
    {victims &&
      Array.from(victims).map(([k, t]) => {
        const [c, r] = k.split(",").map(Number);
        return <VictimMark key={"v" + k} cx={gx(c)} cy={gy(r)} victimType={t} />;
      })}

    {/* Touch zones */}
    {Array.from({ length: ROWS }, (_, r) =>
      Array.from({ length: COLS }, (_, c) => (
        <Rect key={"t" + key(c, r)}
          x={gx(c) - CW / 2} y={gy(r) - CH / 2}
          width={CW} height={CH}
          fill="transparent"
          onPress={() => onPress(c, r)} />
      ))
    )}
  </Svg>
);
