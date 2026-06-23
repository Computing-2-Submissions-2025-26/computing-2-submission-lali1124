export const createGame = () => ({
    board: [
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
    ],
    phase: "move_or_place",
    currentPlayer: 1,
    winner: null,
    isDraw: false
});

// --- HELPER FUNCTIONS ---

export const isSquareEmpty = (game, row, col) => {
    return game.board[row][col] === 0;
};

export const isSquareAdjacent = ([r1, c1], [r2, c2]) => {
    const rowDiff = Math.abs(r1 - r2);
    const colDiff = Math.abs(c1 - c2);
    return (rowDiff === 0 && colDiff === 1) || (colDiff === 0 && rowDiff === 1);
};


export const movePiece = (game, from, to) => {
    // Can only move at the start of a turn
    if (game.phase !== "move_or_place") return game;

    const [r1, c1] = from;
    const [r2, c2] = to;
    const piece = game.board[r1][c1];
    const opponent = game.currentPlayer === 1 ? 2 : 1;

    // Validation
    if (piece !== opponent) return game; // Must be opponent's piece
    if (!isSquareAdjacent(from, to)) return game; // Must be adjacent
    if (!isSquareEmpty(game, r2, c2)) return game; // Target must be empty

    const newBoard = game.board.map(r => [...r]);
    newBoard[r2][c2] = piece;
    newBoard[r1][c1] = 0;

    return {
        ...game,
        board: newBoard,
        phase: "place" // Move used, player must now place a piece
    };
};

// --- PHASE 2: PLACE, ROTATE, & END TURN ---

export const placePieceAndEndTurn = (game, row, col) => {
    // Validation
    if (game.winner || game.isDraw) return game;
    if (!isSquareEmpty(game, row, col)) return game;

    // 1. Place piece
    const placedBoard = game.board.map(r => [...r]);
    placedBoard[row][col] = game.currentPlayer;

    // 2. Rotate board automatically
    const rotatedBoard = rotateBoard(placedBoard);

    // 3. Check for win/draw based on the new rotated board
    const winner = checkForWinner(rotatedBoard);
    const isDraw = !winner && isBoardFull(rotatedBoard);

    // 4. Return new state for the next player
    return {
        ...game,
        board: rotatedBoard,
        currentPlayer: game.currentPlayer === 1 ? 2 : 1,
        phase: "move_or_place", // Reset phase for next player
        winner: winner,
        isDraw: isDraw
    };
};

// --- CORE MECHANICS ---

const rotateBoard = (board) => {
    const b = board;
    return [
        [b[0][1], b[0][2], b[0][3], b[1][3]],
        [b[0][0], b[1][2], b[2][2], b[2][3]],
        [b[1][0], b[1][1], b[2][1], b[3][3]],
        [b[2][0], b[3][0], b[3][1], b[3][2]]
    ];
};

// BUG FIX: Must ensure the value checked isn't an empty space (0)
const allEqual = (arr) => arr.every(v => v !== 0 && v === arr[0]);

const checkForWinner = (board) => {
    const b = board;
    const lines = [
        ...b,
        [b[0][0], b[1][0], b[2][0], b[3][0]],
        [b[0][1], b[1][1], b[2][1], b[3][1]],
        [b[0][2], b[1][2], b[2][2], b[3][2]],
        [b[0][3], b[1][3], b[2][3], b[3][3]],
        [b[0][0], b[1][1], b[2][2], b[3][3]],
        [b[0][3], b[1][2], b[2][1], b[3][0]]
    ];

    for (let line of lines) {
        if (allEqual(line)) {
            return line[0]; // Returns the player number (1 or 2) that won
        }
    }
    return null;
};

// BUG FIX: Check against 0, not null
const isBoardFull = (board) => board.every(row => row.every(cell => cell !== 0));