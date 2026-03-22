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
    //* unshift adds the key to the beginning of the array,
    //* naturally reversing the path from end->start to start->end
    shortestPath.unshift(temp.key);
    temp = temp.parent;
  }

  return shortestPath;
};

//* Function to run Astar
export const runAStarManhattan = (
  rows: number,
  cols: number,
  robotNode: string,
  destinationNode: string,
  wallNode: Set<string>,
) => {
  //* Stores the position of start and destination node
  const [startRow, startCol] = robotNode.split('-').map(Number);
  const [destRow, destCol] = destinationNode.split('-').map(Number);

  //* openSet -> list of discovered notes waiting to be evaluated
  //* closedSet -> nodes that have already been evaluated
  const openSet: Node[] = [];
  const closedSet: Set<string> = new Set();

  //* Record the order in which nodes were visited
  const visitedNodesInOrder: { key: string; type: 'open' | 'closed' }[] = [];

  //* Initializes startNode
  const startNode: Node = {
    key: robotNode,
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
  allNodes.set(robotNode, startNode);

  while (openSet.length > 0) {
    //* Sort to find the node with the lowest f cost
    openSet.sort((a, b) => a.f - b.f);
    const current = openSet.shift()!;

    if (current.key === destinationNode) {
      const shortestPath = reconstructPath(current);
      return { visitedNodesInOrder, shortestPath };
    }

    closedSet.add(current.key);

    //* Don't animate the start node
    if (current.key !== robotNode && current.key !== destinationNode) {
      visitedNodesInOrder.push({ key: current.key, type: 'closed' });
    }

    //* Check neighbors (Up, Down, Left, Right)
    const neighbors = [
      { row: current.row - 1, col: current.col },
      { row: current.row + 1, col: current.col },
      { row: current.row, col: current.col - 1 },
      { row: current.row, col: current.col + 1 },
    ];

    for (const adjacent of neighbors) {
      const neighborKey = `${adjacent.row}-${adjacent.col}`;

      //* Check boundaries and walls
      if (
        adjacent.row < 0 ||
        adjacent.row >= rows ||
        adjacent.col < 0 ||
        adjacent.col >= cols ||
        wallNode.has(neighborKey) ||
        closedSet.has(neighborKey)
      ) {
        continue;
      }
      //* 1 is the cost to move to an adjacent square
      const tentativeG = current.g + 1;
      let neighborNode = allNodes.get(neighborKey);

      if (!neighborNode) {
        neighborNode = {
          key: neighborKey,
          row: adjacent.row,
          col: adjacent.col,
          g: Infinity,
          h: getManhattanHeuristic(
            adjacent.row,
            adjacent.col,
            destRow,
            destCol,
          ),
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
          if (neighborKey !== robotNode && neighborKey !== destinationNode) {
            visitedNodesInOrder.push({ key: neighborKey, type: 'open' });
          }
        }
      }
    }
  }

  return { visitedNodesInOrder, shortestPath: [] };
};
