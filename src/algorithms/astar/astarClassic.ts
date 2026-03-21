type Node = {
  key: string;
  row: number;
  col: number;
  g: number;
  h: number;
  f: number;
  parent: Node | null;
};
// Manhattan distance heuristic
const getHeuristic = (r1: number, c1: number, r2: number, c2: number) => {
  return Math.abs(r1 - r2) + Math.abs(c1 - c2);
};

export const runAStar = (
  rows: number,
  cols: number,
  startKey: string,
  destKey: string,
  walls: Set<string>,
) => {
  const [startRow, startCol] = startKey.split('-').map(Number);
  const [destRow, destCol] = destKey.split('-').map(Number);

  const openSet: Node[] = [];
  const closedSet: Set<string> = new Set();
  const visitedNodesInOrder: string[] = [];

  const startNode: Node = {
    key: startKey,
    row: startRow,
    col: startCol,
    g: 0,
    h: getHeuristic(startRow, startCol, destRow, destCol),
    f: 0,
    parent: null,
  };
  startNode.f = startNode.g + startNode.h;

  openSet.push(startNode);
  const allNodes = new Map<string, Node>();
  allNodes.set(startKey, startNode);

  while (openSet.length > 0) {
    // Sort to find the node with the lowest f cost
    openSet.sort((a, b) => a.f - b.f);
    const current = openSet.shift()!;

    if (current.key === destKey) {
      // We found the path, backtrack to get it
      const shortestPath: string[] = [];
      let temp: Node | null = current;
      while (temp !== null) {
        shortestPath.unshift(temp.key);
        temp = temp.parent;
      }
      return { visitedNodesInOrder, shortestPath };
    }

    closedSet.add(current.key);

    // Don't animate the start node
    if (current.key !== startKey && current.key !== destKey) {
      visitedNodesInOrder.push(current.key);
    }

    // Check neighbors (Up, Down, Left, Right)
    const neighbors = [
      { r: current.row - 1, c: current.col },
      { r: current.row + 1, c: current.col },
      { r: current.row, c: current.col - 1 },
      { r: current.row, c: current.col + 1 },
    ];

    for (const n of neighbors) {
      const neighborKey = `${n.r}-${n.c}`;

      // Check boundaries and walls
      if (
        n.r < 0 ||
        n.r >= rows ||
        n.c < 0 ||
        n.c >= cols ||
        walls.has(neighborKey) ||
        closedSet.has(neighborKey)
      ) {
        continue;
      }

      const tentativeG = current.g + 1; // 1 is the cost to move to an adjacent square
      let neighborNode = allNodes.get(neighborKey);

      if (!neighborNode) {
        neighborNode = {
          key: neighborKey,
          row: n.r,
          col: n.c,
          g: Infinity,
          h: getHeuristic(n.r, n.c, destRow, destCol),
          f: Infinity,
          parent: null,
        };
        allNodes.set(neighborKey, neighborNode);
      }

      if (tentativeG < neighborNode.g) {
        neighborNode.parent = current;
        neighborNode.g = tentativeG;
        neighborNode.f = neighborNode.g + neighborNode.h;

        if (!openSet.some((node) => node.key === neighborKey)) {
          openSet.push(neighborNode);
        }
      }
    }
  }

  return { visitedNodesInOrder, shortestPath: [] }; // No path found
};
