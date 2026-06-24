/**
* Orbito.js is a module to model and play the board game "Orbito".
* In Orbito, players place pieces and the board rotates,
* aiming to get 4 in a row.
* @namespace Orbito
* @author Leila Ali
* @version 1.0.0
*/

import R from "./ramda.js";

/**
* Either a player token (1 or 2) or an empty position (0).
* @memberof Orbito
* @typedef {(1 | 2 | 0)} Token_or_empty
*/

/**
* Represents a player in the game.
* @memberof Orbito
* @typedef {(1 | 2)} Player
*/

/**
* A Board is a 4x4 grid that pieces are placed into and moved around on.
* It is implemented as a 2D array of rows containing tokens or empty positions.
* @memberof Orbito
* @typedef {Orbito.Token_or_empty[][]} Board
*/

/**
* An object representing the complete state of an Orbito game.
* @memberof Orbito
* @typedef {Object} Game
* @property {Orbito.Board} board The current state of the 4x4 grid.
* @property {("move_or_place" | "place")} phase
* The current phase of the player's turn.
* @property {Orbito.Player} currentPlayer
* The player who is currently taking their turn.
* @property {(Orbito.Player | null)} winner
* The player who has won the game, or null if ongoing.
* @property {boolean} isDraw True if the game has ended in a draw.
* @property {number[][] | null} [winningCells]
* An array of [row, col] coordinates contributing to the win.
*/

/**
* Constants for the game pieces.
* @memberof Orbito
* @readonly
* @enum {number}
*/
export var PIECE = Object.freeze({
    EMPTY: 0,
    PLAYER_1: 1,
    PLAYER_2: 2
});

/**
* Constants for the turn phases.
* @memberof Orbito
* @readonly
* @enum {string}
*/
export var PHASE = Object.freeze({
    MOVE_OR_PLACE: "move_or_place",
    PLACE: "place"
});

// --- 1. Utilities & Helpers ---

/**
* Helper to check if an array of values belongs to the same player
* (and isn't empty).
* @memberof Orbito
* @function
* @param {Orbito.Token_or_empty[]} arr The values of a line on the board.
* @returns {boolean} True if all slots are identical player pieces.
*/
function allEqual(arr) {
    var first = arr[0];
    return first !== PIECE.EMPTY && R.all(R.equals(first), arr);
}

/**
* Checks if there are any remaining empty spaces on the board.
* @memberof Orbito
* @function
* @param {Orbito.Board} board The board to evaluate.
* @returns {boolean} True if every square contains a player token.
*/
var isBoardFull = R.pipe(
    R.flatten,
    R.none(R.equals(PIECE.EMPTY))
);

/**
* Helper to get the opponent for a given player.
*/
function getOpponent(player) {
    return (
        player === PIECE.PLAYER_1
        ? PIECE.PLAYER_2
        : PIECE.PLAYER_1
    );
}

// --- 2. Game Rules (Domain Logic) ---

/**
* Checks if a specified square on the board is currently empty.
* @memberof Orbito
* @function
* @param {Orbito.Game} game The current game state.
* @param {number} row The row index of the square to check.
* @param {number} col The column index of the square to check.
* @returns {boolean} True if the square has no piece in it.
*/
export var isSquareEmpty = Object.freeze(
    function isSquareEmpty(game, row, col) {
        return R.path(["board", row, col], game) === PIECE.EMPTY;
    }
);

/**
* Evaluates whether two coordinates are orthogonally adjacent.
* Diagonal adjacency is not considered valid in this game context.
* @memberof Orbito
* @function
* @param {number[]} from The starting coordinate as [row, col].
* @param {number[]} to The target coordinate as [row, col].
* @returns {boolean} True if the spaces are directly next to each other
* horizontally or vertically.
*/
export var isSquareAdjacent = Object.freeze(
    function isSquareAdjacent(from, to) {
        var rowDiff = Math.abs(from[0] - to[0]);
        var colDiff = Math.abs(from[1] - to[1]);
        return (
            (rowDiff === 0 && colDiff === 1) ||
            (colDiff === 0 && rowDiff === 1)
        );
    }
);

export var isGameOver = Object.freeze(function isGameOver(game) {
    return game.winner !== null || game.isDraw;
});

export var canSelectPiece = Object.freeze(
    function canSelectPiece(game, row, col) {
        var piece = R.path(["board", row, col], game);
        var opponent = getOpponent(game.currentPlayer);
        return game.phase === PHASE.MOVE_OR_PLACE && piece === opponent;
    }
);

export var canMovePiece = Object.freeze(
    function canMovePiece(game, from, to) {
        var piece = R.path(["board", from[0], from[1]], game);
        var opponent = getOpponent(game.currentPlayer);
        return (
            game.phase === PHASE.MOVE_OR_PLACE &&
            piece === opponent &&
            isSquareAdjacent(from, to) &&
            isSquareEmpty(game, to[0], to[1])
        );
    }
);

export var canPlacePiece = Object.freeze(
    function canPlacePiece(game, row, col) {
        return isSquareEmpty(game, row, col) && !isGameOver(game);
    }
);

/**
* Returns a new board layout shifted counter-clockwise
* along the predefined tracks.
* @memberof Orbito
* @function
* @param {Orbito.Board} board The pre-rotation board state.
* @returns {Orbito.Board} The newly shifted board configuration.
*/
function rotateBoard(board) {
    var b = board;
    return [
        [b[0][1], b[0][2], b[0][3], b[1][3]],
        [b[0][0], b[1][2], b[2][2], b[2][3]],
        [b[1][0], b[1][1], b[2][1], b[3][3]],
        [b[2][0], b[3][0], b[3][1], b[3][2]]
    ];
}

function getRows(board) {
    return R.addIndex(R.map)(function (row, r) {
        return {
            coords: R.map(function (c) {
                return [r, c];
            }, R.range(0, 4)),
            values: row
        };
    }, board);
}

function getCols(board) {
    var transposed = R.transpose(board);
    return R.addIndex(R.map)(function (col, c) {
        return {
            coords: R.map(function (r) {
                return [r, c];
            }, R.range(0, 4)),
            values: col
        };
    }, transposed);
}

function getDiagonals(board) {
    var d1 = [0, 1, 2, 3];
    var d2 = [3, 2, 1, 0];
    return [
        {
            coords: R.map(function (i) {
                return [i, d1[i]];
            }, R.range(0, 4)),
            values: R.map(function (i) {
                return board[i][d1[i]];
            }, R.range(0, 4))
        },
        {
            coords: R.map(function (i) {
                return [i, d2[i]];
            }, R.range(0, 4)),
            values: R.map(function (i) {
                return board[i][d2[i]];
            }, R.range(0, 4))
        }
    ];
}

function getAllLines(board) {
    return R.unnest([
        getRows(board),
        getCols(board),
        getDiagonals(board)
    ]);
}

/**
* Scans the board horizontally, vertically, and diagonally
* for four-in-a-row connections.
* Can detect if multiple players complete a line simultaneously.
* @memberof Orbito
* @function
* @param {Orbito.Board} board The board state to evaluate.
* @returns {(Object | null)} An object containing the array of winning
* players and the physical coordinates of the line(s), or null if none exist.
*/
function checkForWinner(board) {
    var lines = getAllLines(board);
    var winningLines = R.filter(function (line) {
        return allEqual(line.values);
    }, lines);
    var playersWon;
    var combinedWinningCells;

    if (winningLines.length > 0) {
        playersWon = R.pipe(
            R.map(R.path(["values", 0])),
            R.uniq
        )(winningLines);

        combinedWinningCells = R.pipe(
            R.chain(R.prop("coords")),
            R.uniq
        )(winningLines);

        return {
            players: playersWon,
            winningCells: combinedWinningCells
        };
    }
    return null;
}

// --- 3. State Transitions ---

/**
* Creates a new, empty Orbito game state ready to be played.
* @memberof Orbito
* @function
* @returns {Orbito.Game} A starting game state object.
*/
export var createGame = Object.freeze(
    function createGame() {
        var e = PIECE.EMPTY;
        return {
            board: [
                [e, e, e, e],
                [e, e, e, e],
                [e, e, e, e],
                [e, e, e, e]
            ],
            phase: PHASE.MOVE_OR_PLACE,
            currentPlayer: PIECE.PLAYER_1,
            winner: null,
            isDraw: false
        };
    }
);

/**
* Takes an opponent's piece and moves it to an adjacent empty square.
* This is an optional action a player can take at the start of their turn.
* @memberof Orbito
* @function
* @param {Orbito.Game} game The state of the game before the move.
* @param {number[]} from The coordinate of the piece being moved [row, col].
* @param {number[]} to The coordinate the piece is moving to [row, col].
* @returns {Orbito.Game} A new game state if the move is legal,
* otherwise the unmodified game state.
*/
export var movePiece = Object.freeze(
    function movePiece(game, from, to) {
        var r1;
        var c1;
        var r2;
        var c2;
        var piece;
        var applyMove;

        if (!canMovePiece(game, from, to)) {
            return game;
        }

        r1 = from[0];
        c1 = from[1];
        r2 = to[0];
        c2 = to[1];
        piece = R.path(["board", r1, c1], game);

        applyMove = R.pipe(
            R.assocPath(["board", r2, c2], piece),
            R.assocPath(["board", r1, c1], PIECE.EMPTY),
            R.assoc("phase", PHASE.PLACE)
        );

        return applyMove(game);
    }
);

/**
* Commits a player's piece to the board, triggers the mandatory board rotation,
* evaluates any resultant winning conditions, and advances the turn.
* @memberof Orbito
* @function
* @param {Orbito.Game} game The current game state.
* @param {number} row The row index where the piece will be placed.
* @param {number} col The column index where the piece will be placed.
* @returns {Orbito.Game} The updated game state for the next player,
* or an ended game state if a win/draw occurs.
*/
export var placePieceAndEndTurn = Object.freeze(
    function placePieceAndEndTurn(game, row, col) {
        var placedBoard;
        var rotatedBoard;
        var result;
        var winner = null;
        var isDraw = false;
        var winningCells = null;
        var applyTurnEnd;
        var newState;

        if (!canPlacePiece(game, row, col)) {
            return {
                state: game,
                intermediateBoard: game.board
            };
        }

        placedBoard = R.assocPath(
            ["board", row, col],
            game.currentPlayer,
            game
        ).board;
        rotatedBoard = rotateBoard(placedBoard);
        result = checkForWinner(rotatedBoard);

        if (result) {
            if (result.players.length === 1) {
                winner = result.players[0];
                winningCells = result.winningCells;
            } else if (result.players.length > 1) {
                isDraw = true;
                winningCells = result.winningCells;
            }
        }

        if (!winner && !isDraw) {
            isDraw = isBoardFull(rotatedBoard);
        }

        applyTurnEnd = R.pipe(
            R.assoc("board", rotatedBoard),
            R.assoc("currentPlayer", getOpponent(game.currentPlayer)),
            R.assoc("phase", PHASE.MOVE_OR_PLACE),
            R.assoc("winner", winner),
            R.assoc("winningCells", winningCells),
            R.assoc("isDraw", isDraw)
        );

        newState = applyTurnEnd(game);

        return {
            state: newState,
            intermediateBoard: placedBoard
        };
    }
);