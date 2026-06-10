// orbito.js — pure game logic, no DOM touches

export const gameState = {
    board: [
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
    ],
    currentPlayer: 1,
    piecesInTray: { 1: 8, 2: 8 }, // how many pieces each player still has to place
};

// ─── Board Rotation ───────────────────────────────────────────────────────────

export function rotateBoardAnticlockwise(board) {
    const next = board.map((row) => [...row]);

    // Outer ring (anticlockwise — each cell takes the value of the one before it clockwise)
    next[0][1] = board[0][0];
    next[0][2] = board[0][1];
    next[0][3] = board[0][2];
    next[1][3] = board[0][3];
    next[2][3] = board[1][3];
    next[3][3] = board[2][3];
    next[3][2] = board[3][3];
    next[3][1] = board[3][2];
    next[3][0] = board[3][1];
    next[2][0] = board[3][0];
    next[1][0] = board[2][0];
    next[0][0] = board[1][0];

    // Inner ring (anticlockwise)
    next[1][2] = board[1][1];
    next[2][2] = board[1][2];
    next[2][1] = board[2][2];
    next[1][1] = board[2][1];

    return next;
}

// ─── Adjacency Check ─────────────────────────────────────────────────────────

export function isAdjacent(r1, c1, r2, c2) {
    const rowDiff = Math.abs(r1 - r2);
    const colDiff = Math.abs(c1 - c2);
    // One step in any direction (including diagonal), but not the same cell
    return rowDiff <= 1 && colDiff <= 1 && !(rowDiff === 0 && colDiff === 0);
}

// ─── Turn Phases ──────────────────────────────────────────────────────────────
// Each turn has three phases in order:
//   1. MOVE_OPPONENT  — click an opponent piece, drag it to an adjacent empty square
//   2. PLACE_OWN      — click an empty square to place one of your own pieces from the tray
//   3. (auto)         — board rotates, then currentPlayer switches

export function moveOpponentPiece(fromRow, fromCol, toRow, toCol) {
    const opponent = gameState.currentPlayer === 1 ? 2 : 1;

    if (gameState.board[fromRow][fromCol] !== opponent) {
        return { ok: false, reason: "Not an opponent piece." };
    }
    if (gameState.board[toRow][toCol] !== 0) {
        return { ok: false, reason: "Target square is not empty." };
    }
    if (!isAdjacent(fromRow, fromCol, toRow, toCol)) {
        return { ok: false, reason: "Target square is not adjacent." };
    }

    gameState.board[toRow][toCol] = opponent;
    gameState.board[fromRow][fromCol] = 0;
    return { ok: true };
}

export function placeOwnPiece(row, col) {
    if (gameState.piecesInTray[gameState.currentPlayer] <= 0) {
        return { ok: false, reason: "No pieces left in tray." };
    }
    if (gameState.board[row][col] !== 0) {
        return { ok: false, reason: "Square is not empty." };
    }

    gameState.board[row][col] = gameState.currentPlayer;
    gameState.piecesInTray[gameState.currentPlayer]--;
    return { ok: true };
}

export function endTurn() {
    // Rotate the board then switch player
    gameState.board = rotateBoardAnticlockwise(gameState.board);
    gameState.currentPlayer = gameState.currentPlayer === 1 ? 2 : 1;
}