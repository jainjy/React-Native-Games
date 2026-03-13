import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Dimensions, Pressable, Text, Alert } from 'react-native';

const COLORS = ['red', 'blue', 'green', 'yellow'];

const getRandomColor = (): string => {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
};

type Cell = {
  color: string;
  selected: boolean;
};

const App: React.FC = () => {
  const gridSize = 10;
  const screenWidth = Dimensions.get('window').width;
  const boxSize = screenWidth / gridSize;

  const [grid, setGrid] = useState<Cell[][]>(
    Array.from({ length: gridSize }, () =>
      Array.from({ length: gridSize }, () => ({
        color: getRandomColor(),
        selected: false,
      }))
    )
  );

  const [score, setScore] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(60); // 60 secondes
  const [gameOver, setGameOver] = useState<boolean>(false);

  // Timer
  useEffect(() => {
    if (timeLeft <= 0) {
      setGameOver(true);
      Alert.alert('Temps écoulé', `Votre score final est ${score}`);
      return;
    }
    if (!gameOver) {
      const timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [timeLeft, gameOver]);

  const handlePress = (rowIndex: number, colIndex: number) => {
    if (gameOver) return; // ne plus sélectionner si le jeu est terminé

    const cell = grid[rowIndex][colIndex];
    const selectedCount = grid.flat().filter(c => c.selected).length;

    if (!cell.selected && selectedCount >= 4) {
      return;
    }

    const newGrid = grid.map((row, r) =>
      row.map((c, cIndex) =>
        r === rowIndex && cIndex === colIndex
          ? { ...c, selected: !c.selected }
          : c
      )
    );
    setGrid(newGrid);

    const selectedCells: { row: number; col: number; color: string }[] = [];
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        if (newGrid[r][c].selected) {
          selectedCells.push({ row: r, col: c, color: newGrid[r][c].color });
        }
      }
    }

    if (selectedCells.length === 4) {
      checkRectangle(selectedCells, newGrid);
    }
  };

  const checkRectangle = (
    cells: { row: number; col: number; color: string }[],
    currentGrid: Cell[][]
  ) => {
    const firstColor = cells[0].color;
    if (!cells.every(cell => cell.color === firstColor)) return;

    const rows = cells.map(cell => cell.row).sort((a, b) => a - b);
    const cols = cells.map(cell => cell.col).sort((a, b) => a - b);

    const uniqueRows = Array.from(new Set(rows));
    const uniqueCols = Array.from(new Set(cols));

    if (uniqueRows.length === 2 && uniqueCols.length === 2) {
      const surface =
        (Math.max(...rows) - Math.min(...rows) + 1) *
        (Math.max(...cols) - Math.min(...cols) + 1);

      setScore(prev => prev + surface);

      const updatedGrid = currentGrid.map((row, r) =>
        row.map((c, cIndex) => {
          const isSelected = cells.some(
            cell => cell.row === r && cell.col === cIndex
          );
          if (isSelected) {
            return { color: getRandomColor(), selected: false };
          }
          return c;
        })
      );
      setGrid(updatedGrid);
    }
  };

  return (
    <View style={styles.container}>
      {/* Timer et score */}
      <Text style={styles.scoreText}>Score: {score}</Text>
      <Text style={styles.timerText}>Temps restant: {timeLeft}s</Text>

      {grid.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.map((cell, colIndex) => (
            <Pressable
              key={colIndex}
              onPress={() => handlePress(rowIndex, colIndex)}
              style={[
                styles.box,
                { backgroundColor: cell.color, width: boxSize, height: boxSize },
                cell.selected && styles.selectedBox,
              ]}
            />
          ))}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
  },
  box: {
    borderWidth: 1,
    borderColor: '#fff',
  },
  selectedBox: {
    borderColor: '#000',
    borderWidth: 3,
  },
  scoreText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  timerText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
});

export default App;

