import { createGame, movePiece, placePieceAndEndTurn } from './orbito.js';

export const initUI = () => {
    let gameState = createGame();
    let selectedCell = null; // Tracks clicks for moving an opponent's piece
    let animating = false;  // Block input during animations

    let p1Wins = 0;
    let p2Wins = 0;

    const boardEl = document.querySelector('.board');
    const cells = Array.from(document.querySelectorAll('.cell'));
    const logoEl = document.getElementById('orbito-logo');

    // --- Popup elements ---
    const overlayEl = document.getElementById('result-overlay');
    const messageEl = document.getElementById('result-message');
    const playAgainBtn = document.getElementById('result-play-again');

    // --- New UI elements ---
    const scoreP1El = document.getElementById('score-p1');
    const scoreP2El = document.getElementById('score-p2');
    const btnRestart = document.getElementById('btn-restart');
    const btnRules = document.getElementById('btn-rules');
    const rulesOverlay = document.getElementById('rules-overlay');
    const rulesCloseBtn = document.getElementById('rules-close');

    const updateScores = () => {
        if (scoreP1El) scoreP1El.textContent = p1Wins;
        if (scoreP2El) scoreP2El.textContent = p2Wins;
    };

    // --- ROTATION MAP ---
    // Derived from rotateBoard in orbito.js: old [r,c] → new [r,c]
    // Outer ring (anticlockwise)
    // Inner ring (anticlockwise)
    const ROTATION_MAP = [
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

    const cellIndex = (r, c) => r * 4 + c;

    const getCellRect = (r, c) => cells[cellIndex(r, c)].getBoundingClientRect();

    // --- RENDER (instant, no animation) ---
    const render = () => {
        cells.forEach((cell, index) => {
            const r = Math.floor(index / 4);
            const c = index % 4;
            const value = gameState.board[r][c];
            cell.classList.remove('cell--dragging');
            cell.classList.remove('cell--winner');
            cell.classList.remove('cell--loser');
            cell.innerHTML = ''; // Clear existing pieces

            // Draw piece if the square isn't empty
            if (value !== 0) {
                const piece = document.createElement('div');
                piece.classList.add('piece', `player${value}`);
                cell.appendChild(piece);
            }

            // Highlight if selected for a move
            if (selectedCell && selectedCell[0] === r && selectedCell[1] === c) {
                cell.classList.add('cell--dragging');
            }
            if (gameState.winningCells) {
                const isWinner = gameState.winningCells.some(([wr, wc]) => wr === r && wc === c);
                if (isWinner) {
                    cell.classList.add('cell--winner');
                } else {
                    cell.classList.add('cell--loser');
                }
            }

        });

        // Update board turn / win classes
        boardEl.classList.remove('player1-turn', 'player2-turn');
        if (!gameState.winner && !gameState.isDraw) {
            boardEl.classList.add(`player${gameState.currentPlayer}-turn`);
        }
        boardEl.classList.remove('player1-win', 'player2-win');
        if (gameState.winner) {
            boardEl.classList.remove('player1-turn', 'player2-turn');
            boardEl.classList.add(`player${gameState.winner}-win`);
        }

        // Swap logo based on whose turn it is
        if (logoEl) {
            logoEl.src = gameState.currentPlayer === 2 && !gameState.winner && !gameState.isDraw
                ? 'assets/ORBITO_p2.svg'
                : 'assets/ORBITO.svg';
        }
    };

    // --- ANIMATE A SINGLE PIECE SLIDING ---
    // Returns a Promise that resolves when the animation finishes.
    const animateSlide = (fromR, fromC, toR, toC, playerClass, fast = false) => {
        return new Promise((resolve) => {
            const fromRect = getCellRect(fromR, fromC);
            const toRect = getCellRect(toR, toC);

            // Compute piece size (70% of cell, matching .piece CSS)
            const pieceW = fromRect.width * 0.7;
            const pieceH = fromRect.height * 0.7;

            // Create a fixed-position clone
            const clone = document.createElement('div');
            clone.classList.add('piece', fast ? 'piece--animating-fast' : 'piece--animating', playerClass);
            clone.style.width = pieceW + 'px';
            clone.style.height = pieceH + 'px';

            // Start position: centred in the old cell
            const startX = fromRect.left + (fromRect.width - pieceW) / 2;
            const startY = fromRect.top + (fromRect.height - pieceH) / 2;
            clone.style.left = startX + 'px';
            clone.style.top = startY + 'px';
            clone.style.transform = 'translate(0, 0)';

            document.body.appendChild(clone);

            // Compute delta to the new cell centre
            const endX = toRect.left + (toRect.width - pieceW) / 2;
            const endY = toRect.top + (toRect.height - pieceH) / 2;
            const dx = endX - startX;
            const dy = endY - startY;

            // Trigger reflow so the browser registers the starting position
            // before applying the transition
            clone.getBoundingClientRect();

            // Animate
            clone.style.transform = `translate(${dx}px, ${dy}px)`;

            clone.addEventListener('transitionend', () => {
                clone.remove();
                resolve();
            }, { once: true });

            // Safety fallback in case transitionend doesn't fire
            setTimeout(() => {
                clone.remove();
                resolve();
            }, fast ? 150 : 500);
        });
    };

    // --- ANIMATE ROTATION ---
    // Takes the board state BEFORE rotation and animates each piece
    // sliding to its post-rotation position.
    const animateRotation = (boardBeforeRotation) => {
        const promises = [];

        // Hide all real pieces during animation
        cells.forEach((cell) => {
            const piece = cell.querySelector('.piece');
            if (piece) {
                piece.style.visibility = 'hidden';
            }
        });

        ROTATION_MAP.forEach(([from, to]) => {
            const [oldR, oldC] = from;
            const value = boardBeforeRotation[oldR][oldC];
            if (value !== 0) {
                const [newR, newC] = to;
                promises.push(
                    animateSlide(oldR, oldC, newR, newC, `player${value}`)
                );
            }
        });

        if (promises.length === 0) {
            return Promise.resolve();
        }

        return Promise.all(promises);
    };

    // --- ANIMATE OPPONENT MOVE ---
    const animateMove = (fromR, fromC, toR, toC, playerValue) => {
        // Hide the piece in the source cell during animation
        const srcPiece = cells[cellIndex(fromR, fromC)].querySelector('.piece');
        if (srcPiece) {
            srcPiece.style.visibility = 'hidden';
        }

        return animateSlide(fromR, fromC, toR, toC, `player${playerValue}`, true);
    };

    // --- POPUP ---
    const showResultPopup = (message) => {
        messageEl.textContent = message;
        overlayEl.classList.add('result-overlay--visible');
    };

    const hideResultPopup = () => {
        overlayEl.classList.remove('result-overlay--visible');
    };

    playAgainBtn.addEventListener('click', () => {
        hideResultPopup();
        gameState = createGame();
        selectedCell = null;
        render();
    });

    btnRestart.addEventListener('click', () => {
        hideResultPopup();
        p1Wins = 0;
        p2Wins = 0;
        updateScores();
        gameState = createGame();
        selectedCell = null;
        render();
    });

    btnRules.addEventListener('click', () => {
        rulesOverlay.classList.add('result-overlay--visible');
    });

    rulesCloseBtn.addEventListener('click', () => {
        rulesOverlay.classList.remove('result-overlay--visible');
    });

    const checkAndShowResult = () => {
        if (gameState.winner) {
            if (gameState.winner === 1) p1Wins++;
            if (gameState.winner === 2) p2Wins++;
            updateScores();
            showResultPopup(`Player ${gameState.winner} Wins!`);
        } else if (gameState.isDraw) {
            showResultPopup("It's a Draw!");
        }
    };

    // --- EVENT DELEGATION FOR CLICKS ---

    boardEl.addEventListener('click', async (e) => {
        if (animating) return;
        if (gameState.winner || gameState.isDraw) return;

        const cellEl = e.target.closest('.cell');
        if (!cellEl) return;

        // Convert the 1D HTML NodeList index to 2D row/col coordinates
        const index = cells.indexOf(cellEl);
        const r = Math.floor(index / 4);
        const c = index % 4;

        // SCENARIO A: A piece is already selected, try to move it here
        if (selectedCell) {
            const [sr, sc] = selectedCell;
            const pieceValue = gameState.board[sr][sc];
            const newState = movePiece(gameState, selectedCell, [r, c]);

            if (newState !== gameState) {
                // Move was successful — animate it
                animating = true;
                await animateMove(sr, sc, r, c, pieceValue);
                gameState = newState;
                selectedCell = null;
                render();
                animating = false;
            } else {
                selectedCell = null; // Clear selection on failed second click
                render();
            }
            return;
        }

        const clickedValue = gameState.board[r][c];
        const opponent = gameState.currentPlayer === 1 ? 2 : 1;

        // SCENARIO B: Clicked opponent's piece to initiate a move
        if (clickedValue === opponent && gameState.phase === 'move_or_place') {
            selectedCell = [r, c];
            render();
            return;
        }

        // SCENARIO C: Clicked an empty square to place a piece
        if (clickedValue === 0) {
            // Save the board state AFTER placing but BEFORE rotating
            // We need the placed-board for the animation source
            const boardBeforeRotation = gameState.board.map(row => [...row]);
            boardBeforeRotation[r][c] = gameState.currentPlayer;

            const newState = placePieceAndEndTurn(gameState, r, c);
            if (newState !== gameState) {
                animating = true;

                // 1. Show the placed piece instantly in the cell
                const placedPiece = document.createElement('div');
                placedPiece.classList.add('piece', `player${gameState.currentPlayer}`);
                cellEl.appendChild(placedPiece);

                // 2. Small pause so the user sees the placement before rotation
                await new Promise((res) => setTimeout(res, 150));

                // 3. Animate pieces sliding to their rotated positions
                await animateRotation(boardBeforeRotation);

                // 4. Apply final state and render
                gameState = newState;
                render();
                animating = false;

                // 5. Check for win / draw after animation
                checkAndShowResult();
            }
        }
    });

    render(); // Initial draw
};