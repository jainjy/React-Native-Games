import React, { useEffect, useState } from "react";
import {
  Alert,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CELL_SIZE = (SCREEN_WIDTH - 80) / 4;
const GRID_SIZE = CELL_SIZE * 4;

// 🎯 TABLEAU INITIAL CONFIGURABLE
const INITIAL_GRID = [
  [1, 2, 3, 4],
  [5, 10, 6, 8],
  [9, 11, 7, 12],
  [13, 14, 15, 16],
];
// Format: ligne par ligne → facile à modifier !

const RotationPuzzle = () => {
  const [grid, setGrid] = useState([]);
  const [targetGrid, setTargetGrid] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState({ row: 0, col: 0 });
  const [isSolved, setIsSolved] = useState(false);

  useEffect(() => {
    initGame();
  }, []);

  const createTargetGrid = () => {
    const target = [];
    for (let i = 0; i < 4; i++) {
      target[i] = [];
      for (let j = 0; j < 4; j++) {
        target[i][j] = i * 4 + j + 1;
      }
    }
    return target;
  };

  // ✅ INITIALISATION avec tableau fixe
  const initGame = () => {
    setGrid(JSON.parse(JSON.stringify(INITIAL_GRID)));
    setTargetGrid(createTargetGrid());
    setSelectedGroup({ row: 0, col: 0 });
    setIsSolved(false);
  };

  const rotate2x2 = (gridCopy, startRow, startCol, clockwise = true) => {
    const temp = gridCopy[startRow][startCol];

    if (clockwise) {
      gridCopy[startRow][startCol] = gridCopy[startRow + 1][startCol];
      gridCopy[startRow + 1][startCol] = gridCopy[startRow + 1][startCol + 1];
      gridCopy[startRow + 1][startCol + 1] = gridCopy[startRow][startCol + 1];
      gridCopy[startRow][startCol + 1] = temp;
    } else {
      gridCopy[startRow][startCol] = gridCopy[startRow][startCol + 1];
      gridCopy[startRow][startCol + 1] = gridCopy[startRow + 1][startCol + 1];
      gridCopy[startRow + 1][startCol + 1] = gridCopy[startRow + 1][startCol];
      gridCopy[startRow + 1][startCol] = temp;
    }
  };

  const handleCellPress = (rowIdx, colIdx) => {
    console.log(`Appui: ${rowIdx},${colIdx}`);

    // PRIORITÉ CENTRE (lignes 1-2, colonnes 1-2)
    if (rowIdx >= 1 && rowIdx <= 2 && colIdx >= 1 && colIdx <= 2) {
      console.log("🎯 CENTRE sélectionné!");
      setSelectedGroup({ row: 1, col: 1 });
      return;
    }

    // Autres groupes
    const groups = [
      { row: 0, col: 0 },
      { row: 0, col: 2 },
      { row: 2, col: 0 },
      { row: 2, col: 2 },
      { row: 0, col: 1 },
      { row: 1, col: 0 },
      { row: 1, col: 2 },
      { row: 2, col: 1 },
    ];

    for (let group of groups) {
      if (
        rowIdx >= group.row &&
        rowIdx <= group.row + 1 &&
        colIdx >= group.col &&
        colIdx <= group.col + 1
      ) {
        setSelectedGroup(group);
        return;
      }
    }
  };

  const handleRotate = (clockwise) => {
    const newGrid = JSON.parse(JSON.stringify(grid));
    rotate2x2(newGrid, selectedGroup.row, selectedGroup.col, clockwise);
    setGrid(newGrid);
    setTimeout(() => checkWin(newGrid), 150);
  };

  const checkWin = (currentGrid) => {
    const isWin = currentGrid.every((row, i) =>
      row.every((num, j) => num === targetGrid[i][j]),
    );
    setIsSolved(isWin);
    if (isSolved) Alert.alert("✅ Résolu !", "Configuration parfaite !");
  };

  const resetToInitial = () => {
    setGrid(JSON.parse(JSON.stringify(INITIAL_GRID)));
    setSelectedGroup({ row: 0, col: 0 });
    setIsSolved(false);
  };

  const isCellInSelectedGroup = (rowIdx, colIdx) => {
    return (
      rowIdx >= selectedGroup.row &&
      rowIdx <= selectedGroup.row + 1 &&
      colIdx >= selectedGroup.col &&
      colIdx <= selectedGroup.col + 1
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ROTATION PUZZLE</Text>

      <Text style={styles.initialInfo}>
        Initial: {JSON.stringify(INITIAL_GRID.flat())}
      </Text>

      <View style={styles.gridContainer}>
        {grid.map((row, rowIdx) => (
          <View key={rowIdx} style={styles.row}>
            {row.map((num, colIdx) => {
              const inGroup = isCellInSelectedGroup(rowIdx, colIdx);
              const isCorrect = num === targetGrid[rowIdx][colIdx];

              return (
                <TouchableOpacity
                  key={`${rowIdx}-${colIdx}`}
                  style={[
                    styles.cell,
                    {
                      width: CELL_SIZE - 10,
                      height: CELL_SIZE - 10,
                      margin: 5,
                      backgroundColor: isSolved
                        ? "#000"
                        : inGroup
                          ? "#000"
                          : "#fff",
                      borderColor: inGroup ? "#000" : "#ccc",
                      borderWidth: inGroup ? 4 : 1,
                    },
                  ]}
                  onPress={() => handleCellPress(rowIdx, colIdx)}
                  activeOpacity={0.6}
                >
                  <Text
                    style={[
                      styles.cellText,
                      {
                        color: isSolved ? "#fff" : inGroup ? "#fff" : "#000",
                        fontWeight: isCorrect ? "900" : "600",
                      },
                    ]}
                  >
                    {num}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>

      <Text style={styles.status}>
        {isSolved
          ? "✅ RÉSOLU"
          : `GRILLE ${selectedGroup.row + 1},${selectedGroup.col + 1} | ${countMisplaced(grid)} COUPS`}
      </Text>

      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.rotateLeft}
          onPress={() => handleRotate(false)}
        >
          <Text style={styles.buttonText}>◀ GAUCHE</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.rotateRight}
          onPress={() => handleRotate(true)}
        >
          <Text style={styles.buttonText}>DROITE ▶</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.resetButton} onPress={resetToInitial}>
        <Text style={styles.buttonText}>↺ CONFIG INITIALE</Text>
      </TouchableOpacity>
    </View>
  );
};

const countMisplaced = (grid) => {
  let misplaced = 0;
  const target = Array.from({ length: 16 }, (_, i) => i + 1);
  grid.flat().forEach((num, idx) => {
    if (num !== target[idx]) misplaced++;
  });
  return Math.ceil(misplaced / 4);
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f8f8",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "900",
    color: "#000",
    marginBottom: 10,
    letterSpacing: 2,
  },
  initialInfo: {
    fontSize: 12,
    fontWeight: "500",
    color: "#666",
    marginBottom: 15,
    textAlign: "center",
    fontFamily: "monospace",
  },
  gridContainer: {
    width: GRID_SIZE,
    height: GRID_SIZE,
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 4,
    borderColor: "#000",
    padding: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  row: {
    flex: 1,
    flexDirection: "row",
  },
  cell: {
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  cellText: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  status: {
    fontSize: 14,
    fontWeight: "700",
    color: "#333",
    marginTop: 25,
    marginBottom: 30,
    textAlign: "center",
    letterSpacing: 1,
  },
  controls: {
    flexDirection: "row",
    gap: 25,
  },
  rotateLeft: {
    paddingHorizontal: 25,
    paddingVertical: 16,
    backgroundColor: "#000",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#333",
  },
  rotateRight: {
    paddingHorizontal: 25,
    paddingVertical: 16,
    backgroundColor: "#000",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#333",
  },
  buttonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
    textAlign: "center",
  },
  resetButton: {
    marginTop: 25,
    paddingHorizontal: 45,
    paddingVertical: 16,
    backgroundColor: "#000",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#333",
  },
});

export default RotationPuzzle;
