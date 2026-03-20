/**
 * useFanorona — Hook contenant toute la logique du jeu Fanorona 9
 * Séparé de l'UI pour une meilleure maintenabilité
 */

import { useState, useCallback, useEffect } from "react";

// ─── CONSTANTES ────────────────────────────────────────────────────────────
export const COLS = 9;
export const ROWS = 5;
export const EMPTY = 0;
export const RED = 1;
export const DARK = 2;

export type Player = typeof RED | typeof DARK;
export type Cell = typeof EMPTY | typeof RED | typeof DARK;
export type Board = Cell[][];
export type Coord = [number, number];

export interface Move {
  from: Coord;
  to: Coord;
  type: "approach" | "retreat" | "paika";
  captured: Coord[];
}

export interface PendingChoice {
  appMove: Move;
  retMove: Move;
}

export interface ChainInfo {
  dc: number;
  dr: number;
  type: string;
}

// ─── HELPERS GÉOMÉTRIE ─────────────────────────────────────────────────────
export const key = (c: number, r: number) => `${c},${r}`;
export const inBounds = (c: number, r: number) =>
  c >= 0 && c < COLS && r >= 0 && r < ROWS;

export const hasDiag = (c: number, r: number): boolean => {
  if ((c + r) % 2 !== 0) return false;
  if (c === 4 && r === 2) return false;
  return true;
};

export const diagSegExists = (
  c1: number,
  r1: number,
  c2: number,
  r2: number
) => hasDiag(c1, r1) || hasDiag(c2, r2);

export const getDirs = (c: number, r: number): Coord[] => {
  const dirs: Coord[] = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  if (hasDiag(c, r))
    dirs.push([1, 1], [1, -1], [-1, 1], [-1, -1]);
  return dirs;
};

// ─── SEGMENTS DU PLATEAU ──────────────────────────────────────────────────
export const buildSegments = (): [number, number, number, number][] => {
  const segs: [number, number, number, number][] = [];
  const seen = new Set<string>();
  const add = (c1: number, r1: number, c2: number, r2: number) => {
    const a = `${c1},${r1},${c2},${r2}`;
    const b = `${c2},${r2},${c1},${r1}`;
    if (seen.has(a) || seen.has(b)) return;
    seen.add(a);
    segs.push([c1, r1, c2, r2]);
  };
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      if (inBounds(c + 1, r)) add(c, r, c + 1, r);
      if (inBounds(c, r + 1)) add(c, r, c, r + 1);
      ([
        [1, 1],
        [1, -1],
      ] as Coord[]).forEach(([dc, dr]) => {
        const nc = c + dc, nr = r + dr;
        if (inBounds(nc, nr) && diagSegExists(c, r, nc, nr))
          add(c, r, nc, nr);
      });
    }
  return segs;
};

export const SEGMENTS = buildSegments();
export const SEG_ORTHO = SEGMENTS.filter(
  ([c1, r1, c2, r2]) => c1 === c2 || r1 === r2
);
export const SEG_DIAG = SEGMENTS.filter(
  ([c1, r1, c2, r2]) => c1 !== c2 && r1 !== r2
);

// ─── POSITION INITIALE ─────────────────────────────────────────────────────
const MID_ROW: Cell[] = [DARK, RED, DARK, RED, EMPTY, DARK, RED, DARK, RED];

export const initBoard = (): Board => {
  const b: Board = Array.from({ length: ROWS }, () =>
    Array(COLS).fill(EMPTY)
  );
  for (let c = 0; c < COLS; c++) {
    b[0][c] = DARK;
    b[1][c] = DARK;
    b[2][c] = MID_ROW[c];
    b[3][c] = RED;
    b[4][c] = RED;
  }
  return b;
};

// ─── LOGIQUE CAPTURES ─────────────────────────────────────────────────────
export const opp = (p: Player): Player => (p === RED ? DARK : RED);

const collectLine = (
  board: Board,
  sc: number,
  sr: number,
  dc: number,
  dr: number,
  enemy: Player
): Coord[] => {
  const list: Coord[] = [];
  let nc = sc + dc, nr = sr + dr;
  while (inBounds(nc, nr) && board[nr][nc] === enemy) {
    list.push([nc, nr]);
    nc += dc;
    nr += dr;
  }
  return list;
};

export const getCaptures = (
  board: Board,
  fc: number,
  fr: number,
  tc: number,
  tr: number,
  player: Player
) => {
  const enemy = opp(player);
  const dc = tc - fc, dr = tr - fr;
  return {
    approach: collectLine(board, tc, tr, dc, dr, enemy),
    retreat: collectLine(board, fc, fr, -dc, -dr, enemy),
  };
};

export const canMove = (
  board: Board,
  fc: number,
  fr: number,
  tc: number,
  tr: number
): boolean => {
  if (!inBounds(tc, tr) || board[tr][tc] !== EMPTY) return false;
  const dc = tc - fc, dr = tr - fr;
  if (Math.abs(dc) > 1 || Math.abs(dr) > 1) return false;
  if (dc === 0 || dr === 0) return true;
  return diagSegExists(fc, fr, tc, tr);
};

export const allCaptureMoves = (board: Board, player: Player): Move[] => {
  const moves: Move[] = [];
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      if (board[r][c] !== player) continue;
      for (const [dc, dr] of getDirs(c, r)) {
        const tc = c + dc, tr = r + dr;
        if (!canMove(board, c, r, tc, tr)) continue;
        const { approach, retreat } = getCaptures(board, c, r, tc, tr, player);
        if (approach.length > 0)
          moves.push({ from: [c, r], to: [tc, tr], type: "approach", captured: approach });
        if (retreat.length > 0)
          moves.push({ from: [c, r], to: [tc, tr], type: "retreat", captured: retreat });
      }
    }
  return moves;
};

export const allPaikaMoves = (board: Board, player: Player): Move[] => {
  const moves: Move[] = [];
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      if (board[r][c] !== player) continue;
      for (const [dc, dr] of getDirs(c, r)) {
        const tc = c + dc, tr = r + dr;
        if (canMove(board, c, r, tc, tr))
          moves.push({ from: [c, r], to: [tc, tr], type: "paika", captured: [] });
      }
    }
  return moves;
};

export const applyMove = (
  board: Board,
  from: Coord,
  to: Coord,
  captured: Coord[]
): Board => {
  const nb = board.map((r) => [...r]) as Board;
  nb[to[1]][to[0]] = nb[from[1]][from[0]];
  nb[from[1]][from[0]] = EMPTY;
  for (const [cc, cr] of captured) nb[cr][cc] = EMPTY;
  return nb;
};

export const getContinuations = (
  board: Board,
  c: number,
  r: number,
  player: Player,
  lastDC: number,
  lastDR: number,
  lastType: string
): Move[] => {
  const moves: Move[] = [];
  for (const [dc, dr] of getDirs(c, r)) {
    if (dc === -lastDC && dr === -lastDR) continue;
    const tc = c + dc, tr = r + dr;
    if (!canMove(board, c, r, tc, tr)) continue;
    const { approach, retreat } = getCaptures(board, c, r, tc, tr, player);
    if (
      approach.length > 0 &&
      !(dc === lastDC && dr === lastDR && lastType === "approach")
    )
      moves.push({ from: [c, r], to: [tc, tr], type: "approach", captured: approach });
    if (
      retreat.length > 0 &&
      !(dc === lastDC && dr === lastDR && lastType === "retreat")
    )
      moves.push({ from: [c, r], to: [tc, tr], type: "retreat", captured: retreat });
  }
  return moves;
};

export const countPieces = (board: Board) => {
  let red = 0, dark = 0;
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      if (board[r][c] === RED) red++;
      if (board[r][c] === DARK) dark++;
    }
  return { red, dark };
};

// ─── HOOK PRINCIPAL ────────────────────────────────────────────────────────
export function useFanorona() {
  const [board, setBoard] = useState<Board>(initBoard);
  const [player, setPlayer] = useState<Player>(RED);
  const [selected, setSelected] = useState<Coord | null>(null);
  const [phase, setPhase] = useState<"select" | "move" | "continue">("select");
  const [hints, setHints] = useState<Map<string, string>>(new Map());
  const [victims, setVictims] = useState<[string, string][]>([]);
  const [capturingSet, setCapturingSet] = useState<Set<string>>(new Set());
  const [pendingChoice, setPendingChoice] = useState<PendingChoice | null>(null);
  const [contMoves, setContMoves] = useState<Move[]>([]);
  const [chainInfo, setChainInfo] = useState<ChainInfo | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [message, setMessage] = useState("🔴 Rouge commence !");
  const [scores, setScores] = useState({ red: 0, dark: 0 });
  const [history, setHistory] = useState<Move[]>([]);
  const [winner, setWinner] = useState<Player | null>(null);

  const globalHints = useCallback((b: Board, pl: Player) => {
    const caps = allCaptureMoves(b, pl);
    const pks = caps.length === 0 ? allPaikaMoves(b, pl) : [];
    const h = new Map<string, string>();
    const cs = new Set<string>();
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

  const pieceHints = useCallback(
    (b: Board, pl: Player, pc: number, pr: number) => {
      const caps = allCaptureMoves(b, pl);
      const pks = caps.length === 0 ? allPaikaMoves(b, pl) : [];
      const h = new Map<string, string>();
      const pieceCaps = caps.filter(
        (m) => m.from[0] === pc && m.from[1] === pr
      );
      const piecePks = pks.filter(
        (m) => m.from[0] === pc && m.from[1] === pr
      );
      const victimMap = new Map<string, { app: Coord[]; ret: Coord[] }>();
      for (const m of pieceCaps) {
        h.set(key(m.to[0], m.to[1]), "capture");
        const dk = key(m.to[0], m.to[1]);
        if (!victimMap.has(dk)) victimMap.set(dk, { app: [], ret: [] });
        if (m.type === "approach") victimMap.get(dk)!.app.push(...m.captured);
        if (m.type === "retreat") victimMap.get(dk)!.ret.push(...m.captured);
      }
      for (const m of piecePks) h.set(key(m.to[0], m.to[1]), "paika");
      const vlist: [string, string][] = [];
      for (const [, { app, ret }] of victimMap) {
        for (const [vc, vr] of app) vlist.push([key(vc, vr), "approach"]);
        for (const [vc, vr] of ret) vlist.push([key(vc, vr), "retreat"]);
      }
      const seen = new Map<string, string>();
      for (const [k, t] of vlist) {
        if (!seen.has(k)) seen.set(k, t);
      }
      return {
        h,
        victims: Array.from(seen.entries()) as [string, string][],
        pieceCaps,
        piecePks,
      };
    },
    []
  );

  const contHints = useCallback((contList: Move[]) => {
    const h = new Map<string, string>();
    const victimMap = new Map<string, { app: Coord[]; ret: Coord[] }>();
    for (const m of contList) {
      h.set(key(m.to[0], m.to[1]), "continuation");
      const dk = key(m.to[0], m.to[1]);
      if (!victimMap.has(dk)) victimMap.set(dk, { app: [], ret: [] });
      if (m.type === "approach") victimMap.get(dk)!.app.push(...m.captured);
      if (m.type === "retreat") victimMap.get(dk)!.ret.push(...m.captured);
    }
    const vlist: [string, string][] = [];
    for (const [, { app, ret }] of victimMap) {
      for (const [vc, vr] of app) vlist.push([key(vc, vr), "approach"]);
      for (const [vc, vr] of ret) vlist.push([key(vc, vr), "retreat"]);
    }
    const seen = new Map<string, string>();
    for (const [k, t] of vlist) {
      if (!seen.has(k)) seen.set(k, t);
    }
    return { h, victims: Array.from(seen.entries()) as [string, string][] };
  }, []);

  useEffect(() => {
    const b = initBoard();
    const { h, cs } = globalHints(b, RED);
    setHints(h);
    setCapturingSet(cs);
  }, []);

  const endTurn = useCallback(
    (nb: Board) => {
      const next = player === RED ? DARK : RED;
      const { red, dark } = countPieces(nb);
      const checkWin = (w: Player) => {
        setGameOver(true);
        setWinner(w);
        setMessage(
          w === RED ? "🔴 Rouge remporte la partie !" : "⚫ Noir remporte la partie !"
        );
        setScores((s) => ({
          red: s.red + (w === RED ? 1 : 0),
          dark: s.dark + (w === DARK ? 1 : 0),
        }));
        setHints(new Map());
        setVictims([]);
        setCapturingSet(new Set());
      };
      if (red === 0) { checkWin(DARK); return; }
      if (dark === 0) { checkWin(RED); return; }
      const nc = allCaptureMoves(nb, next);
      const np = nc.length === 0 ? allPaikaMoves(nb, next) : [];
      if (nc.length === 0 && np.length === 0) { checkWin(player); return; }
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
    [player, globalHints]
  );

  const doCapture = useCallback(
    (b: Board, move: Move) => {
      const nb = applyMove(b, move.from, move.to, move.captured);
      setBoard(nb);
      setHistory((h) => [...h.slice(-19), move]);
      setPendingChoice(null);
      const dc = move.to[0] - move.from[0];
      const dr = move.to[1] - move.from[1];
      const cont = getContinuations(nb, move.to[0], move.to[1], player, dc, dr, move.type);
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
        setMessage("🔗 Capture en chaîne ! Continuez ou touchez votre pièce pour terminer.");
      }
    },
    [player, endTurn, contHints]
  );

  const handlePress = useCallback(
    (c: number, r: number) => {
      if (gameOver) return;
      if (pendingChoice) {
        setPendingChoice(null);
        setMessage("Choix annulé. Sélectionnez à nouveau.");
        return;
      }

      if (phase === "continue") {
        if (selected && selected[0] === c && selected[1] === r) {
          endTurn(board);
          return;
        }
        const move = contMoves.find((m) => m.to[0] === c && m.to[1] === r);
        if (!move) {
          setMessage("Touchez une destination orange ou votre pièce pour terminer.");
          return;
        }
        const appM = contMoves.find((m) => m.to[0] === c && m.to[1] === r && m.type === "approach");
        const retM = contMoves.find((m) => m.to[0] === c && m.to[1] === r && m.type === "retreat");
        if (appM && retM) {
          setPendingChoice({ appMove: appM, retMove: retM });
          const v: [string, string][] = [];
          appM.captured.forEach(([vc, vr]) => v.push([key(vc, vr), "approach"]));
          retM.captured.forEach(([vc, vr]) => v.push([key(vc, vr), "retreat"]));
          setVictims(v);
          setMessage("Choisissez le type de capture ci-dessous.");
        } else {
          doCapture(board, move);
        }
        return;
      }

      if (phase === "select") {
        if (board[r][c] !== player) {
          if (board[r][c] !== EMPTY) setMessage("⚠️ Ce n'est pas votre pièce !");
          return;
        }
        const caps = allCaptureMoves(board, player);
        const pks = caps.length === 0 ? allPaikaMoves(board, player) : [];
        const pieceCaps = caps.filter((m) => m.from[0] === c && m.from[1] === r);
        const piecePks = pks.filter((m) => m.from[0] === pc && m.from[1] === pr);
        // fix: use c,r not pc,pr
        const piecePksFixed = pks.filter((m) => m.from[0] === c && m.from[1] === r);
        if (caps.length > 0 && pieceCaps.length === 0) {
          setMessage("⚠️ Capture obligatoire ! Choisissez une pièce avec halo orange.");
          return;
        }
        if (pieceCaps.length === 0 && piecePksFixed.length === 0) {
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
          setMessage("🎯 Touchez une destination rouge (X = pièces capturées).");
        else setMessage("🕊️ Paika — touchez où bouger (vert).");
        return;
      }

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
          const caps = allCaptureMoves(board, player);
          const pieceCaps = caps.filter((m) => m.from[0] === c && m.from[1] === r);
          if (caps.length > 0 && pieceCaps.length === 0) {
            setMessage("⚠️ Capture obligatoire !");
            const { h, cs } = globalHints(board, player);
            setHints(h);
            setVictims([]);
            setCapturingSet(cs);
            setSelected(null);
            setPhase("select");
            return;
          }
          setSelected([c, r]);
          setPhase("move");
          const { h, victims } = pieceHints(board, player, c, r);
          setHints(h);
          setVictims(victims);
          setCapturingSet(new Set());
          if (pieceCaps.length > 0) setMessage("🎯 Touchez une destination rouge.");
          else setMessage("🕊️ Paika — touchez où bouger.");
          return;
        }

        const caps = allCaptureMoves(board, player);
        const isPaika = caps.length === 0;
        if (isPaika) {
          if (!canMove(board, selected![0], selected![1], c, r)) {
            setMessage("Destination invalide. Choisissez une case verte.");
            return;
          }
          const nb = applyMove(board, selected!, [c, r], []);
          setBoard(nb);
          setHistory((h) => [...h.slice(-19), { from: selected!, to: [c, r], type: "paika", captured: [] }]);
          endTurn(nb);
          return;
        }

        const destCaps = caps.filter(
          (m) => m.from[0] === selected![0] && m.from[1] === selected![1] && m.to[0] === c && m.to[1] === r
        );
        if (destCaps.length === 0) {
          setMessage("Destination invalide. Choisissez une case rouge.");
          return;
        }
        const appM = destCaps.find((m) => m.type === "approach");
        const retM = destCaps.find((m) => m.type === "retreat");
        if (appM && retM) {
          setPendingChoice({ appMove: appM, retMove: retM });
          const v: [string, string][] = [];
          appM.captured.forEach(([vc, vr]) => v.push([key(vc, vr), "approach"]));
          retM.captured.forEach(([vc, vr]) => v.push([key(vc, vr), "retreat"]));
          setVictims(v);
          setMessage("Choisissez le type de capture ci-dessous ↓");
        } else {
          doCapture(board, appM || retM!);
        }
      }
    },
    [board, player, selected, phase, contMoves, pendingChoice, gameOver, endTurn, doCapture, globalHints, pieceHints]
  );

  const resetGame = useCallback(() => {
    const b = initBoard();
    setBoard(b);
    setPlayer(RED);
    setSelected(null);
    setPhase("select");
    setGameOver(false);
    setWinner(null);
    setHistory([]);
    setChainInfo(null);
    setContMoves([]);
    setPendingChoice(null);
    const { h, cs } = globalHints(b, RED);
    setHints(h);
    setVictims([]);
    setCapturingSet(cs);
    setMessage("🔴 Rouge commence !");
  }, [globalHints]);

  return {
    board, player, selected, phase, hints, victims, capturingSet,
    pendingChoice, setPendingChoice, contMoves, chainInfo,
    gameOver, winner, message, scores, history,
    handlePress, doCapture, endTurn, resetGame,
    pieceHints, setHints, setVictims,
  };
}
