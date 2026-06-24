import assert from "assert";
import * as Orbito from "../orbito.js";

const PIECE = Orbito.PIECE;
const PHASE = Orbito.PHASE;

describe("Initial Game State", function () {
    it("should initialize a new game with an empty board and correct player", function () {
        const game = Orbito.createGame();
        
        // Ensure the board is empty
        game.board.forEach(row => {
            row.forEach(cell => {
                assert.strictEqual(cell, PIECE.EMPTY, "Board should be empty initially");
            });
        });

        assert.strictEqual(game.currentPlayer, PIECE.PLAYER_1, "Player 1 should start");
        assert.strictEqual(game.phase, PHASE.MOVE_OR_PLACE, "Phase should allow moving or placing");
        assert.strictEqual(game.winner, null, "No winner initially");
    });
});

describe("Selection & Movement Rules", function () {
    it("canSelectPiece: A player cannot select an empty square", function () {
        const game = Orbito.createGame();
        assert.strictEqual(Orbito.canSelectPiece(game, 0, 0), false);
    });

    it("canSelectPiece: A player cannot select their own piece", function () {
        let game = Orbito.createGame();
        game.board[0][0] = PIECE.PLAYER_1;
        assert.strictEqual(Orbito.canSelectPiece(game, 0, 0), false);
    });

    it("canSelectPiece: A player CAN select an opponent's piece", function () {
        let game = Orbito.createGame();
        game.board[0][0] = PIECE.PLAYER_2;
        assert.strictEqual(Orbito.canSelectPiece(game, 0, 0), true);
    });

    it("canMovePiece: A piece cannot move to a non-adjacent square", function () {
        let game = Orbito.createGame();
        game.board[0][0] = PIECE.PLAYER_2; // Opponent piece
        assert.strictEqual(Orbito.canMovePiece(game, [0, 0], [2, 2]), false);
    });

    it("canMovePiece: A piece cannot move to an occupied square", function () {
        let game = Orbito.createGame();
        game.board[0][0] = PIECE.PLAYER_2; 
        game.board[0][1] = PIECE.PLAYER_1; 
        assert.strictEqual(Orbito.canMovePiece(game, [0, 0], [0, 1]), false);
    });

    it("canMovePiece: A piece CAN move to an adjacent empty square", function () {
        let game = Orbito.createGame();
        game.board[0][0] = PIECE.PLAYER_2;
        assert.strictEqual(Orbito.canMovePiece(game, [0, 0], [0, 1]), true);
    });

    it("movePiece: successfully moves an opponent piece and changes phase to PLACE", function () {
        let game = Orbito.createGame();
        game.board[0][0] = PIECE.PLAYER_2;

        const nextState = Orbito.movePiece(game, [0, 0], [0, 1]);

        assert.strictEqual(nextState.board[0][0], PIECE.EMPTY);
        assert.strictEqual(nextState.board[0][1], PIECE.PLAYER_2);
        assert.strictEqual(nextState.phase, PHASE.PLACE);
    });
});

describe("Placement & Turn Resolution", function () {
    it("canPlacePiece: Cannot place on an occupied square", function () {
        let game = Orbito.createGame();
        game.board[1][1] = PIECE.PLAYER_2;
        assert.strictEqual(Orbito.canPlacePiece(game, 1, 1), false);
    });

    it("placePieceAndEndTurn: Returns same state if placement is invalid", function () {
        let game = Orbito.createGame();
        game.board[1][1] = PIECE.PLAYER_2;
        
        const result = Orbito.placePieceAndEndTurn(game, 1, 1);
        assert.strictEqual(result.state, game, "State should be unmodified");
    });

    it("placePieceAndEndTurn: Places piece, rotates counter-clockwise, and switches player", function () {
        let game = Orbito.createGame();
        // Set up an identifiable piece at [0][1] to verify rotation
        game.board[0][1] = PIECE.PLAYER_2;
        
        // Player 1 places piece at [1][1]
        const result = Orbito.placePieceAndEndTurn(game, 1, 1);
        
        // 1. Verify intermediate board (before rotation)
        assert.strictEqual(result.intermediateBoard[1][1], PIECE.PLAYER_1, "Piece placed on intermediate board");
        assert.strictEqual(result.intermediateBoard[0][1], PIECE.PLAYER_2, "Old piece remains on intermediate board");

        // 2. Verify rotation in final state
        // [0][1] (outer ring) rotates counter-clockwise to [0][0]
        assert.strictEqual(result.state.board[0][0], PIECE.PLAYER_2, "Existing piece rotated correctly");
        
        // [1][1] (inner ring) rotates counter-clockwise to [2][1]
        assert.strictEqual(result.state.board[2][1], PIECE.PLAYER_1, "Newly placed piece rotated correctly");

        // 3. Verify turn ended
        assert.strictEqual(result.state.currentPlayer, PIECE.PLAYER_2, "Turn swapped to player 2");
        assert.strictEqual(result.state.phase, PHASE.MOVE_OR_PLACE, "Phase reset");
    });
});

describe("Win & Draw Conditions", function () {
    it("isGameOver: Horizontal win correctly identified AFTER rotation", function () {
        let game = Orbito.createGame();
        // Setup a vertical column on the right. After counter-clockwise rotation, 
        // it becomes a horizontal row at the top.
        game.board[0][3] = PIECE.PLAYER_1;
        game.board[1][3] = PIECE.PLAYER_1;
        game.board[2][3] = PIECE.PLAYER_1;
        
        // Place the 4th piece to trigger resolution
        const result = Orbito.placePieceAndEndTurn(game, 3, 3);
        
        assert.strictEqual(result.state.winner, PIECE.PLAYER_1, "Player 1 wins horizontally");
        assert.strictEqual(Orbito.isGameOver(result.state), true);
    });

    it("isGameOver: Diagonal win correctly identified", function () {
        let game = Orbito.createGame();
        game.board[0][1] = PIECE.PLAYER_2; // Rotates to [0][0]
        game.board[1][2] = PIECE.PLAYER_2; // Rotates to [1][1]
        game.board[2][1] = PIECE.PLAYER_2; // Rotates to [2][2]
        
        const result = Orbito.placePieceAndEndTurn(game, 3, 2); // Rotates to [3][3]

        assert.strictEqual(result.state.winner, PIECE.PLAYER_2, "Player 2 wins diagonally");
    });

    it("isGameOver: Draw condition when board is full and no lines", function () {
        let game = Orbito.createGame();
        // Fill board manually without lines
        for(let r=0; r<4; r++){
            for(let c=0; c<4; c++){
                game.board[r][c] = ((r+c)%2 === 0) ? PIECE.PLAYER_1 : PIECE.PLAYER_2;
            }
        }
        game.board[0][0] = PIECE.EMPTY; // leave one spot empty
        
        // Place the final piece
        const result = Orbito.placePieceAndEndTurn(game, 0, 0);

        assert.strictEqual(result.state.isDraw, true, "Game is a draw");
        assert.strictEqual(Orbito.isGameOver(result.state), true);
    });
});