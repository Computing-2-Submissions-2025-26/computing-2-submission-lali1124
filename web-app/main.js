import R from "./ramda.js";

// ui.js — all DOM interaction, imports game logic from orbito.js

import {
    gameState,
    moveOpponentPiece,
    placeOwnPiece,
    endTurn,
} from "./orbito.js";

// ─── Turn Phase State ─────────────────────────────────────────────────────────
// Tracks where we are within the current player's turn
let phase = "MOVE_OPPONENT"; // or "PLACE_OWN"
let dragging = null; // { fromRow, fromCol } while dragging opponent piece

// ─── Entry Point ─────────────────────────────────────────────────────────────

export function initUI() {
    renderBoard();
    renderTrays();
    renderStatus();
    setupFloater();
}

// ─── Render Board ─────────────────────────────────────────────────────────────

function renderBoard() {
    const boardEl = document.querySelector(".board");
    // Clear existing pieces (keep arrow classes on cells)
    boardEl.querySelectorAll(".piece").forEach((p) => p.remove());

    const cells = boardEl.querySelectorAll(".cell");
    cells.forEach((cell, i) => {
        const row = Math.floor(i / 4);
        const col = i % 4;

        // Store position as data attributes for easy lookup
        cell.dataset.row = row;
        cell.dataset.col = col;

        // Place a piece element inside the cell if occupied
        const value = gameState.board[row][col];
        if (value !== 0) {
            const piece = document.createElement("div");
            piece.classList.add("piece", `player${value}`);
            cell.appendChild(piece);
        }

        // One click handler does everything depending on phase
        cell.onclick = () => handleCellClick(row, col);
    });
}

// ─── Render Trays ─────────────────────────────────────────────────────────────

function renderTrays() {
    renderTray(".tray1", 1);
    renderTray(".tray2", 2);
}

function renderTray(selector, player) {
    const tray = document.querySelector(selector);
    tray.innerHTML = ""; // clear

    const total = 8;
    const inTray = gameState.piecesInTray[player];

    for (let i = 0; i < total; i++) {
        const slot = document.createElement("div");
        slot.classList.add("tray-slot");

        if (i < inTray) {
            // Piece still available
            const piece = document.createElement("div");
            piece.classList.add("piece", `player${player}`);
            slot.appendChild(piece);
        } else {
            // Already placed — show empty slot
            slot.classList.add("tray-slot--empty");
        }

        tray.appendChild(slot);
    }
}

// ─── Status Message ───────────────────────────────────────────────────────────

function renderStatus() {
    let statusEl = document.getElementById("status");
    if (!statusEl) {
        statusEl = document.createElement("p");
        statusEl.id = "status";
        // Insert above the board section
        document.querySelector(".page-container").before(statusEl);
    }

    const p = gameState.currentPlayer;
    const phaseMsg =
        phase === "MOVE_OPPONENT"
            ? `Player ${p}: click an opponent's piece and drag it to an adjacent square.`
            : `Player ${p}: click an empty square to place your piece.`;

    statusEl.textContent = phaseMsg;
    statusEl.className = `status player${p}`;
}

// ─── Cell Click Handler ───────────────────────────────────────────────────────

function handleCellClick(row, col) {
    if (phase === "MOVE_OPPONENT") {
        if (dragging) {
            // Second click — attempt to drop
            const result = moveOpponentPiece(dragging.fromRow, dragging.fromCol, row, col);
            cancelDrag();

            if (result.ok) {
                phase = "PLACE_OWN";
                renderBoard();
                renderStatus();
            }
            // If invalid, drag is cancelled silently — player just tries again
        } else {
            // First click — pick up if it's an opponent's piece
            const opponent = gameState.currentPlayer === 1 ? 2 : 1;
            if (gameState.board[row][col] === opponent) {
                startDrag(row, col, opponent);
            }
        }
    } else if (phase === "PLACE_OWN") {
        const result = placeOwnPiece(row, col);
        if (result.ok) {
            // Animate board rotation then end turn
            animateRotation(() => {
                endTurn();
                phase = "MOVE_OPPONENT";
                renderBoard();
                renderTrays();
                renderStatus();
            });
        }
    }
}

// ─── Drag (floating piece following cursor) ────────────────────────────────────

function setupFloater() {
    if (!document.getElementById("floater")) {
        const floater = document.createElement("div");
        floater.id = "floater";
        floater.style.cssText =
            "display:none; position:fixed; pointer-events:none; z-index:100; width:50px; height:50px; border-radius:50%; transform:translate(-50%,-50%);";
        document.body.appendChild(floater);
    }
}

function startDrag(row, col, player) {
    dragging = { fromRow: row, fromCol: col };

    const floater = document.getElementById("floater");
    floater.className = `piece player${player}`;
    floater.style.display = "block";

    // Highlight the picked-up cell
    const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
    cell.classList.add("cell--dragging");

    document.addEventListener("mousemove", onMouseMove);
}

function cancelDrag() {
    dragging = null;
    const floater = document.getElementById("floater");
    floater.style.display = "none";

    document.querySelectorAll(".cell--dragging").forEach((c) =>
        c.classList.remove("cell--dragging")
    );
    document.removeEventListener("mousemove", onMouseMove);
}

function onMouseMove(e) {
    const floater = document.getElementById("floater");
    floater.style.left = e.clientX + "px";
    floater.style.top = e.clientY + "px";
}

// ─── Rotation Animation ───────────────────────────────────────────────────────
// Briefly adds a CSS class to the board to trigger a visual spin

function animateRotation(callback) {
    const boardEl = document.querySelector(".board");
    boardEl.classList.add("board--rotating");

    boardEl.addEventListener(
        "animationend",
        () => {
            boardEl.classList.remove("board--rotating");
            callback();
        },
        { once: true }
    );
}