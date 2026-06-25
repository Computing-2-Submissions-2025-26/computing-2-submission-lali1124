/**
 * Orbito.js is a module to model and play the board game "Orbito".
 * In Orbito, players place pieces and the board rotates,
 * aiming to get 4 in a row.
 * @namespace Orbito
 * @author Leila Ali
 * @version 1.0.0
 */

import R from "./ramda.js";

var Orbito = Object.create(null);

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
 * Constants for the game pieces.
 * @memberof Orbito
 * @readonly
 * @enum {number}
 */
Orbito.PIECE = Object.freeze({
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
Orbito.PHASE = Object.freeze({
    MOVE_OR_PLACE: "move_or_place",
    PLACE: "place"
});

/**
 * Coordinate mapping representing how pieces shift when the board rotates.
 * Exported so the UI can safely animate paths without calculating game logic.
 * @memberof Orbito
 * @readonly
 * @type {number[][][]}
 */
Orbito.ROTATION_MAP = Object.freeze([
    // Outer ring
    [[0, 0], [1, 0]], [[1, 0], [2, 0]], [[2, 0], [3, 0]], [[3, 0], [3, 1]],
    [[3, 1], [3, 2]], [[3, 2], [3, 3]], [[3, 3], [2, 3]], [[2, 3], [1, 3]],
    [[1, 3], [0, 3]], [[0, 3], [0, 2]], [[0, 2], [0, 1]], [[0, 1], [0, 0]],
    // Inner ring
    [[1, 1], [2, 1]], [[2, 1], [2, 2]], [[2, 2], [1, 2]], [[1, 2], [1, 1]]
]);

/**
 * A set of template strings for visually printing the board to the console.
 * @memberof Orbito
 * @enum {string[]}
 */
Orbito.token_strings = Object.freeze({
    "default": ["0", "1", "2"],
    "disks": ["⚫", "⚪", "🔴"]
});

// --- 1. Utilities & Helpers ---

function allEqual(arr) {
    var first = arr[0];
    return first !== Orbito.PIECE.EMPTY && R.all(R.equals(first), arr);
}

var isBoardFull = R.pipe(
    R.flatten,
    R.none(R.equals(Orbito.PIECE.EMPTY))
);

function getOpponent(player) {
    if (player === Orbito.PIECE.PLAYER_1) {
        return Orbito.PIECE.PLAYER_2;
    }

    return Orbito.PIECE.PLAYER_1;
}

// --- 2. Stringification (For debugging & tests) ---

function replaceTokensInSlot(tokenStrings) {
    return function (token) {
        return tokenStrings[token] || token;
    };
}

function replaceTokensOnBoard(tokenStrings) {
    return function (board) {
        return R.map(R.map(replaceTokensInSlot(tokenStrings)), board);
    };
}

/**
 * Returns a string representation function mapping tokens to provided strings.
 * @memberof Orbito
 * @function
 * @param {string[]} token_strings The array of strings mapping to [0, 1, 2].
 * @returns {function} The string representation function.
 */
Orbito.to_string_with_tokens = function (token_strings) {
    return function (board) {
        return R.pipe(
            replaceTokensOnBoard(token_strings),
            R.map(R.join(" ")),
            R.join("\n")
        )(board);
    };
};

/**
 * Returns a string representation of a board for the console.
 * @memberof Orbito
 * @function
 * @param {Orbito.Board} board The board to represent.
 * @returns {string} The string representation.
 */
Orbito.to_string = Orbito.to_string_with_tokens(["0", "1", "2"]);

// --- 3. Game Rules (Domain Logic) ---

Orbito.isSquareEmpty = function (game, row, col) {
    return R.path(["board", row, col], game) === Orbito.PIECE.EMPTY;
};

Orbito.isSquareAdjacent = function (from, to) {
    var rowDiff = Math.abs(from[0] - to[0]);
    var colDiff = Math.abs(from[1] - to[1]);
    return (
        (rowDiff === 0 && colDiff === 1) ||
        (colDiff === 0 && rowDiff === 1)
    );
};

Orbito.isGameOver = function (game) {
    return game.winner !== null || game.isDraw;
};

Orbito.canSelectPiece = function (game, row, col) {
    var piece = R.path(["board", row, col], game);
    var opponent = getOpponent(game.currentPlayer);
    return game.phase === Orbito.PHASE.MOVE_OR_PLACE && piece === opponent;
};

Orbito.canMovePiece = function (game, from, to) {
    var piece = R.path(["board", from[0], from[1]], game);
    var opponent = getOpponent(game.currentPlayer);
    return (
        game.phase === Orbito.PHASE.MOVE_OR_PLACE &&
        piece === opponent &&
        Orbito.isSquareAdjacent(from, to) &&
        Orbito.isSquareEmpty(game, to[0], to[1])
    );
};

Orbito.canPlacePiece = function (game, row, col) {
    return Orbito.isSquareEmpty(game, row, col) && !Orbito.isGameOver(game);
};

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

// --- 4. State Transitions ---

Orbito.createGame = function () {
    var e = Orbito.PIECE.EMPTY;
    return {
        board: [
            [e, e, e, e],
            [e, e, e, e],
            [e, e, e, e],
            [e, e, e, e]
        ],
        phase: Orbito.PHASE.MOVE_OR_PLACE,
        currentPlayer: Orbito.PIECE.PLAYER_1,
        winner: null,
        isDraw: false
    };
};

Orbito.movePiece = function (game, from, to) {
    if (!Orbito.canMovePiece(game, from, to)) {
        return game;
    }

    var r1 = from[0];
    var c1 = from[1];
    var r2 = to[0];
    var c2 = to[1];
    var piece = R.path(["board", r1, c1], game);

    var applyMove = R.pipe(
        R.assocPath(["board", r2, c2], piece),
        R.assocPath(["board", r1, c1], Orbito.PIECE.EMPTY),
        R.assoc("phase", Orbito.PHASE.PLACE)
    );

    return applyMove(game);
};

Orbito.placePieceAndEndTurn = function (game, row, col) {
    if (!Orbito.canPlacePiece(game, row, col)) {
        return {
            state: game,
            intermediateBoard: game.board
        };
    }

    var placedBoard = R.assocPath(
        ["board", row, col],
        game.currentPlayer,
        game
    ).board;
    var rotatedBoard = rotateBoard(placedBoard);
    var result = checkForWinner(rotatedBoard);
    var winner = null;
    var isDraw = false;
    var winningCells = null;

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

    var applyTurnEnd = R.pipe(
        R.assoc("board", rotatedBoard),
        R.assoc("currentPlayer", getOpponent(game.currentPlayer)),
        R.assoc("phase", Orbito.PHASE.MOVE_OR_PLACE),
        R.assoc("winner", winner),
        R.assoc("winningCells", winningCells),
        R.assoc("isDraw", isDraw)
    );

    return {
        state: applyTurnEnd(game),
        intermediateBoard: placedBoard
    };
};

export default Object.freeze(Orbito);