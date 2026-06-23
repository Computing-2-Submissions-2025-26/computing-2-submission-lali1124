import * as Orbito from "../orbito.js";

// --- UTILITY FUNCTIONS ---

const display_board = function (board) {
    try {
        return "\n" + board.map(row => row.join(" ")).join("\n");
    } catch (ignore) {
        return "\n" + JSON.stringify(board);
    }
};

/**
 * Returns if the game state is valid.
 * A game is valid if all the following are true:
 * - The board is a 4x4 array containing only 0, 1, or 2.
 * - The current player is 1 or 2.
 * - The phase is "place", "move", or "rotating".
 * @param {Object} game The game state to test.
 * @throws if the game fails any of the above conditions.
 */
const throw_if_invalid = function (game) {
    const board = game.board;

    // 4x4 Rectangular array
    if (!Array.isArray(board) || board.length !== 4 || !Array.isArray(board[0])) {
        throw new Error("The board is not a 2D array: " + display_board(board));
    }
    const is_4x4 = board.every(row => row.length === 4);
    if (!is_4x4) {
        throw new Error("The board is not 4x4: " + display_board(board));
    }

    // Only valid tokens (0, 1, 2)
    const valid_tokens = [0, 1, 2];
    const contains_valid_tokens = board.flat().every(cell => valid_tokens.includes(cell));
    if (!contains_valid_tokens) {
        throw new Error("The board contains invalid tokens: " + display_board(board));
    }

    // Valid Player
    if (game.currentPlayer !== 1 && game.currentPlayer !== 2) {
        throw new Error(`Invalid current player (${game.currentPlayer}).`);
    }

    // Valid Phase
    const valid_phases = ["place", "move", "rotating"];
    if (!valid_phases.includes(game.phase)) {
        throw new Error(`Invalid game phase (${game.phase}).`);
    }
};


// --- TEST SUITES ---

describe("Initial Game State", function () {
    it("A new game should return a valid empty board and start in 'place' phase", function () {
        const game = Orbito.createGame();
        throw_if_invalid(game);

        if (game.phase !== "place") {
            throw new Error(`A new game should start in 'place' phase, not ${game.phase}.`);
        }
        if (game.turnCount !== 1) {
            throw new Error(`A new game should start on turn 1.`);
        }

        const all_free = game.board.flat().every(cell => cell === 0);
        if (!all_free) {
            throw new Error("The empty board has filled slots: " + display_board(game.board));
        }
    });
});

describe("Move Phase (Turns 2+)", function () {
    it(`Given a game in the 'move' phase,
When a player tries to move their OWN piece,
Then the game state should not change.`, function () {

        let game = Orbito.createGame();
        game.phase = "move"; // Mocking turn 2+
        game.currentPlayer = 1;
        game.board[0][0] = 1; // Player 1's piece

        const next_state = Orbito.movePiece(game, [0, 0], [0, 1]);
        if (next_state !== game) {
            throw new Error("State changed illegally. Player should not be able to move their own piece.");
        }
    });

    it(`Given a game in the 'move' phase,
When a player moves an OPPONENT'S piece to an adjacent empty square,
Then the piece moves and the phase changes to 'place'.`, function () {

        let game = Orbito.createGame();
        game.phase = "move";
        game.currentPlayer = 1;
        game.board[0][0] = 2; // Player 2's piece (opponent)

        const next_state = Orbito.movePiece(game, [0, 0], [0, 1]);
        throw_if_invalid(next_state);

        if (next_state.board[0][0] !== 0 || next_state.board[0][1] !== 2) {
            throw new Error("The piece did not move correctly." + display_board(next_state.board));
        }
        if (next_state.phase !== "place") {
            throw new Error(`Phase should be 'place' after moving, got: ${next_state.phase}`);
        }
    });
});

describe("Placement and Rotation Resolution", function () {
    it(`When a piece is placed on a valid empty square,
The board updates and phase changes to 'rotating'`, function () {
        let game = Orbito.createGame();

        const next_state = Orbito.placePiece(game, 1, 1);
        throw_if_invalid(next_state);

        if (next_state.board[1][1] !== 1) {
            throw new Error("Piece was not placed on the board." + display_board(next_state.board));
        }
        if (next_state.phase !== "rotating") {
            throw new Error(`Phase should be 'rotating' after placement, got: ${next_state.phase}`);
        }
    });

    it(`When resolveTurn is called,
The board should rotate counter-clockwise, increment turn, and switch player`, function () {
        let game = Orbito.createGame();
        game.board = [
            [1, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 2]
        ];
        game.phase = "rotating";

        const next_state = Orbito.resolveTurn(game);
        throw_if_invalid(next_state);

        // [0][0] should move to [3][0]
        // [3][3] should move to [0][3]
        if (next_state.board[3][0] !== 1 || next_state.board[0][3] !== 2) {
            throw new Error("The board did not rotate counter-clockwise correctly." + display_board(next_state.board));
        }
        if (next_state.currentPlayer !== 2) {
            throw new Error("Player did not switch.");
        }
        if (next_state.phase !== "move") {
            throw new Error("Next turn should start in 'move' phase.");
        }
    });
});

describe("Winning Conditions", function () {
    it(`A board with a horizontal 4-in-a-row AFTER rotation
should correctly flag a winner.`, function () {

        let game = Orbito.createGame();
        // Set up a vertical line on the right side.
        // Once rotated counter-clockwise, it becomes a horizontal line at the top.
        game.board = [
            [0, 0, 0, 1],
            [0, 0, 0, 1],
            [0, 0, 0, 1],
            [0, 0, 0, 1]
        ];

        const resolved_state = Orbito.resolveTurn(game);

        if (resolved_state.winner !== 1) {
            throw new Error(`Game did not recognize the winning state after rotation. Expected winner: 1, got: ${resolved_state.winner}` + display_board(resolved_state.board));
        }
    });

    it(`A board with a diagonal 4-in-a-row AFTER rotation
should correctly flag a winner.`, function () {

        let game = Orbito.createGame();
        // Diagonal setup
        game.board = [
            [2, 0, 0, 0],
            [0, 2, 0, 0],
            [0, 0, 2, 0],
            [0, 0, 0, 2]
        ];

        const resolved_state = Orbito.resolveTurn(game);

        if (resolved_state.winner !== 2) {
            throw new Error(`Game did not recognize the diagonal winning state after rotation. Expected winner: 2, got: ${resolved_state.winner}` + display_board(resolved_state.board));
        }
    });
});