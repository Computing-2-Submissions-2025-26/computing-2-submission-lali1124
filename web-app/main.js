/**
 * @fileoverview initUI.js initialises and manages the interactive user interface
 * for the Orbito board game. Handles rendering, click and keyboard input, piece
 * animation, score tracking, and result display. Delegates all game logic to the
 * {@link Orbito} module and all statistics tracking to {@link StatsOrbito}.
 * @module initUI
 */

import Orbito from "./orbito.js";
import StatsOrbito from "./StatsOrbito.js";

/**
 * Initialises the Orbito game UI by binding all DOM elements, registering event
 * listeners for mouse and keyboard input, and performing an initial render
 *  of the
 * board. Should be called once the DOM is fully loaded.
 * @function initUI
 * @returns {void}
 */
const initUI = Object.freeze(function initUI() {
    /** @type {Orbito.GameState} The current state of the game. */
    var gameState = Orbito.createGame();
    /** @type {number[]|null} The [row, col] of the currently selected cell,
     *  or null if none. */
    var selectedCell = null;
    /** @type {boolean} True while a piece animation is in progress, blocking
     *  further input. */
    var animating = false;

    /** @type {HTMLElement} The board grid container element. */
    var boardEl = document.querySelector(".board");
    /** @type {HTMLElement[]} All 16 cell elements in row-major order
     *  (row 0 first). */
    var cells = Array.from(document.querySelectorAll(".cell"));
    /** @type {HTMLImageElement} The logo image element, which changes based on
     *  the active player. */
    var logoEl = document.getElementById("orbito-logo");

    // --- Popup elements ---
    /** @type {HTMLElement} The full-screen overlay shown when the game ends. */
    var overlayEl = document.getElementById("result-overlay");
    /** @type {HTMLElement} The text element inside the result popup
     *  (e.g. "Player 1 Wins!"). */
    var messageEl = document.getElementById("result-message");
    /** @type {HTMLButtonElement} The "Play Again" button shown on the result
     *  popup. */
    var playAgainBtn = document.getElementById("result-play-again");

    // --- Original UI elements ---
    /** @type {HTMLElement} The element displaying Player 1's cumulative
     *  win count. */
    var scoreP1El = document.getElementById("score-p1");
    /** @type {HTMLElement} The element displaying Player 2's cumulative
     *  win count. */
    var scoreP2El = document.getElementById("score-p2");
    /** @type {HTMLButtonElement} The button that restarts the current game. */
    var btnRestart = document.getElementById("btn-restart");
    /** @type {HTMLButtonElement} The button that opens the rules overlay. */
    var btnRules = document.getElementById("btn-rules");
    /** @type {HTMLElement} The overlay element containing the rules image. */
    var rulesOverlay = document.getElementById("rules-overlay");
    /** @type {HTMLButtonElement} The button that closes the rules overlay. */
    var rulesCloseBtn = document.getElementById("rules-close");

    // Initialize stats
    /** @type {Object} The current session statistics object for both players.*/
    var currentStats = StatsOrbito.get_statistics(["Player 1", "Player 2"]);

    /**
     * Updates the score display elements to reflect the latest win counts
     * from the current session statistics.
     * @returns {void}
     */
    function updateScores() {
        if (scoreP1El) {
            scoreP1El.textContent = currentStats["Player 1"].player_1_wins;
        }
        if (scoreP2El) {
            scoreP2El.textContent = currentStats["Player 2"].player_2_wins;
        }
    }
    updateScores();

    // --- HELPERS ---

    /**
     * Converts a [row, col] pair to a flat index into the cells array.
     * @param {number} r - Row index (0–3).
     * @param {number} c - Column index (0–3).
     * @returns {number} The corresponding flat index (0–15).
     */
    function cellIndex(r, c) {
        return (r * 4) + c;
    }

    /**
     * Returns the bounding client rectangle of the cell at the given
     *  [row, col].
     * Used to compute the pixel positions needed for slide animations.
     * @param {number} r - Row index (0–3).
     * @param {number} c - Column index (0–3).
     * @returns {DOMRect} The bounding rectangle of the cell element.
     */
    function getCellRect(r, c) {
        return cells[cellIndex(r, c)].getBoundingClientRect();
    }

    /**
     * Re-renders the entire board to match the current game state.
     * Clears and redraws all pieces, applies selection highlights,
     * marks winning and losing cells, updates board turn classes,
     * and switches the logo to reflect the active player.
     * @returns {void}
     */
    function render() {
        cells.forEach(function (cell, index) {
            var r = Math.floor(index / 4);
            var c = index % 4;
            var value = gameState.board[r][c];
            var existingPiece = cell.querySelector(".piece");
            var piece;
            var isWinner;

            cell.classList.remove("cell--dragging");
            cell.classList.remove("cell--winner");
            cell.classList.remove("cell--loser");

            // Clear existing pieces safely
            if (existingPiece) {
                cell.removeChild(existingPiece);
            }

            // Draw piece if the square isn't empty
            if (value !== Orbito.PIECE.EMPTY) {
                piece = document.createElement("div");
                piece.className = "piece player" + value;
                cell.appendChild(piece);
            }

            // Highlight if selected for a move
            if (
                selectedCell &&
                selectedCell[0] === r &&
                selectedCell[1] === c
            ) {
                cell.classList.add("cell--dragging");
            }

            // Highlight winners
            if (gameState.winningCells) {
                isWinner = gameState.winningCells.some(function (coords) {
                    return coords[0] === r && coords[1] === c;
                });
                if (isWinner) {
                    cell.classList.add("cell--winner");
                } else {
                    cell.classList.add("cell--loser");
                }
            }
        });

        boardEl.classList.remove(
            "player1-turn",
            "player2-turn",
            "player1-win",
            "player2-win"
        );

        if (Orbito.isGameOver(gameState)) {
            if (gameState.winner) {
                boardEl.classList.add("player" + gameState.winner + "-win");
            }
        } else {
            boardEl.classList.add("player" + gameState.currentPlayer + "-turn");
        }

        if (logoEl) {
            if (
                gameState.currentPlayer === 2 &&
                !Orbito.isGameOver(gameState)
            ) {
                logoEl.src = "assets/ORBITO_p2.svg";
            } else {
                logoEl.src = "assets/ORBITO.svg";
            }
            if (gameState.winner === 1) {
                logoEl.src = "assets/ORBITO_p2.svg";
            }
            if (gameState.winner === 2) {
                logoEl.src = "assets/ORBITO.svg";
            }
        }
    }

    /**
     * Animates a piece sliding from one cell to another using a
     *  floating clone element
     * and CSS transitions. The clone is appended to the document
     *  body, transitioned to
     * its destination, and removed once the animation ends or a
     *  timeout elapses.
     * @param {number} fromR - Source row index (0–3).
     * @param {number} fromC - Source column index (0–3).
     * @param {number} toR - Destination row index (0–3).
     * @param {number} toC - Destination column index (0–3).
     * @param {string} playerClass - CSS class identifying the
     *  piece colour (e.g. "player1").
     * @param {boolean} fast - If true, uses a shorter animation
     *  duration (for piece moves
     *   rather than board rotation).
     * @returns {Promise<void>} A promise that resolves when the
     *  animation completes.
     */
    function animateSlide(fromR, fromC, toR, toC, playerClass, fast) {
        return new Promise(function (resolve) {
            var fromRect = getCellRect(fromR, fromC);
            var toRect = getCellRect(toR, toC);

            var pieceW = fromRect.width * 0.7;
            var pieceH = fromRect.height * 0.7;

            var clone = document.createElement("div");
            var speedClass = (
                fast
                ? "piece--animating-fast"
                : "piece--animating"
            );
            var startX = fromRect.left + (fromRect.width - pieceW) / 2;
            var startY = fromRect.top + (fromRect.height - pieceH) / 2;
            var dx = toRect.left - startX + (toRect.width - pieceW) / 2;
            var dy = toRect.top - startY + (toRect.height - pieceH) / 2;
            var timeoutMs = (
                fast
                ? 150
                : 500
            );

            clone.className = "piece " + speedClass + " " + playerClass;
            clone.style.width = pieceW + "px";
            clone.style.height = pieceH + "px";
            clone.style.left = startX + "px";
            clone.style.top = startY + "px";
            clone.style.transform = "translate(0, 0)";

            document.body.appendChild(clone);
            clone.getBoundingClientRect(); // Trigger reflow

            clone.style.transform = "translate(" + dx + "px, " + dy + "px)";

            clone.addEventListener("transitionend", function () {
                if (clone.parentNode) {
                    clone.remove();
                }
                resolve();
            }, {once: true});

            setTimeout(function () {
                if (clone.parentNode) {
                    clone.remove();
                }
                resolve();
            }, timeoutMs);
        });
    }

    /**
     * Animates all piece movements caused by a board rotation.
     *  Each piece is slid
     * along its rotation path simultaneously using {@link animateSlide}. Static
     * pieces are hidden during the animation to prevent visual
     *  duplication with clones.
     * Uses {@link Orbito.ROTATION_MAP} to determine each piece's
     *  source and destination.
     * @param {Orbito.Board} boardBeforeRotation - The board layout
     *  captured immediately
     *   after piece placement but before rotation, used to identify
     *  which pieces to animate.
     * @returns {Promise<void>} A promise that resolves when all
     *  animations are complete.
     */
    function animateRotation(boardBeforeRotation) {
        var promises = [];

        cells.forEach(function (cell) {
            var piece = cell.querySelector(".piece");
            if (piece) {
                piece.style.visibility = "hidden";
            }
        });

        Orbito.ROTATION_MAP.forEach(function (mapping) {
            var oldR = mapping[0][0];
            var oldC = mapping[0][1];
            var newR = mapping[1][0];
            var newC = mapping[1][1];
            var value = boardBeforeRotation[oldR][oldC];

            if (value !== Orbito.PIECE.EMPTY) {
                promises.push(
                    animateSlide(
                        oldR,
                        oldC,
                        newR,
                        newC,
                        "player" + value,
                        false
                    )
                );
            }
        });

        if (promises.length === 0) {
            return Promise.resolve();
        }

        return Promise.all(promises);
    }

    /**
     * Checks whether the game has ended and, if so, records the result in the
     * statistics, updates the score display, and shows the result popup with
     * styling appropriate to the winner or draw.
     * @returns {void}
     */
    function checkAndShowResult() {
        if (Orbito.isGameOver(gameState)) {
            var resultNum = 0;
            if (gameState.winner) {
                messageEl.textContent = "Player " + gameState.winner + " Wins!";
                resultNum = gameState.winner;
            } else if (gameState.isDraw) {
                messageEl.textContent = "It's a Draw!";
                resultNum = 0;
            }

            currentStats = StatsOrbito.record_game(
                "Player 1",
                "Player 2",
                resultNum
            );
            updateScores();

            setTimeout(function () {
                var popupEl = document.querySelector(".result-popup");
                overlayEl.classList.add("result-overlay--visible");
                if (gameState.winner === 1) {
                    popupEl.classList.add("result-popup--player1-win");
                } else if (gameState.winner === 2) {
                    popupEl.classList.add("result-popup--player2-win");
                } else if (gameState.isDraw) {
                    popupEl.classList.add("result-popup--draw");
                }
            }, 200);
            if (playAgainBtn) {
                playAgainBtn.focus();
            }
        }
    }

    // --- BUTTON EVENT LISTENERS ---

    if (playAgainBtn) {
        playAgainBtn.onclick = function () {
            overlayEl.classList.remove("result-overlay--visible");
            gameState = Orbito.createGame();
            selectedCell = null;
            render();
            if (cells.length > 0) {
                cells[0].focus();
            }
        };
    }

    if (btnRestart) {
        btnRestart.onclick = function () {
            overlayEl.classList.remove("result-overlay--visible");
            gameState = Orbito.createGame();
            selectedCell = null;
            render();
            if (cells.length > 0) {
                cells[0].focus();
            }
        };
    }

    if (btnRules && rulesOverlay) {
        btnRules.onclick = function () {
            rulesOverlay.classList.add("result-overlay--visible");
        };
    }

    if (rulesCloseBtn && rulesOverlay) {
        rulesCloseBtn.onclick = function () {
            rulesOverlay.classList.remove("result-overlay--visible");
            if (cells.length > 0) {
                cells[0].focus();
            }
        };
    }

    // --- GLOBAL KEYBOARD SHORTCUTS ---

    document.addEventListener("keydown", function (event) {
        var isGameOverPopup = overlayEl.classList.contains(
            "result-overlay--visible"
        );
        var isRulesPopup = rulesOverlay && rulesOverlay.classList.contains(
            "result-overlay--visible"
        );

        if (event.key === "Escape") {
            if (isRulesPopup) {
                rulesOverlay.classList.remove("result-overlay--visible");
                if (cells.length > 0) {
                    cells[0].focus();
                }
            } else if (selectedCell) {
                selectedCell = null; // Deselect piece on Escape
                render();
            }
            return;
        }

        if (event.key === "n" || event.key === "N") {
            if (isGameOverPopup) {
                if (playAgainBtn) {
                    playAgainBtn.onclick();
                }
            } else {
                if (btnRestart) {
                    btnRestart.onclick();
                }
            }
            return;
        }

        if (event.key === "r" || event.key === "R") {
            if (btnRules && !isGameOverPopup) {
                btnRules.onclick();
            }
            return;
        }

        if (event.key === "Enter") {
            if (isGameOverPopup) {
                if (playAgainBtn) {
                    playAgainBtn.onclick();
                }
                event.preventDefault(); // Stop from clicking grid behind it
                return;
            }
        }
    });

    // --- CORE INTERACTION LOGIC ---

    /**
     * Handles a player interaction with a given cell element.
     * Covers three scenarios in order of priority:
     * - (A) A piece is already selected: attempt to move it to this cell.
     * - (B) This cell holds an opponent's piece: select it for moving.
     * - (C) This cell is empty: place the current player's piece and
     *  trigger rotation.
     * Does nothing if an animation is currently in progress or the game
     *  is over.
     * @param {HTMLElement} cellEl - The cell element that was clicked
     *  or activated.
     * @returns {void}
     */
    function attemptInteraction(cellEl) {
        if (animating || Orbito.isGameOver(gameState)) {
            return;
        }

        var index = cells.indexOf(cellEl);
        var r = Math.floor(index / 4);
        var c = index % 4;
        var sr;
        var sc;
        var pieceValue;
        var moveState;
        var boardBeforeRotation;
        var placement;
        var placedPiece;
        var srcPiece;

        // SCENARIO A: A piece is already selected, try to move it here
        if (selectedCell) {
            sr = selectedCell[0];
            sc = selectedCell[1];
            pieceValue = gameState.board[sr][sc];
            moveState = Orbito.movePiece(gameState, selectedCell, [r, c]);

            if (moveState !== gameState) {
                animating = true;
                srcPiece = cells[cellIndex(sr, sc)].querySelector(".piece");
                if (srcPiece) {
                    srcPiece.style.visibility = "hidden";
                }

                animateSlide(
                    sr,
                    sc,
                    r,
                    c,
                    "player" + pieceValue,
                    true
                ).then(function () {
                    gameState = moveState;
                    selectedCell = null;
                    animating = false;
                    render();
                });
            } else {
                selectedCell = null;
                render();
            }
            return;
        }

        // SCENARIO B: Clicked opponent's piece to initiate a move
        if (Orbito.canSelectPiece(gameState, r, c)) {
            selectedCell = [r, c];
            render();
            return;
        }

        // SCENARIO C: Clicked an empty square to place a piece
        if (Orbito.canPlacePiece(gameState, r, c)) {
            boardBeforeRotation = gameState.board.map(function (row) {
                return row.slice();
            });
            boardBeforeRotation[r][c] = gameState.currentPlayer;

            placement = Orbito.placePieceAndEndTurn(gameState, r, c);

            if (placement.state !== gameState) {
                animating = true;

                placedPiece = document.createElement("div");
                placedPiece.className = (
                    "piece player" + gameState.currentPlayer
                );
                cellEl.appendChild(placedPiece);

                setTimeout(function () {
                    animateRotation(boardBeforeRotation).then(function () {
                        gameState = placement.state;
                        animating = false;
                        render();
                        checkAndShowResult();
                    });
                }, 150);
            }
        }
    }

    // --- EVENT DELEGATION FOR CLICKS & KEYBOARD ---

    cells.forEach(function (cell, index) {
        cell.tabIndex = 0; // Essential for keyboard focus

        cell.onclick = function () {
            attemptInteraction(cell);
        };

        cell.onkeydown = function (event) {
            // Ignore keys handled globally by document listener
            if (
                event.key === "n" ||
                event.key === "N" ||
                event.key === "r" ||
                event.key === "R"
            ) {
                return;
            }

            if (event.key === "Enter" || event.key === "Space") {
                event.preventDefault(); // Stop page scrolling
                cell.onclick();
            }
            // Navigate left (unless on the left edge)
            if (event.key === "ArrowLeft" && (index % 4) !== 0) {
                cells[index - 1].focus();
            }
            // Navigate right (unless on the right edge)
            if (event.key === "ArrowRight" && (index % 4) !== 3) {
                cells[index + 1].focus();
            }
            // Navigate up
            if (event.key === "ArrowUp" && index >= 4) {
                cells[index - 4].focus();
            }
            // Navigate down
            if (event.key === "ArrowDown" && index < 12) {
                cells[index + 4].focus();
            }
        };
    });

    render(); // Initial draw

    // Ensure keyboard works immediately on page load
    if (cells.length > 0) {
        cells[0].focus();
    }
});
export {initUI};