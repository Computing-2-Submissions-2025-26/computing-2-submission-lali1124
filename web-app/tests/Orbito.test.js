import Orbito from "../orbito.js";

const E = Orbito.PIECE.EMPTY;
const P1 = Orbito.PIECE.PLAYER_1;
const P2 = Orbito.PIECE.PLAYER_2;
const DISPLAY_MODE = "to_string";

const display_functions = {
    "json": JSON.stringify,
    "to_string": Orbito.to_string_with_tokens(Orbito.token_strings.disks)
};
const display_board = function (board) {
    try {
        return "\n" + display_functions[DISPLAY_MODE](board);
    } catch (ignore) {
        return "\n" + JSON.stringify(board);
    }
};

// TEST HELPERS

/**
 * Creates a game state with a specific board layout for testing.
 * This bypasses createGame so individual scenarios can be set up directly
 * without having to replay a sequence of moves to reach them.
 * @param {Orbito.Board} board The board layout to use.
 * @param {Orbito.Player} [currentPlayer] Whose turn it is. Defaults to P1.
 * @param {string} [phase] The game phase. Defaults to move_or_place.
 * @returns {Object} A game state object ready for testing.
 */
const gameWithBoard = (
    board,
    currentPlayer = P1,
    phase = Orbito.PHASE.MOVE_OR_PLACE
) => ({
    board: board.map((row) => [...row]),
    phase,
    currentPlayer,
    winner: null,
    winningCells: null,
    isDraw: false
});

/**
 * Places a piece on the board and returns the resulting game state
 * (after rotation). This is a shorthand to reduce boilerplate in tests
 * while still testing the real public function.
 * @param {Object} game The current game state.
 * @param {number}row Row index to place in.
 * @param {number} col Column index to place in.
 * @returns {Object} The new game state after placing and rotating.
 */
const place = (game, row, col) => Orbito.placePieceAndEndTurn(
    game,
    row,
    col
).state;


// ─────────────────────────────────────────────────────────────────────────────
// TESTS: INITIAL GAME STATE
// Verify that a freshly created game starts in the correct neutral state
// before any moves have been made.
// ─────────────────────────────────────────────────────────────────────────────

describe("A freshly created game", function () {
    it("has no winner", function () {
        const game = Orbito.createGame();
        if (game.winner !== null) {
            throw new Error(
                "A new game should have no winner, " +
                "but winner was reported as: " + game.winner
            );
        }
    });

    it("is not a draw", function () {
        const game = Orbito.createGame();
        if (game.isDraw !== false) {
            throw new Error(
                "A new game should not be a draw, " +
                "but isDraw was: " + game.isDraw
            );
        }
    });

    it("is not over", function () {
        const game = Orbito.createGame();
        if (Orbito.isGameOver(game)) {
            throw new Error(
                "A new game should not be over, " +
                "but isGameOver returned true."
            );
        }
    });
});


// ─────────────────────────────────────────────────────────────────────────────
// TESTS: INCOMPLETE LINES ARE NOT WINS
// Verify that fewer than four pieces in a line do not trigger a win.
// This guards against off-by-one errors in the win-detection logic.
// ─────────────────────────────────────────────────────────────────────────────

describe("Incomplete lines are not wins", function () {
    it(
        `Given a board where a player has exactly three pieces in a
        row after rotation,
the game should not report a winner.`,
        function () {
            // After placing P1 at [0][0] and rotating, the bottom row of the
            // rotated board becomes [EMPTY, P1, P1, P1] — only 3 in a row.
            const game = gameWithBoard([
                [E, E, E, E],
                [E, E, E, E],
                [E, E, E, E],
                [P1, P1, P1, E]
            ]);

            const result = place(game, 0, 0);

            if (result.winner !== null) {
                throw new Error(
                    "Three pieces in a row should not be a win, " +
                    "but winner was reported as: " + result.winner +
                    display_board(result.board)
                );
            }
        }
    );

    it(
        `Given a board where a player has three pieces in a column after
        rotation, the game should not report a winner.`,
        function () {
            // After placing P1 at [2][3] and rotating, column 3 of the
            // rotated board is [P1, P1, P1, EMPTY] — only 3 in a column.
            const game = gameWithBoard([
                [E, E, E, E],
                [E, E, E, P1],
                [E, E, E, E],
                [E, E, E, P1]
            ]);

            const result = place(game, 2, 3);

            if (result.winner !== null) {
                throw new Error(
                    "Three pieces in a column should not be a win, " +
                    "but winner was reported as: " + result.winner +
                    display_board(result.board)
                );
            }
        }
    );
});


// ─────────────────────────────────────────────────────────────────────────────
// TESTS: WIN CONDITIONS
// Verify that four in a row in every direction correctly triggers a win
// for the appropriate player. In Orbito, the win check happens AFTER the
// board rotates, so these boards are designed to win post-rotation.
// ─────────────────────────────────────────────────────────────────────────────

describe("Win conditions", function () {
    describe("Row wins", function () {
        it(
            `Given a board where placing a piece gives player 1 four in a row
            after rotation, the game should report player 1 as the winner.`,
            function () {
                // After placing P1 at [3][2] and rotating:
                // Row 3 of rotated board = [board[2][0], board[3][0],
                // board[3][1], board[3][2]]
                //                        = [P1, P1, P1, P1]
                const game = gameWithBoard([
                    [E, E, E, E],
                    [E, E, E, E],
                    [P1, E, E, E],
                    [P1, P1, E, E]
                ]);

                const result = place(game, 3, 2);

                if (result.winner !== P1) {
                    throw new Error(
                        "Expected player 1 to win with four in a row, " +
                        "but winner was: " + result.winner +
                        display_board(result.board)
                    );
                }
            }
        );

        it(
            `Given a board where placing a piece gives player 2 four in a
            row after rotation, the game should report player 2 as the winner.`,
            function () {
                // Same pattern as above but for player 2
                const game = gameWithBoard([
                    [E, E, E, E],
                    [E, E, E, E],
                    [P2, E, E, E],
                    [P2, P2, E, E]
                ], P2);

                const result = place(game, 3, 2);

                if (result.winner !== P2) {
                    throw new Error(
                        "Expected player 2 to win with four in a row, " +
                        "but winner was: " + result.winner +
                        display_board(result.board)
                    );
                }
            }
        );
    });

    describe("Column wins", function () {
        it(
            `Given a board where placing a piece gives player 1 four
            in a column after rotation, the game should report player 1
            as the winner.`,
            function () {
                // After placing P1 at [3][0] and rotating:
                // Column 1 of rotated board = [board[0][2], board[1][2],
                // board[1][1], board[3][0]]
                //                           = [P1, P1, P1, P1]
                const game = gameWithBoard([
                    [E, E, P1, E],
                    [E, P1, P1, E],
                    [E, E, E, E],
                    [E, E, E, E]
                ]);

                const result = place(game, 3, 0);

                if (result.winner !== P1) {
                    throw new Error(
                        "Expected player 1 to win with four in a column, " +
                        "but winner was: " + result.winner +
                        display_board(result.board)
                    );
                }
            }
        );
    });

    describe("Diagonal wins", function () {
        it(
            `Given a board where placing a piece gives player 1 four
            along the main diagonal after rotation,
            the game should report player 1 as the winner.`,
            function () {
                // After placing P1 at [3][2] and rotating:
                // Main diagonal = [board[0][1], board[1][2], board[2][1],
                // board[3][2]]
                //               = [P1, P1, P1, P1]
                const game = gameWithBoard([
                    [E, P1, E, E],
                    [E, E, P1, E],
                    [E, P1, E, E],
                    [E, E, E, E]
                ]);

                const result = place(game, 3, 2);

                if (result.winner !== P1) {
                    throw new Error(
                        "Expected player 1 to win with the main diagonal, " +
                        "but winner was: " + result.winner +
                        display_board(result.board)
                    );
                }
            }
        );

        it(
            `Given a board where placing a piece gives player 1 four along
            the anti-diagonal after rotation,
            the game should report player 1 as the winner.`,
            function () {
                // After placing P1 at [2][0] and rotating:
                // Anti-diagonal = [board[1][3], board[2][2], board[1][1],
                // board[2][0]]
                //               = [P1, P1, P1, P1]
                const game = gameWithBoard([
                    [E, E, E, E],
                    [E, P1, E, P1],
                    [E, E, P1, E],
                    [E, E, E, E]
                ]);

                const result = place(game, 2, 0);

                if (result.winner !== P1) {
                    throw new Error(
                        "Expected player 1 to win with the anti-diagonal, " +
                        "but winner was: " + result.winner +
                        display_board(result.board)
                    );
                }
            }
        );
    });
});


// ─────────────────────────────────────────────────────────────────────────────
// TESTS: CORRECT WINNER IS REPORTED
// Verify that the winner field holds the player who actually won,
// not the other player or a default value.
// ─────────────────────────────────────────────────────────────────────────────

describe("Correct winner is reported", function () {
    it(
        `When player 1 wins, the game should not report player 2
        as the winner.`,
        function () {
            const game = gameWithBoard([
                [E, E, E, E],
                [E, E, E, E],
                [P1, E, E, E],
                [P1, P1, E, E]
            ]);

            const result = place(game, 3, 2);

            if (result.winner === P2) {
                throw new Error(
                    "Player 1 made the winning move, " +
                    "but player 2 was reported as the winner." +
                    display_board(result.board)
                );
            }
        }
    );

    it(
        `When player 2 wins, the game should not report player
        1 as the winner.`,
        function () {
            const game = gameWithBoard([
                [E, E, E, E],
                [E, E, E, E],
                [P2, E, E, E],
                [P2, P2, E, E]
            ], P2);

            const result = place(game, 3, 2);

            if (result.winner === P1) {
                throw new Error(
                    "Player 2 made the winning move, " +
                    "but player 1 was reported as the winner." +
                    display_board(result.board)
                );
            }
        }
    );
});


// ─────────────────────────────────────────────────────────────────────────────
// TESTS: ORBITO-SPECIFIC RULE — WIN IS CHECKED AFTER ROTATION
// In Orbito, unlike other 4-in-a-row games, the board rotates after every
// piece is placed. The win must be detected from the rotated board, not the
// placement position itself.
// ─────────────────────────────────────────────────────────────────────────────

describe("Win is detected after board rotation, not before", function () {
    it(
        `Given a board where no four-in-a-row exists before
        rotation but does after,
the game should detect the win after rotation.`,
        function () {
            // Board before placing:
            // row 3 = [P1, P1, EMPTY, EMPTY] — no four in a row
            // After placing P1 at [3][2]:
            // row 3 = [P1, P1, P1, EMPTY] — still no four in a row
            // in the UNROTATED board
            // After rotation, row 3 of rotated board = [P1, P1, P1, P1]
            // — four in a row!
            const game = gameWithBoard([
                [E, E, E, E],
                [E, E, E, E],
                [P1, E, E, E],
                [P1, P1, E, E]
            ]);

            const {state, intermediateBoard} = Orbito.placePieceAndEndTurn(
                game,
                3,
                2
            );

            // The intermediate board is after placing but BEFORE rotation.
            // The bottom row should NOT yet have four-in-a-row.
            const bottomRowBeforeRotation = intermediateBoard[3];
            const winAlreadyExistedBeforeRotation = (
                bottomRowBeforeRotation.every(
                    (cell) => cell === P1
                )
            );

            if (winAlreadyExistedBeforeRotation) {
                throw new Error(
                    "Test is invalid: the board already has four in a row " +
                    "before rotation, so it does not test the rotation rule. " +
                    "The board setup needs to be changed."
                );
            }

            if (state.winner !== P1) {
                throw new Error(
                    "The win should be detected after the board rotates, " +
                    "but no winner was reported. Winner was: " + state.winner
                );
            }
        }
    );
});


// ─────────────────────────────────────────────────────────────────────────────
// TESTS: SIMULTANEOUS WIN → DRAW
// In Orbito, rotation can cause both players to complete four-in-a-row at the
// same time. The rules state this is a draw.
// ─────────────────────────────────────────────────────────────────────────────

describe("Simultaneous four-in-a-row by both players", function () {
    it(
        `If the board rotation causes both players to complete four
        in a row simultaneously,
the result should be a draw and neither player should be declared the winner.`,
        function () {
            // After placing P1 at [1][3] and rotating:
            // Row 0 of rotated board = [board[0][1], board[0][2],
            // board[0][3], board[1][3]]
            //                        = [P1, P1, P1, P1] → P1 wins row 0
            // Row 3 of rotated board = [board[2][0], board[3][0],
            // board[3][1], board[3][2]]
            //                        = [P2, P2, P2, P2] → P2 wins row 3
            // Both players win → draw
            const game = gameWithBoard([
                [E, P1, P1, P1],
                [E, E, E, E],
                [P2, E, E, E],
                [P2, P2, P2, E]
            ]);

            const result = place(game, 1, 3);

            if (!result.isDraw) {
                throw new Error(
                    "When both players complete four-in-a-row " +
                    "simultaneously, the result should be a draw. " +
                    "the result should be a draw. isDraw was: " +
                    result.isDraw +
                    ", winner was: " + result.winner +
                    display_board(result.board)
                );
            }

            if (result.winner !== null) {
                throw new Error(
                    "When both players complete four-in-a-row" +
                    "simultaneously, no single player should be" +
                    "declared the winner. Winner was: " + result.winner +
                    display_board(result.board)
                );
            }
        }
    );
});


// ─────────────────────────────────────────────────────────────────────────────
// TESTS: DRAW — FULL BOARD WITH NO WINNER
// If the board fills up and no player has four in a row, the game is a draw.
// ─────────────────────────────────────────────────────────────────────────────

describe("Draw by full board", function () {
    it(
        `When the last piece is placed and the board is completely
        full with no four-in-a-row,
the game should be a draw.`,
        function () {
            // Board is full after placing P1 at [3][3].
            // After rotation no row, column, or diagonal
            // has four of the same piece.
            const game = gameWithBoard([
                [P1, P2, P2, P1],
                [P2, P1, P1, P2],
                [P2, P1, P1, P2],
                [P1, P2, P2, E]
            ]);

            const result = place(game, 3, 3);

            if (result.winner !== null) {
                throw new Error(
                    "A full board with no four-in-a-row should be a draw, " +
                    "but a winner was declared: " + result.winner +
                    display_board(result.board)
                );
            }

            if (!result.isDraw) {
                throw new Error(
                    "A full board with no four-in-a-row should set" +
                    "isDraw to true, but isDraw was: " + result.isDraw +
                    display_board(result.board)
                );
            }
        }
    );
});


// ─────────────────────────────────────────────────────────────────────────────
// TESTS: GAME OVER BEHAVIOUR
// Verify the game correctly locks itself after a win or draw.
// ─────────────────────────────────────────────────────────────────────────────

describe("Game over behaviour", function () {
    it(
        `After a player wins, isGameOver should return true.`,
        function () {
            const game = gameWithBoard([
                [E, E, E, E],
                [E, E, E, E],
                [P1, E, E, E],
                [P1, P1, E, E]
            ]);

            const result = place(game, 3, 2);

            if (!Orbito.isGameOver(result)) {
                throw new Error(
                    "After player 1 wins, isGameOver should return true, " +
                    "but it returned false." +
                    display_board(result.board)
                );
            }
        }
    );

    it(
        `After a player wins, attempting to place another piece should
        not change the game state.`,
        function () {
            const game = gameWithBoard([
                [E, E, E, E],
                [E, E, E, E],
                [P1, E, E, E],
                [P1, P1, E, E]
            ]);

            const wonGame = place(game, 3, 2);

            // Try to place on an empty square of the already-won game
            const afterAttempt = place(wonGame, 0, 0);

            if (afterAttempt !== wonGame) {
                throw new Error(
                    "After the game is won, placing a piece should return" +
                    "the same game state unchanged, but a new state" +
                    "was returned." +
                    display_board(afterAttempt.board)
                );
            }
        }
    );

    it(
        `After a draw, isGameOver should return true.`,
        function () {
            const game = gameWithBoard([
                [P1, P2, P2, P1],
                [P2, P1, P1, P2],
                [P2, P1, P1, P2],
                [P1, P2, P2, E]
            ]);

            const result = place(game, 3, 3);

            if (!Orbito.isGameOver(result)) {
                throw new Error(
                    "After a draw, isGameOver should return true, " +
                    "but it returned false." +
                    display_board(result.board)
                );
            }
        }
    );
});