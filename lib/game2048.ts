export type Board = number[][];

// Initialize a blank 4x4 board with two random tiles
export function initBoard(): Board {
  const board = Array(4).fill(0).map(() => Array(4).fill(0));
  addRandomTile(board);
  addRandomTile(board);
  return board;
}

// Add a '2' (90%) or '4' (10%) to a random empty spot
export function addRandomTile(board: Board) {
  const emptySpots = [];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (board[r][c] === 0) emptySpots.push({ r, c });
    }
  }
  if (emptySpots.length === 0) return;
  
  const { r, c } = emptySpots[Math.floor(Math.random() * emptySpots.length)];
  board[r][c] = Math.random() < 0.9 ? 2 : 4;
}

// Process a move
export function move(board: Board, direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'): { board: Board, score: number, moved: boolean } {
  let rotated = JSON.parse(JSON.stringify(board));
  let scoreGain = 0;
  
  // 1. Rotate board so we always process as "Slide Left"
  if (direction === 'RIGHT') rotated = rotate(rotated, 2);
  if (direction === 'DOWN') rotated = rotate(rotated, 1); // 90 deg
  if (direction === 'UP') rotated = rotate(rotated, 3);   // 270 deg

  // 2. Slide & Merge Logic (Left)
  let moved = false;
  for (let r = 0; r < 4; r++) {
    const row = rotated[r].filter((val: number) => val !== 0); // Remove zeros
    const newRow: number[] = [];
    
    let skip = false;
    for (let c = 0; c < row.length; c++) {
      if (skip) { skip = false; continue; }
      
      // Merge if match
      if (c + 1 < row.length && row[c] === row[c + 1]) {
        newRow.push(row[c] * 2);
        scoreGain += row[c] * 2;
        skip = true;
      } else {
        newRow.push(row[c]);
      }
    }
    
    // Pad with zeros
    while (newRow.length < 4) newRow.push(0);
    
    if (JSON.stringify(rotated[r]) !== JSON.stringify(newRow)) moved = true;
    rotated[r] = newRow;
  }

  // 3. Rotate back
  if (direction === 'RIGHT') rotated = rotate(rotated, 2);
  if (direction === 'DOWN') rotated = rotate(rotated, 3);
  if (direction === 'UP') rotated = rotate(rotated, 1);

  if (moved) addRandomTile(rotated);

  return { board: rotated, score: scoreGain, moved };
}

// Helper to rotate grid clockwise
function rotate(matrix: Board, times: number): Board {
  let temp = matrix;
  for (let i = 0; i < times; i++) {
    temp = temp[0].map((_, index) => temp.map(row => row[index]).reverse());
  }
  return temp;
}

// Check if no moves are possible
export function isGameOver(board: Board): boolean {
  // Check for empty spots
  for (let r = 0; r < 4; r++) 
    for (let c = 0; c < 4; c++) 
      if (board[r][c] === 0) return false;

  // Check for possible merges
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (c < 3 && board[r][c] === board[r][c+1]) return false;
      if (r < 3 && board[r][c] === board[r+1][c]) return false;
    }
  }
  return true;
}