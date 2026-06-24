import {
    createGame,
    movePiece,
    placePieceAndEndTurn,
    canSelectPiece,
    canMovePiece,
    canPlacePiece,
    isGameOver,
    PIECE
} from "./orbito.js";

export var initUI = Object.freeze(function initUI() {
    var gameState = createGame();
    var selectedCell = null; // Tracks clicks for moving an opponent's piece
    var animating = false;  // Block input during animations

    var p1Wins = 0;
    var p2Wins = 0;

    var boardEl = document.querySelector(".board");
    var cells = Array.from(document.querySelectorAll(".cell"));
    var logoEl = document.getElementById("orbito-logo");

    // Enable keyboard navigation for cells
    cells.forEach(function (cell) {
        cell.setAttribute("tabindex", "0");
    });

    // --- Popup elements ---
    var overlayEl = document.getElementById("result-overlay");
    var messageEl = document.getElementById("result-message");
    var playAgainBtn = document.getElementById("result-play-again");

    // --- New UI elements ---
    var scoreP1El = document.getElementById("score-p1");
    var scoreP2El = document.getElementById("score-p2");
    var btnRestart = document.getElementById("btn-restart");
    var btnRules = document.getElementById("btn-rules");
    var rulesOverlay = document.getElementById("rules-overlay");
    var rulesCloseBtn = document.getElementById("rules-close");

    function updateScores() {
        if (scoreP1El) {
            scoreP1El.textContent = p1Wins;
        }
        if (scoreP2El) {
            scoreP2El.textContent = p2Wins;
        }
    }

    // --- ROTATION MAP ---
    // Derived from rotateBoard in orbito.js: old [r,c] → new [r,c]
    // Outer ring (anticlockwise)
    // Inner ring (anticlockwise)
    var ROTATION_MAP = [
        // outer ring
        [[0, 0], [1, 0]],
        [[1, 0], [2, 0]],
        [[2, 0], [3, 0]],
        [[3, 0], [3, 1]],
        [[3, 1], [3, 2]],
        [[3, 2], [3, 3]],
        [[3, 3], [2, 3]],
        [[2, 3], [1, 3]],
        [[1, 3], [0, 3]],
        [[0, 3], [0, 2]],
        [[0, 2], [0, 1]],
        [[0, 1], [0, 0]],
        // inner ring
        [[1, 1], [2, 1]],
        [[2, 1], [2, 2]],
        [[2, 2], [1, 2]],
        [[1, 2], [1, 1]]
    ];

    // --- HELPERS ---

    function cellIndex(r, c) {
        return r * 4 + c;
    }

    function getCellRect(r, c) {
        return cells[cellIndex(r, c)].getBoundingClientRect();
    }

    // --- RENDER (instant, no animation) ---
    function render() {
        cells.forEach(function (cell, index) {
            var r = Math.floor(index / 4);
            var c = index % 4;
            var value = gameState.board[r][c];
            var piece;
            var isWinner;
            cell.classList.remove("cell--dragging");
            cell.classList.remove("cell--winner");
            cell.classList.remove("cell--loser");
            cell.innerHTML = ""; // Clear existing pieces

            // Draw piece if the square isn't empty
            if (value !== PIECE.EMPTY) {
                piece = document.createElement("div");
                piece.classList.add("piece", "player" + value);
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
            if (gameState.winningCells) {
                isWinner = gameState.winningCells.some(function (wc) {
                    return wc[0] === r && wc[1] === c;
                });
                if (isWinner) {
                    cell.classList.add("cell--winner");
                } else {
                    cell.classList.add("cell--loser");
                }
            }

        });

        // Update board turn / win classes
        boardEl.classList.remove("player1-turn", "player2-turn");
        if (!isGameOver(gameState)) {
            boardEl.classList.add("player" + gameState.currentPlayer + "-turn");
        }
        boardEl.classList.remove("player1-win", "player2-win");
        if (gameState.winner) {
            boardEl.classList.remove("player1-turn", "player2-turn");
            boardEl.classList.add("player" + gameState.winner + "-win");
        }

        // Swap logo based on whose turn it is
        if (logoEl) {
            if (
                gameState.currentPlayer === PIECE.PLAYER_2 &&
                !gameState.winner &&
                !gameState.isDraw
            ) {
                logoEl.src = "assets/ORBITO_p2.svg";
            } else {
                logoEl.src = "assets/ORBITO.svg";
            }
        }
    }

    // --- ANIMATE A SINGLE PIECE SLIDING ---
    // Returns a Promise that resolves when the animation finishes.
    function animateSlide(fromR, fromC, toR, toC, playerClass, fast) {
        return new Promise(function (resolve) {
            var fromRect = getCellRect(fromR, fromC);
            var toRect = getCellRect(toR, toC);

            // Compute piece size (70% of cell, matching .piece CSS)
            var pieceW = fromRect.width * 0.7;
            var pieceH = fromRect.height * 0.7;

            // Create a fixed-position clone
            var clone = document.createElement("div");
            clone.classList.add(
                "piece",
                (
                    fast
                    ? "piece--animating-fast"
                    : "piece--animating"
                ),
                playerClass
            );
            clone.style.width = pieceW + "px";
            clone.style.height = pieceH + "px";

            // Start position: centred in the old cell
            var startX = fromRect.left + (fromRect.width - pieceW) / 2;
            var startY = fromRect.top + (fromRect.height - pieceH) / 2;
            clone.style.left = startX + "px";
            clone.style.top = startY + "px";
            clone.style.transform = "translate(0, 0)";

            document.body.appendChild(clone);

            // Compute delta to the new cell centre
            var endX = toRect.left + (toRect.width - pieceW) / 2;
            var endY = toRect.top + (toRect.height - pieceH) / 2;
            var dx = endX - startX;
            var dy = endY - startY;

            // Trigger reflow so the browser registers the starting position
            // before applying the transition
            clone.getBoundingClientRect();

            // Animate
            clone.style.transform = "translate(" + dx + "px, " + dy + "px)";

            clone.addEventListener("transitionend", function () {
                clone.remove();
                resolve();
            }, { once: true });

            // Safety fallback in case transitionend doesn't fire
            setTimeout(function () {
                clone.remove();
                resolve();
            }, (
                fast
                ? 150
                : 500
            ));
        });
    }

    // --- ANIMATE ROTATION ---
    // Takes the board state BEFORE rotation and animates each piece
    // sliding to its post-rotation position.
    function animateRotation(boardBeforeRotation) {
        var promises = [];

        // Hide all real pieces during animation
        cells.forEach(function (cell) {
            var piece = cell.querySelector(".piece");
            if (piece) {
                piece.style.visibility = "hidden";
            }
        });

        ROTATION_MAP.forEach(function (mapItem) {
            var from = mapItem[0];
            var to = mapItem[1];
            var oldR = from[0];
            var oldC = from[1];
            var value = boardBeforeRotation[oldR][oldC];
            var newR;
            var newC;
            if (value !== PIECE.EMPTY) {
                newR = to[0];
                newC = to[1];
                promises.push(
                    animateSlide(
                        oldR,
                        oldC,
                        newR,
                        newC,
                        "player" + value
                    )
                );
            }
        });

        if (promises.length === 0) {
            return Promise.resolve();
        }

        return Promise.all(promises);
    }

    // --- ANIMATE OPPONENT MOVE ---
    function animateMove(fromR, fromC, toR, toC, playerValue) {
        // Hide the piece in the source cell during animation
        var srcPiece = cells[cellIndex(fromR, fromC)].querySelector(".piece");
        if (srcPiece) {
            srcPiece.style.visibility = "hidden";
        }

        return animateSlide(
            fromR,
            fromC,
            toR,
            toC,
            "player" + playerValue,
            true
        );
    }

    // --- POPUP ---
    function showResultPopup(message) {
        messageEl.textContent = message;
        overlayEl.classList.add("result-overlay--visible");
    }

    function hideResultPopup() {
        overlayEl.classList.remove("result-overlay--visible");
    }

    playAgainBtn.addEventListener("click", function () {
        hideResultPopup();
        gameState = createGame();
        selectedCell = null;
        render();
    });

    btnRestart.addEventListener("click", function () {
        hideResultPopup();
        gameState = createGame();
        selectedCell = null;
        render();
    });

    btnRules.addEventListener("click", function () {
        rulesOverlay.classList.add("result-overlay--visible");
    });

    rulesCloseBtn.addEventListener("click", function () {
        rulesOverlay.classList.remove("result-overlay--visible");
    });

    function checkAndShowResult() {
        if (gameState.winner) {
            if (gameState.winner === PIECE.PLAYER_1) {
                p1Wins += 1;
            }
            if (gameState.winner === PIECE.PLAYER_2) {
                p2Wins += 1;
            }
            updateScores();
            showResultPopup("Player " + gameState.winner + " Wins!");
        } else if (gameState.isDraw) {
            showResultPopup("It's a Draw!");
        }
    }

    // --- KEYBOARD ACCESSIBILITY ---

    document.addEventListener("keydown", function (e) {
        var cellEl = document.activeElement;
        var index;
        var newIndex;

        // Hotkeys for N (New Game) and R (Rules)
        if (e.key === "n" || e.key === "N") {
            btnRestart.click();
            return;
        }
        if (e.key === "r" || e.key === "R") {
            btnRules.click();
            return;
        }

        if (animating || isGameOver(gameState)) {
            return;
        }

        // If no cell is focused and an arrow/enter is pressed, focus the first cell
        if (!cellEl || !cellEl.classList.contains("cell")) {
            if (
                e.key === "ArrowRight" ||
                e.key === "ArrowLeft" ||
                e.key === "ArrowDown" ||
                e.key === "ArrowUp" ||
                e.key === "Enter"
            ) {
                cells[0].focus();
                e.preventDefault();
            }
            return;
        }

        index = cells.indexOf(cellEl);

        if (e.key === "ArrowRight") {
            newIndex = (index + 1) % 16;
            cells[newIndex].focus();
            e.preventDefault();
        } else if (e.key === "ArrowLeft") {
            newIndex = (index - 1 + 16) % 16;
            cells[newIndex].focus();
            e.preventDefault();
        } else if (e.key === "ArrowDown") {
            newIndex = (index + 4) % 16;
            cells[newIndex].focus();
            e.preventDefault();
        } else if (e.key === "ArrowUp") {
            newIndex = (index - 4 + 16) % 16;
            cells[newIndex].focus();
            e.preventDefault();
        } else if (e.key === "Enter" || e.key === " ") {
            cellEl.click();
            e.preventDefault();
        } else if (e.key === "Escape") {
            if (rulesOverlay.classList.contains("result-overlay--visible")) {
                rulesOverlay.classList.remove("result-overlay--visible");
            } else if (selectedCell) {
                selectedCell = null;
                render();
            }
            e.preventDefault();
        }
    });

    // --- EVENT DELEGATION FOR CLICKS ---

    boardEl.addEventListener("click", function (e) {
        var cellEl;
        var index;
        var r;
        var c;
        var sr;
        var sc;
        var pieceValue;
        var newState;
        var placement;
        var placedPiece;

        if (animating || isGameOver(gameState)) {
            return;
        }

        cellEl = e.target.closest(".cell");
        if (!cellEl) {
            return;
        }

        // Convert the 1D HTML NodeList index to 2D row/col coordinates
        index = cells.indexOf(cellEl);
        r = Math.floor(index / 4);
        c = index % 4;

        // SCENARIO A: A piece is already selected, try to move it here
        if (selectedCell) {
            sr = selectedCell[0];
            sc = selectedCell[1];

            if (canMovePiece(gameState, selectedCell, [r, c])) {
                pieceValue = gameState.board[sr][sc];
                newState = movePiece(gameState, selectedCell, [r, c]);
                animating = true;
                animateMove(sr, sc, r, c, pieceValue).then(function () {
                    gameState = newState;
                    selectedCell = null;
                    render();
                    animating = false;
                });
            } else {
                selectedCell = null; // Clear selection on failed second click
                render();
            }
            return;
        }

        // SCENARIO B: Clicked opponent's piece to initiate a move
        if (canSelectPiece(gameState, r, c)) {
            selectedCell = [r, c];
            render();
            return;
        }

        // SCENARIO C: Clicked an empty square to place a piece
        if (canPlacePiece(gameState, r, c)) {
            placement = placePieceAndEndTurn(gameState, r, c);
            
            if (placement.state !== gameState) {
                animating = true;

                // 1. Show the placed piece instantly in the cell
                placedPiece = document.createElement("div");
                placedPiece.classList.add(
                    "piece",
                    "player" + gameState.currentPlayer
                );
                cellEl.appendChild(placedPiece);

                // 2. Small pause so the user sees the placement before rotation
                new Promise(function (res) {
                    setTimeout(res, 150);
                }).then(function () {
                    // 3. Animate pieces sliding using the Engine's intermediate state
                    return animateRotation(placement.intermediateBoard);
                }).then(function () {
                    // 4. Apply final state and render
                    gameState = placement.state;
                    render();
                    animating = false;

                    // 5. Check for win / draw after animation
                    checkAndShowResult();
                });
            }
        }
    });

    render(); // Initial draw
});