import { createGame, movePiece, placePieceAndEndTurn } from './orbito.js';

export const initUI = () => {
    let gameState = createGame();
    let selectedCell = null; // Tracks clicks for moving an opponent's piece

    const boardEl = document.querySelector('.board');
    const cells = Array.from(document.querySelectorAll('.cell'));

    // Inject the status text element dynamically so it matches your CSS
    let statusEl = document.getElementById('status');
    if (!statusEl) {
        statusEl = document.createElement('div');
        statusEl.id = 'status';
        boardEl.parentNode.insertBefore(statusEl, boardEl);
    }

    const render = () => {
        // 1. Update the grid visually
        cells.forEach((cell, index) => {
            const r = Math.floor(index / 4);
            const c = index % 4;
            const value = gameState.board[r][c];

            cell.innerHTML = ''; // Clear existing pieces
            cell.classList.remove('cell--dragging');

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

        });

        // 2. Update the Status UI
        if (gameState.winner) {
            statusEl.textContent = `Player ${gameState.winner} Wins!`;
            statusEl.className = `player${gameState.winner}`;
        } else if (gameState.isDraw) {
            statusEl.textContent = "It's a Draw!";
            statusEl.className = "";
        } else {
            const phaseText = gameState.phase === 'move_or_place' ? '(Move Opponent or Place)' : '(Place Piece)';
            statusEl.textContent = `Player ${gameState.currentPlayer}'s Turn ${phaseText}`;
            statusEl.className = `player${gameState.currentPlayer}`;
        }
        boardEl.classList.remove('player1-turn', 'player2-turn');
        if (!gameState.winner && !gameState.isDraw) {
            boardEl.classList.add(`player${gameState.currentPlayer}-turn`);
        }
    };

    // --- EVENT DELEGATION FOR CLICKS ---

    boardEl.addEventListener('click', (e) => {
        if (gameState.winner || gameState.isDraw) return;

        const cellEl = e.target.closest('.cell');
        if (!cellEl) return;

        // Convert the 1D HTML NodeList index to 2D row/col coordinates
        const index = cells.indexOf(cellEl);
        const r = Math.floor(index / 4);
        const c = index % 4;

        // SCENARIO A: A piece is already selected, try to move it here
        if (selectedCell) {
            const newState = movePiece(gameState, selectedCell, [r, c]);
            if (newState !== gameState) {
                gameState = newState; // Move was successful
            }
            selectedCell = null; // Always clear selection on second click
            render();
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
            const newState = placePieceAndEndTurn(gameState, r, c);
            if (newState !== gameState) {
                gameState = newState;
            }
            render();
        }
    });

    render(); // Initial draw
};