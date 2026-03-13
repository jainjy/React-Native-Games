import React, { useState } from "react";
import {
    Alert,
    Dimensions,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

const { width } = Dimensions.get("window");
const BOX_SIZE = width * 0.8;
const COLORS = ["red", "green", "blue"];
const COLOR_NAMES = ["rouge", "vert", "bleu"];

// ----- Utilitaires géométriques -----
const orientation = (p, q, r) => {
  return (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
};

const onSegment = (p, q, r) => {
  return (
    q.x <= Math.max(p.x, r.x) &&
    q.x >= Math.min(p.x, r.x) &&
    q.y <= Math.max(p.y, r.y) &&
    q.y >= Math.min(p.y, r.y)
  );
};

const segmentsIntersect = (p1, p2, p3, p4) => {
  const o1 = orientation(p1, p2, p3);
  const o2 = orientation(p1, p2, p4);
  const o3 = orientation(p3, p4, p1);
  const o4 = orientation(p3, p4, p2);

  if (o1 * o2 < 0 && o3 * o4 < 0) return true;
  if (o1 === 0 && onSegment(p1, p3, p2)) return true;
  if (o2 === 0 && onSegment(p1, p4, p2)) return true;
  if (o3 === 0 && onSegment(p3, p1, p4)) return true;
  if (o4 === 0 && onSegment(p3, p2, p4)) return true;

  return false;
};

const distance = (p1, p2) => {
  return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
};

// Calcule un point sur une courbe de Bézier cubique pour un t donné (0..1)
const cubicBezierPoint = (p0, p1, p2, p3, t) => {
  const mt = 1 - t;
  const x =
    mt * mt * mt * p0.x +
    3 * mt * mt * t * p1.x +
    3 * mt * t * t * p2.x +
    t * t * t * p3.x;
  const y =
    mt * mt * mt * p0.y +
    3 * mt * mt * t * p1.y +
    3 * mt * t * t * p2.y +
    t * t * t * p3.y;
  return { x, y };
};

// Vérifie si deux courbes (échantillonnées) se croisent
const curvesIntersect = (curve1, curve2, numSamples) => {
  for (let i = 0; i < numSamples - 1; i++) {
    for (let j = 0; j < numSamples - 1; j++) {
      if (
        segmentsIntersect(curve1[i], curve1[i + 1], curve2[j], curve2[j + 1])
      ) {
        return true;
      }
    }
  }
  return false;
};

// Vérifie qu'un point est dans le cadre
const isPointInside = (p) =>
  p.x >= 0 && p.x <= BOX_SIZE && p.y >= 0 && p.y <= BOX_SIZE;

// Vérifie qu'une courbe (par ses points de contrôle) est valide : points de contrôle dans le cadre et courbe entièrement dedans
const isCurveValid = (p0, p1, p2, p3, numSamples = 20) => {
  if (!isPointInside(p1) || !isPointInside(p2)) return false;
  for (let t = 0; t <= 1; t += 1 / (numSamples - 1)) {
    const pt = cubicBezierPoint(p0, p1, p2, p3, t);
    if (!isPointInside(pt)) return false;
  }
  return true;
};

// ----- Composant principal -----
const GameNonCrossing = () => {
  const [points, setPoints] = useState(Array(6).fill(null));
  const [showLines, setShowLines] = useState(false);
  const [curveControls, setCurveControls] = useState(null);
  const [message, setMessage] = useState("");

  const pointCount = points.filter((p) => p !== null).length;

  const nextColorIndex = Math.floor(pointCount / 2);
  const nextColor = nextColorIndex < 3 ? COLOR_NAMES[nextColorIndex] : null;
  const nextStep = pointCount % 2 === 0 ? 1 : 2;

  // Placement des points
  const handleTouch = (event) => {
    if (pointCount >= 6) return;

    const { locationX, locationY } = event.nativeEvent;
    if (
      locationX < 0 ||
      locationX > BOX_SIZE ||
      locationY < 0 ||
      locationY > BOX_SIZE
    )
      return;

    const newPoint = { x: locationX, y: locationY };

    const tooClose = points.some((p) => p && distance(p, newPoint) < 15);
    if (tooClose) {
      Alert.alert("Point trop proche", "Placez le point plus loin.");
      return;
    }

    const newPoints = [...points];
    newPoints[pointCount] = newPoint;
    setPoints(newPoints);
    setShowLines(false);
    setCurveControls(null);
    setMessage("");
  };

  const handleReset = () => {
    setPoints(Array(6).fill(null));
    setShowLines(false);
    setCurveControls(null);
    setMessage("");
  };

  const handleUndo = () => {
    if (pointCount === 0) return;
    const newPoints = [...points];
    newPoints[pointCount - 1] = null;
    setPoints(newPoints);
    setShowLines(false);
    setCurveControls(null);
    setMessage("");
  };

  // Recherche par backtracking sur les offsets des points de contrôle
  const handleConnect = () => {
    if (pointCount < 6) return;

    const pairs = [
      { p0: points[0], p2: points[1] },
      { p0: points[2], p2: points[3] },
      { p0: points[4], p2: points[5] },
    ];

    // 1. Tester les lignes droites (sans courbure)
    const straightControls = pairs.map(({ p0, p2 }) => ({
      c1: { x: (p0.x * 2 + p2.x) / 3, y: (p0.y * 2 + p2.y) / 3 },
      c2: { x: (p0.x + p2.x * 2) / 3, y: (p0.y + p2.y * 2) / 3 },
    }));

    let straightOk = true;
    for (let i = 0; i < 3; i++) {
      if (
        !isPointInside(straightControls[i].c1) ||
        !isPointInside(straightControls[i].c2)
      ) {
        straightOk = false;
        break;
      }
    }
    if (straightOk && areCurvesValid(pairs, straightControls)) {
      setCurveControls(straightControls);
      setShowLines(true);
      setMessage("✅ Tracé réussi (lignes droites) !");
      return;
    }

    // 2. Backtracking sur les offsets
    const numSamples = 20;
    const offsetSteps = 5; // 5 valeurs d'offset par point de contrôle
    const offsetsForPair = pairs.map(({ p0, p2 }) => {
      const dx = p2.x - p0.x;
      const dy = p2.y - p0.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      const maxOffset = len * 0.8; // 80% de la longueur
      const step = maxOffset / (offsetSteps - 1);
      const offsets = [];
      for (let i = 0; i < offsetSteps; i++) {
        offsets.push(-maxOffset + i * step);
      }
      return offsets;
    });

    // Générer toutes les combinaisons possibles pour chaque courbe
    const curveOptions = pairs.map(({ p0, p2 }, idx) => {
      const dx = p2.x - p0.x;
      const dy = p2.y - p0.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      const perp = { x: -dy / len, y: dx / len };
      const base1 = { x: p0.x + dx / 3, y: p0.y + dy / 3 };
      const base2 = { x: p0.x + (2 * dx) / 3, y: p0.y + (2 * dy) / 3 };
      const offsets = offsetsForPair[idx];
      const options = [];
      for (let o1 of offsets) {
        for (let o2 of offsets) {
          const c1 = {
            x: base1.x + o1 * perp.x,
            y: base1.y + o1 * perp.y,
          };
          const c2 = {
            x: base2.x + o2 * perp.x,
            y: base2.y + o2 * perp.y,
          };
          if (isPointInside(c1) && isPointInside(c2)) {
            options.push({ c1, c2 });
          }
        }
      }
      return options;
    });

    // Backtracking
    const result = [];
    const usedCurvesPoints = [];

    const backtrack = (index) => {
      if (index === 3) return true;
      for (let option of curveOptions[index]) {
        const { c1, c2 } = option;
        const { p0, p2 } = pairs[index];
        if (!isCurveValid(p0, c1, c2, p2, numSamples)) continue;

        const points = [];
        for (let t = 0; t <= 1; t += 1 / (numSamples - 1)) {
          points.push(cubicBezierPoint(p0, c1, c2, p2, t));
        }

        let intersect = false;
        for (let i = 0; i < usedCurvesPoints.length; i++) {
          if (curvesIntersect(usedCurvesPoints[i], points, numSamples)) {
            intersect = true;
            break;
          }
        }
        if (intersect) continue;

        usedCurvesPoints.push(points);
        result.push({ c1, c2 });
        if (backtrack(index + 1)) return true;
        usedCurvesPoints.pop();
        result.pop();
      }
      return false;
    };

    const found = backtrack(0);
    if (found) {
      setCurveControls(result);
      setShowLines(true);
      setMessage("✅ Tracé réussi (courbes) !");
    } else {
      setMessage(
        "❌ Aucune solution trouvée avec cette configuration. Réessayez ou déplacez les points.",
      );
      setShowLines(false);
      setCurveControls(null);
    }
  };

  // Vérifie que les trois courbes (contrôles) sont valides (pas d'intersection et dans le cadre)
  const areCurvesValid = (pairs, controls, numSamples = 20) => {
    const curvesPoints = [];
    for (let i = 0; i < 3; i++) {
      const { p0, p2 } = pairs[i];
      const { c1, c2 } = controls[i];
      if (!isCurveValid(p0, c1, c2, p2, numSamples)) return false;
      const points = [];
      for (let t = 0; t <= 1; t += 1 / (numSamples - 1)) {
        points.push(cubicBezierPoint(p0, c1, c2, p2, t));
      }
      curvesPoints.push(points);
    }
    for (let i = 0; i < 3; i++) {
      for (let j = i + 1; j < 3; j++) {
        if (curvesIntersect(curvesPoints[i], curvesPoints[j], numSamples)) {
          return false;
        }
      }
    }
    return true;
  };

  // Rendu des points
  const renderPoints = () => {
    return points.map((p, index) => {
      if (!p) return null;
      const colorIndex = Math.floor(index / 2);
      return (
        <Circle
          key={index}
          cx={p.x}
          cy={p.y}
          r="6"
          fill={COLORS[colorIndex]}
          stroke="white"
          strokeWidth="1"
        />
      );
    });
  };

  // Rendu des courbes (Bézier cubique)
  const renderCurves = () => {
    if (!showLines || !curveControls) return null;
    return COLORS.map((color, idx) => {
      const p0 = points[idx * 2];
      const p3 = points[idx * 2 + 1];
      const { c1, c2 } = curveControls[idx];
      const path = `M ${p0.x} ${p0.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${p3.x} ${p3.y}`;
      return (
        <Path key={color} d={path} stroke={color} strokeWidth="3" fill="none" />
      );
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Jeu des points à relier</Text>
      <Text style={styles.subtitle}>
        {pointCount < 6
          ? `Placez le ${nextStep === 1 ? "1er" : "2e"} point ${nextColor}`
          : "Tous les points sont placés"}
      </Text>

      <View style={styles.box} onTouchStart={handleTouch}>
        <Svg width={BOX_SIZE} height={BOX_SIZE}>
          <Circle
            cx={BOX_SIZE / 2}
            cy={BOX_SIZE / 2}
            r={BOX_SIZE / 2}
            fill="white"
          />
          {renderCurves()}
          {renderPoints()}
        </Svg>
      </View>

      {message !== "" && <Text style={styles.message}>{message}</Text>}

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.button} onPress={handleUndo}>
          <Text style={styles.buttonText}>Annuler</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={handleReset}>
          <Text style={styles.buttonText}>Réinitialiser</Text>
        </TouchableOpacity>
      </View>

      {pointCount === 6 && (
        <TouchableOpacity style={styles.connectButton} onPress={handleConnect}>
          <Text style={styles.connectButtonText}>Relier les points</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#333",
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 20,
    color: "#666",
  },
  box: {
    width: BOX_SIZE,
    height: BOX_SIZE,
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#333",
    borderRadius: 10,
    overflow: "hidden",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  buttonRow: {
    flexDirection: "row",
    marginTop: 20,
    justifyContent: "space-around",
    width: "100%",
  },
  button: {
    backgroundColor: "#ddd",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    marginHorizontal: 10,
  },
  buttonText: {
    fontSize: 16,
    color: "#333",
  },
  connectButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    marginTop: 20,
  },
  connectButtonText: {
    fontSize: 18,
    color: "#fff",
    fontWeight: "bold",
  },
  message: {
    marginTop: 15,
    fontSize: 16,
    fontWeight: "bold",
    color: "#d32f2f",
  },
});

export default GameNonCrossing;
