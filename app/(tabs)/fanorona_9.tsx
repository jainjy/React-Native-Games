import React, { useEffect, useReducer, useRef, useState } from "react";
import {
  Alert,
  Image,
  ImageBackground,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// ---------- TYPES ----------
type Player = "white" | "black" | null;
type Position = { row: number; col: number };
type Direction = { dr: number; dc: number };
type CaptureType = "approach" | "withdrawal";
type Move = {
  from: Position;
  to: Position;
  approachCaptures: Position[];
  withdrawalCaptures: Position[];
  isBoth: boolean;
};

// ---------- CONSTANTES ----------
const ROWS = 5;
const COLS = 9;
const WHITE: Player = "white";
const BLACK: Player = "black";
const EMPTY: Player = null;

const DIRECTIONS: [number, number][] = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
];

// ---------- ÉTAT INITIAL ----------
const createInitialBoard = (): Player[][] => {
  const board = Array(ROWS)
    .fill(undefined)
    .map(() => Array(COLS).fill(EMPTY));

  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < COLS; c++) board[r][c] = WHITE;
  }
  for (let r = 3; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) board[r][c] = BLACK;
  }

  board[2][0] = WHITE;
  board[2][1] = BLACK;
  board[2][2] = WHITE;
  board[2][3] = BLACK;
  board[2][4] = EMPTY;
  board[2][5] = WHITE;
  board[2][6] = BLACK;
  board[2][7] = WHITE;
  board[2][8] = BLACK;

  return board;
};

type GameState = {
  board: Player[][];
  currentPlayer: Player;
  selected: Position | null;
  activePiece: Position | null;
  visited: string[];
  lastDirection: Direction | null;
  moveInProgress: boolean;
  pendingMove: {
    from: Position;
    to: Position;
    approachCaptures: Position[];
    withdrawalCaptures: Position[];
  } | null;
  gameOver: boolean;
  winner: Player | null;
};

const initialState: GameState = {
  board: createInitialBoard(),
  currentPlayer: WHITE,
  selected: null,
  activePiece: null,
  visited: [],
  lastDirection: null,
  moveInProgress: false,
  pendingMove: null,
  gameOver: false,
  winner: null,
};

// ---------- FONCTIONS DE JEU ----------
function inBounds(r: number, c: number): boolean {
  return r >= 0 && r < ROWS && c >= 0 && c < COLS;
}

function getCapturedPieces(
  board: Player[][],
  fromRow: number,
  fromCol: number,
  toRow: number,
  toCol: number,
  type: CaptureType,
): Position[] {
  const direction = { dr: toRow - fromRow, dc: toCol - fromCol };
  const opponent = board[fromRow][fromCol] === WHITE ? BLACK : WHITE;
  let captured: Position[] = [];
  let r: number, c: number, step: Direction;

  if (type === "approach") {
    step = direction;
    r = toRow + step.dr;
    c = toCol + step.dc;
  } else {
    step = { dr: -direction.dr, dc: -direction.dc };
    r = fromRow + step.dr;
    c = fromCol + step.dc;
  }

  while (inBounds(r, c) && board[r][c] === opponent) {
    captured.push({ row: r, col: c });
    r += step.dr;
    c += step.dc;
  }
  return captured;
}

function getLegalMovesForPiece(
  board: Player[][],
  row: number,
  col: number,
  currentPlayer: Player,
  activePiece: Position | null = null,
  visited: string[] = [],
  lastDirection: Direction | null = null,
  forceCaptureOnly: boolean = false,
): Move[] {
  if (board[row][col] !== currentPlayer) return [];
  if (activePiece && (row !== activePiece.row || col !== activePiece.col))
    return [];

  const moves: Move[] = [];

  for (const d of DIRECTIONS) {
    const nr = row + d[0];
    const nc = col + d[1];
    if (!inBounds(nr, nc)) continue;
    if (board[nr][nc] !== EMPTY) continue;
    if (visited.includes(`${nr},${nc}`)) continue;
    if (lastDirection && d[0] === lastDirection.dr && d[1] === lastDirection.dc)
      continue;

    const approachCaptures = getCapturedPieces(
      board,
      row,
      col,
      nr,
      nc,
      "approach",
    );
    const withdrawalCaptures = getCapturedPieces(
      board,
      row,
      col,
      nr,
      nc,
      "withdrawal",
    );

    if (
      forceCaptureOnly &&
      approachCaptures.length === 0 &&
      withdrawalCaptures.length === 0
    )
      continue;

    moves.push({
      from: { row, col },
      to: { row: nr, col: nc },
      approachCaptures,
      withdrawalCaptures,
      isBoth: approachCaptures.length > 0 && withdrawalCaptures.length > 0,
    });
  }
  return moves;
}

function hasAnyLegalMove(
  board: Player[][],
  player: Player,
  activePiece: Position | null,
  visited: string[],
  lastDirection: Direction | null,
): boolean {
  const pieces: Position[] = [];
  if (activePiece) {
    pieces.push(activePiece);
  } else {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (board[r][c] === player) pieces.push({ row: r, col: c });
      }
    }
  }

  for (const p of pieces) {
    const moves = getLegalMovesForPiece(
      board,
      p.row,
      p.col,
      player,
      activePiece,
      visited,
      lastDirection,
      false,
    );
    if (moves.length > 0) return true;
  }
  return false;
}

function checkWinner(board: Player[][]): Player | null {
  let whiteCount = 0,
    blackCount = 0;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r][c] === WHITE) whiteCount++;
      if (board[r][c] === BLACK) blackCount++;
    }
  }
  if (whiteCount === 0) return BLACK;
  if (blackCount === 0) return WHITE;
  return null;
}

// ---------- ACTIONS ----------
type GameAction =
  | { type: "SELECT_PIECE"; payload: Position | null }
  | {
      type: "MOVE";
      payload: {
        from: Position;
        to: Position;
        captureType?: CaptureType | null;
        capturedPieces: Position[];
      };
    }
  | { type: "SET_PENDING_MOVE"; payload: GameState["pendingMove"] }
  | { type: "CLEAR_PENDING" }
  | { type: "GAME_OVER"; payload: Player }
  | { type: "RESET" };

// ---------- REDUCER ----------
const gameReducer = (state: GameState, action: GameAction): GameState => {
  switch (action.type) {
    case "SELECT_PIECE":
      return { ...state, selected: action.payload };

    case "MOVE": {
      const { from, to, capturedPieces } = action.payload;
      const newBoard = state.board.map((row) => [...row]);

      newBoard[to.row][to.col] = newBoard[from.row][from.col];
      newBoard[from.row][from.col] = EMPTY;
      capturedPieces.forEach((p) => {
        newBoard[p.row][p.col] = EMPTY;
      });

      const direction = { dr: to.row - from.row, dc: to.col - from.col };
      const newVisited = [
        ...state.visited,
        `${from.row},${from.col}`,
        `${to.row},${to.col}`,
      ];
      const uniqueVisited = [...new Set(newVisited)];

      const furtherCaptures = getLegalMovesForPiece(
        newBoard,
        to.row,
        to.col,
        state.currentPlayer,
        { row: to.row, col: to.col },
        uniqueVisited,
        direction,
        true,
      );

      let newState: GameState = {
        ...state,
        board: newBoard,
        visited: uniqueVisited,
        lastDirection: direction,
      };

      if (furtherCaptures.length > 0) {
        newState.activePiece = { row: to.row, col: to.col };
        newState.selected = { row: to.row, col: to.col };
        newState.moveInProgress = true;
        newState.pendingMove = null;
      } else {
        newState.currentPlayer = state.currentPlayer === WHITE ? BLACK : WHITE;
        newState.selected = null;
        newState.activePiece = null;
        newState.visited = [];
        newState.lastDirection = null;
        newState.moveInProgress = false;
        newState.pendingMove = null;
      }

      const winner = checkWinner(newBoard);
      if (winner) {
        newState.gameOver = true;
        newState.winner = winner;
      }
      return newState;
    }

    case "SET_PENDING_MOVE":
      return { ...state, pendingMove: action.payload };

    case "CLEAR_PENDING":
      return { ...state, pendingMove: null };

    case "GAME_OVER":
      return { ...state, gameOver: true, winner: action.payload };

    case "RESET":
      return { ...initialState, board: createInitialBoard() };

    default:
      return state;
  }
};

// ---------- COMPOSANT PRINCIPAL ----------
const App = () => {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  // ----- MODE DE JEU & SCORES -----
  const [gameMode, setGameMode] = useState<"2players" | "vsAI">("2players");
  const [whiteScore, setWhiteScore] = useState(0);
  const [blackScore, setBlackScore] = useState(0);
  const [isAIThinking, setIsAIThinking] = useState(false);
  const aiThinkingRef = useRef(false); // Évite les déclenchements multiples de l'IA

  useEffect(() => {
    if (state.gameOver && state.winner) {
      if (state.winner === WHITE) setWhiteScore((prev) => prev + 1);
      else if (state.winner === BLACK) setBlackScore((prev) => prev + 1);
    }
  }, [state.gameOver, state.winner]);

  // ----- DÉTECTION DU PAT (avec garde pour l'IA) -----
  useEffect(() => {
    if (state.gameOver || isAIThinking) return;
    // En mode vsIA, on ne déclare jamais le pat pendant le tour de l'IA – elle va jouer
    if (gameMode === "vsAI" && state.currentPlayer === BLACK) return;

    const board = state.board;
    const player = state.currentPlayer;
    if (
      !hasAnyLegalMove(
        board,
        player,
        state.activePiece,
        state.visited,
        state.lastDirection,
      )
    ) {
      const winner = player === WHITE ? BLACK : WHITE;
      Alert.alert(
        "Fin de partie",
        `Le joueur ${winner === WHITE ? "Blancs" : "Noirs"} gagne par immobilisation !`,
      );
      dispatch({ type: "GAME_OVER", payload: winner });
    }
  }, [
    state.currentPlayer,
    state.board,
    state.activePiece,
    state.visited,
    state.lastDirection,
    state.gameOver,
    gameMode,
    isAIThinking,
  ]);

  // ----- LOGIQUE IA (corrigée : captures multiples, pas de boucle infinie) -----
  useEffect(() => {
    // Conditions de déclenchement
    if (gameMode !== "vsAI") return;
    if (state.gameOver) return;
    if (state.currentPlayer !== BLACK) return;
    if (aiThinkingRef.current) return; // IA déjà en train de réfléchir

    const timer = setTimeout(() => {
      playAIMove();
    }, 600); // Petit délai pour voir "IA réfléchit..."

    aiThinkingRef.current = true;
    setIsAIThinking(true);

    return () => {
      clearTimeout(timer);
      // NE PAS réinitialiser le ref ici, sinon on annule le mouvement
    };
  }, [
    state.currentPlayer,
    state.gameOver,
    gameMode,
    state.activePiece, // Nécessaire pour les séquences de capture
    state.visited,
    state.lastDirection,
    state.moveInProgress,
  ]);

  const playAIMove = () => {
    try {
      const board = state.board;
      const player = BLACK;

      let allMoves: Move[] = [];

      if (state.activePiece) {
        // Séquence de capture : uniquement le pion actif, uniquement des captures
        allMoves = getLegalMovesForPiece(
          board,
          state.activePiece.row,
          state.activePiece.col,
          player,
          state.activePiece,
          state.visited,
          state.lastDirection,
          true, // forceCaptureOnly
        );
      } else {
        // Début de tour : toutes les pièces noires
        for (let r = 0; r < ROWS; r++) {
          for (let c = 0; c < COLS; c++) {
            if (board[r][c] === player) {
              const moves = getLegalMovesForPiece(
                board,
                r,
                c,
                player,
                null,
                [], // visited vide
                null, // lastDirection null
                false,
              );
              allMoves = allMoves.concat(moves);
            }
          }
        }
        // Si au moins une capture est possible, on ne garde que les captures
        const hasCapture = allMoves.some(
          (m) =>
            m.approachCaptures.length > 0 || m.withdrawalCaptures.length > 0,
        );
        if (hasCapture) {
          allMoves = allMoves.filter(
            (m) =>
              m.approachCaptures.length > 0 || m.withdrawalCaptures.length > 0,
          );
        }
      }

      console.log(`IA: ${allMoves.length} mouvement(s) trouvé(s)`);

      if (allMoves.length === 0) {
        Alert.alert("IA", "Aucun mouvement possible !");
        return;
      }

      const randomMove = allMoves[Math.floor(Math.random() * allMoves.length)];

      if (randomMove.isBoth) {
        const type: CaptureType =
          Math.random() < 0.5 ? "approach" : "withdrawal";
        const captured =
          type === "approach"
            ? randomMove.approachCaptures
            : randomMove.withdrawalCaptures;
        dispatch({
          type: "MOVE",
          payload: {
            from: randomMove.from,
            to: randomMove.to,
            captureType: type,
            capturedPieces: captured,
          },
        });
      } else {
        const captured =
          randomMove.approachCaptures.length > 0
            ? randomMove.approachCaptures
            : randomMove.withdrawalCaptures;
        dispatch({
          type: "MOVE",
          payload: {
            from: randomMove.from,
            to: randomMove.to,
            captureType: randomMove.approachCaptures.length
              ? "approach"
              : "withdrawal",
            capturedPieces: captured,
          },
        });
      }
    } catch (error) {
      console.error("Erreur IA:", error);
    } finally {
      // Nettoyage synchrone – plus de queueMicrotask
      aiThinkingRef.current = false;
      setIsAIThinking(false);
    }
  };

  // ----- GESTION DES INTERACTIONS UTILISATEUR -----
  const handleSelect = (row: number, col: number) => {
    if (state.gameOver) return;
    if (isAIThinking) return;
    if (gameMode === "vsAI" && state.currentPlayer === BLACK) return;

    const piece = state.board[row][col];
    if (piece !== state.currentPlayer) return;
    if (state.moveInProgress && state.activePiece) {
      if (row !== state.activePiece.row || col !== state.activePiece.col)
        return;
    }
    dispatch({ type: "SELECT_PIECE", payload: { row, col } });
  };

  const handleMove = (
    from: Position,
    to: Position,
    captureType: CaptureType | null = null,
    captured: Position[] = [],
  ) => {
    dispatch({
      type: "MOVE",
      payload: { from, to, captureType, capturedPieces: captured },
    });
  };

  const handleSquarePress = (row: number, col: number) => {
    if (state.gameOver) return;
    if (isAIThinking) return;
    if (gameMode === "vsAI" && state.currentPlayer === BLACK) return;

    if (!state.selected) {
      handleSelect(row, col);
      return;
    }

    const { row: sr, col: sc } = state.selected;
    const moves = getLegalMovesForPiece(
      state.board,
      sr,
      sc,
      state.currentPlayer,
      state.activePiece,
      state.visited,
      state.lastDirection,
      state.moveInProgress,
    );

    const move = moves.find((m) => m.to.row === row && m.to.col === col);
    if (!move) {
      dispatch({ type: "SELECT_PIECE", payload: null });
      return;
    }

    if (move.isBoth) {
      dispatch({
        type: "SET_PENDING_MOVE",
        payload: {
          from: move.from,
          to: move.to,
          approachCaptures: move.approachCaptures,
          withdrawalCaptures: move.withdrawalCaptures,
        },
      });
      return;
    }

    const captured =
      move.approachCaptures.length > 0
        ? move.approachCaptures
        : move.withdrawalCaptures;
    handleMove(
      move.from,
      move.to,
      move.approachCaptures.length ? "approach" : "withdrawal",
      captured,
    );
    dispatch({ type: "SELECT_PIECE", payload: null });
  };

  const handleCaptureChoice = (type: CaptureType) => {
    if (!state.pendingMove) return;
    const { from, to, approachCaptures, withdrawalCaptures } =
      state.pendingMove;
    const captured =
      type === "approach" ? approachCaptures : withdrawalCaptures;
    handleMove(from, to, type, captured);
    dispatch({ type: "CLEAR_PENDING" });
    dispatch({ type: "SELECT_PIECE", payload: null });
  };

  const resetGame = () => {
    dispatch({ type: "RESET" });
    setIsAIThinking(false);
    aiThinkingRef.current = false;
  };

  const resetScores = () => {
    setWhiteScore(0);
    setBlackScore(0);
  };

  const toggleGameMode = () => {
    setIsAIThinking(false);
    aiThinkingRef.current = false;
    setGameMode((prev) => (prev === "2players" ? "vsAI" : "2players"));
    resetGame();
  };

  // ----- RENDU -----
  const renderSquare = (row: number, col: number) => {
    const piece = state.board[row][col];
    const isSelected =
      state.selected?.row === row && state.selected?.col === col;
    const isActive =
      state.activePiece?.row === row && state.activePiece?.col === col;

    let isPossibleMove = false;
    if (state.selected) {
      const moves = getLegalMovesForPiece(
        state.board,
        state.selected.row,
        state.selected.col,
        state.currentPlayer,
        state.activePiece,
        state.visited,
        state.lastDirection,
        state.moveInProgress,
      );
      isPossibleMove = moves.some((m) => m.to.row === row && m.to.col === col);
    }

    const isDisabled =
      isAIThinking || (gameMode === "vsAI" && state.currentPlayer === BLACK);

    // Déterminer la source de l'image en fonction du joueur
    let pieceImage = null;
    if (piece === WHITE) {
      pieceImage = require("../../assets/images/shoyo-hinata.png");
    } else if (piece === BLACK) {
      pieceImage = require("../../assets/images/gojo.png");
    }

    return (
      <TouchableOpacity
        key={`${row}-${col}`}
        style={[
          styles.square,
          isSelected && styles.selectedSquare,
          isActive && styles.activeSquare,
          isPossibleMove && styles.possibleMove,
          isDisabled && styles.disabledSquare,
        ]}
        onPress={() => handleSquarePress(row, col)}
        disabled={isDisabled}
      >
        {pieceImage && <Image source={pieceImage} style={styles.pieceImage} />}
      </TouchableOpacity>
    );
  };

  const renderBoard = () => {
    const rows = [];
    for (let r = 0; r < ROWS; r++) {
      const cols = [];
      for (let c = 0; c < COLS; c++) cols.push(renderSquare(r, c));
      rows.push(
        <View key={`row-${r}`} style={styles.row}>
          {cols}
        </View>,
      );
    }
    return rows;
  };

  return (
    <ImageBackground
      source={require("../../assets/images/dark-background-abstract-background-network-3d-background-7680x4320-8324.png")}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.modeButton} onPress={toggleGameMode}>
            <Text style={styles.modeButtonText}>
              {gameMode === "2players" ? "👥 2 Joueurs" : "🤖 vs IA"}
            </Text>
          </TouchableOpacity>
          <View style={styles.scoreContainer}>
            <Text style={styles.scoreText}>Blancs: {whiteScore}</Text>
            <Text style={styles.scoreText}> - </Text>
            <Text style={styles.scoreText}>Noirs: {blackScore}</Text>
          </View>
          <TouchableOpacity
            style={styles.resetScoresButton}
            onPress={resetScores}
          >
            <Text style={styles.resetScoresText}>🔄 Scores</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.title}>Fanoron'tsivy</Text>
        <Text style={styles.turn}>
          Tour : {state.currentPlayer === WHITE ? "Blancs" : "Noirs"}
          {state.gameOver &&
            ` - Victoire: ${state.winner === WHITE ? "Blancs" : "Noirs"}`}
          {isAIThinking && " (IA réfléchit...)"}
        </Text>

        {state.pendingMove && (
          <View style={styles.choiceContainer}>
            <Text style={styles.choiceText}>Approche ou retrait ?</Text>
            <View style={styles.choiceButtons}>
              <TouchableOpacity
                style={styles.choiceButton}
                onPress={() => handleCaptureChoice("approach")}
              >
                <Text>Approche</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.choiceButton}
                onPress={() => handleCaptureChoice("withdrawal")}
              >
                <Text>Retrait</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.board}>{renderBoard()}</View>

        <View style={styles.bottomButtons}>
          <TouchableOpacity style={styles.resetButton} onPress={resetGame}>
            <Text style={styles.resetText}>Nouvelle partie</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ImageBackground>
  );
};

// ---------- STYLES ----------
const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 20,
    paddingBottom: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    width: "100%",
    marginBottom: 10,
    paddingHorizontal: 10,
  },
  modeButton: {
    backgroundColor: "#4682B4",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  modeButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  scoreContainer: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  scoreText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  resetScoresButton: {
    backgroundColor: "#CD5C5C",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  resetScoresText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 14,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#FFD700",
    marginBottom: 10,
  },
  turn: {
    fontSize: 18,
    color: "#FFF",
    marginBottom: 10,
  },
  board: {
    backgroundColor: "rgba(222, 184, 135, 0.85)", // légèrement transparent pour voir le fond
    padding: 10,
    borderRadius: 10,
  },
  row: {
    flexDirection: "row",
  },
  square: {
    width: 48,
    height: 48,
    backgroundColor: "#F5DEB3",
    borderWidth: 1,
    borderColor: "#8B4513",
    justifyContent: "center",
    alignItems: "center",
  },
  selectedSquare: {
    backgroundColor: "#FFD700",
  },
  activeSquare: {
    borderWidth: 3,
    borderColor: "#FF4500",
  },
  possibleMove: {
    backgroundColor: "#90EE90",
  },
  disabledSquare: {
    opacity: 0.7,
  },
  pieceImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#FFF",
  },
  bottomButtons: {
    marginTop: 20,
  },
  resetButton: {
    backgroundColor: "#4CAF50",
    padding: 12,
    borderRadius: 8,
  },
  resetText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  choiceContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    backgroundColor: "#FFF",
    padding: 10,
    borderRadius: 5,
  },
  choiceText: {
    marginRight: 10,
    fontSize: 16,
  },
  choiceButtons: {
    flexDirection: "row",
  },
  choiceButton: {
    backgroundColor: "#DDD",
    padding: 8,
    marginHorizontal: 5,
    borderRadius: 5,
  },
});

export default App;
