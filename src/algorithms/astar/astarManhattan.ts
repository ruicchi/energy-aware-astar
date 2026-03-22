//* f = g + h, f is (total cost), h is (heuristic), g is (cost)
//* key, row, col are ids and cell's position on the grid
//* parent is the previous node in the path

type Node = {
  key: string;
  row: number;
  col: number;
  g: number;
  h: number;
  f: number;
  parent: Node | null;
};

//* Manhattan distance heuristic (h)
const getManhattanHeuristic = (
  startRow: number,
  startCol: number,
  destRow: number,
  destCol: number,
) => {
  return Math.abs(startRow - destRow) + Math.abs(startCol - destCol);
};

const reconstructPath = (endNode: Node): string[] => {
  const shortestPath: string[] = [];
  let temp: Node | null = endNode;

  while (temp !== null) {
    // unshift adds the key to the beginning of the array,
    // naturally reversing the path from end->start to start->end
    shortestPath.unshift(temp.key);
    temp = temp.parent;
  }

  return shortestPath;
};

//* Function to run Astar
export const runAStar = (
  rows: number,
  cols: number,
  startKey: string,
  destKey: string,
  walls: Set<string>,
) => {
  //* Stores the position of start and destination node
  const [startRow, startCol] = startKey.split('-').map(Number);
  const [destRow, destCol] = destKey.split('-').map(Number);

  //* openSet -> list of discovered notes waiting to be evaluated
  //* closedSet -> nodes that have already been evaluated
  const openSet: Node[] = [];
  const closedSet: Set<string> = new Set();
  const visitedNodesInOrder: string[] = [];

  //* Initializes startNode
  const startNode: Node = {
    key: startKey,
    row: startRow,
    col: startCol,
    g: 0,
    h: getManhattanHeuristic(startRow, startCol, destRow, destCol),
    f: 0,
    parent: null,
  };

  startNode.f = startNode.g + startNode.h;

  //* Adds the startNode element at the end of the openSet array
  openSet.push(startNode);

  //* allNodes check the map (if the node already exist, it retrieves it. If not, it creates it)
  const allNodes = new Map<string, Node>();

  //* Adds or updates the entry for the allNodes map
  allNodes.set(startKey, startNode);

  while (openSet.length > 0) {
    //* Sort to find the node with the lowest f cost
    openSet.sort((a, b) => a.f - b.f);
    const current = openSet.shift()!;

    if (current.key === destKey) {
      const shortestPath = reconstructPath(current);
      return { visitedNodesInOrder, shortestPath };
    }

    closedSet.add(current.key);

    //* Don't animate the start node
    if (current.key !== startKey && current.key !== destKey) {
      visitedNodesInOrder.push(current.key);
    }

    //* Check neighbors (Up, Down, Left, Right)
    const neighbors = [
      { r: current.row - 1, c: current.col },
      { r: current.row + 1, c: current.col },
      { r: current.row, c: current.col - 1 },
      { r: current.row, c: current.col + 1 },
    ];

    for (const n of neighbors) {
      const neighborKey = `${n.r}-${n.c}`;

      //* Check boundaries and walls
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
          h: getManhattanHeuristic(n.r, n.c, destRow, destCol),
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

  return { visitedNodesInOrder, shortestPath: [] };
};
