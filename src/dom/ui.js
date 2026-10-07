import { createIcons } from "lucide";
import { DELAY_MS, DIRECTIONS, FLEET, SIZE } from "../constants.js";
import { GAMEPHASE, SHIP_STATES } from "../controller.js";
import { calcCol, calcRow, fitsBoard, sleep, spanCells } from "../grid.js";
import { icons } from "./icons.js";
import { buildQueue, clearBoard, clearPreview, markShips, renderPreview, updateBoard, updateQueue } from "./render.js";

const BOARD_MESSAGE = Object.freeze({
  PLAYER: "Your Fleet",
  ENEMY: "Enemy Waters",
});

const BOARDS = Object.freeze({
  PLAYER: "player",
  ENEMY: "enemy",
});
let activeBoard = BOARDS.PLAYER;

export function highlightShip(key, length, direction, gameboard) {
  if (!Number.isInteger(key)) return { cells: [], valid: false };

  const fits = fitsBoard(key, length, direction);
  const row = calcRow(key);
  const col = calcCol(key);

  const cells = spanCells(key, length, direction).filter((cell) => {
    if (cell < 0 || cell >= SIZE * SIZE) return false;
    if (direction === DIRECTIONS.H) return calcRow(cell) === row;
    if (direction === DIRECTIONS.V) return calcCol(cell) === col;
    return false;
  });

  if (!fits) return { cells, valid: false };
  const valid = cells.every((cell) => gameboard.isEmpty(cell));
  return { cells, valid };
}

export function init(controller, { playerBoard, enemyBoard }) {
  const statusEl = document.getElementById("status");
  const turnStatusEl = document.getElementById("turn-status");
  const gameEl = document.getElementById("game");
  const queueEl = document.getElementById("ship-queue");
  const buttonUndoEl = document.getElementById("button-undo");
  const buttonRotateEl = document.getElementById("button-rotate");
  const buttonResetEl = document.getElementById("button-reset");
  const buttonStartEl = document.getElementById("button-start");
  const gameoverEl = document.getElementById("gameover");
  const winnerEl = document.getElementById("winner");
  const buttonRestartEl = document.getElementById("button-restart");
  const buttonAgainEl = document.getElementById("button-again");
  const buttonToggleBoardEl = document.getElementById("button-toggle-board");
  const boardLabelNode = buttonToggleBoardEl.lastChild;

  let direction = DIRECTIONS.H;
  let busy = false;
  let previewKey = null;
  let selectedShip = null;

  function parseKey(event) {
    return Number.parseInt(event.target.dataset.key, 10);
  }

  function moveFocus(board, key, rowDelta, colDelta) {
    const row = calcRow(key) + rowDelta;
    const col = calcCol(key) + colDelta;
    if (row < 0 || row >= SIZE || col < 0 || col >= SIZE) return;

    const next = board.querySelector(`.cell[data-key="${row * SIZE + col}"]`);
    if (!next) return;

    // find focused, reset value, move to next, set as new focus
    board.querySelector('.cell[tabindex="0"]').setAttribute("tabindex", "-1");
    next.tabIndex = 0;
    next.focus();
  }

  function onBoardKeyDown(event, activate) {
    const key = parseKey(event);
    if (Number.isNaN(key)) return;

    const arrows = {
      ArrowUp: [-1, 0],
      ArrowDown: [1, 0],
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1],
    };

    const move = arrows[event.key];
    if (move) {
      // prevent default scroll
      event.preventDefault();
      moveFocus(event.currentTarget, key, move[0], move[1]);
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      // re-enable onClickPlace & onClickAttack
      activate(event);
    }
  }

  function placedShipNames() {
    return new Set(controller.getPlayer(0).gameboard.fleetShips.map((ship) => ship.name));
  }

  function lastShip() {
    const placed = placedShipNames();
    // name of the last ship that was placed
    return FLEET.findLast(({ name }) => placed.has(name))?.name;
  }

  function firstUnplacedShip() {
    const placed = placedShipNames();
    // name of first ship not yet placed
    return FLEET.find(({ name }) => !placed.has(name))?.name;
  }

  function currentShip() {
    const placed = placedShipNames();
    // name of selected ship via click or default to fleet list
    if (selectedShip !== null && !placed.has(selectedShip)) return selectedShip;
    else return firstUnplacedShip();
  }

  function repaint() {
    clearBoard(playerBoard);
    clearBoard(enemyBoard);
    updateBoard(playerBoard, controller.getPlayer(0).gameboard);
    // show ships for player only, keep enemy ships hidden (fog-of-war)
    markShips(playerBoard, controller.getPlayer(0).gameboard);
    updateBoard(enemyBoard, controller.getPlayer(1).gameboard);
    updateQueue(queueEl, controller.getPlayer(0).gameboard, currentShip());
  }

  function onClickPlace(event) {
    const key = parseKey(event);
    const name = currentShip();

    // conditions for immediate exit
    if (controller.phase !== GAMEPHASE.PLACE) return;
    if (Number.isNaN(key)) return;
    if (!name) return;
    if (busy) return;

    try {
      controller.placeShip(0, key, name, direction);
    } catch (error) {
      statusEl.textContent = error.message;
      return;
    }

    repaint();
    buttonUndoEl.disabled = false;

    // update status for active ship
    const next = currentShip();
    if (next) {
      statusEl.textContent = `Place: ${next}`;
      return;
    }

    // no ships left, exit
    buttonStartEl.disabled = false;
    statusEl.textContent = "Fleet ready";
  }

  async function onClickAttack(event) {
    const key = parseKey(event);

    // conditions for immediate exit
    if (controller.phase !== GAMEPHASE.PLAY) return;
    if (Number.isNaN(key)) return;
    if (busy) return;

    // player turn
    busy = true;
    const turn = controller.playTurn(key);
    if (turn.result === SHIP_STATES.DUPLICATE) statusEl.textContent = "Already attacked";
    else if (turn.result === SHIP_STATES.HIT)
      statusEl.textContent = `${controller.getPlayer(0).name} hit ${turn.ship}!`;
    else statusEl.textContent = `${controller.getPlayer(0).name} missed`;

    syncTurn();

    // gameover check
    if (turn.gameOver) {
      winnerEl.textContent = `${controller.getPlayer(turn.winner).name} wins!`;
      syncPhase();
    }

    repaint();
    // extra delay for single board setup
    if (!controller.isGameOver && turn.result !== SHIP_STATES.HIT && turn.result !== SHIP_STATES.DUPLICATE)
      await sleep(DELAY_MS.PLAYER);

    // cpu, keeps turn on 'hit'
    while (controller.activePlayer === 1 && !controller.isGameOver) {
      statusEl.textContent = `${controller.getPlayer(controller.activePlayer).name} is thinking`;
      activeBoard = BOARDS.PLAYER;
      syncBoard();
      await sleep(DELAY_MS.CPU);
      const cpuTurn = controller.playTurn();

      // duplicate should never occur for cpu, defensive measure
      if (cpuTurn.result === SHIP_STATES.DUPLICATE) {
        statusEl.textContent = `${controller.getPlayer(1).name}, already attacked`;
        break;
      }

      if (cpuTurn.result === SHIP_STATES.HIT) {
        statusEl.textContent = `${controller.getPlayer(1).name} hit your ${cpuTurn.ship}!`;
      } else {
        statusEl.textContent = `${controller.getPlayer(1).name} missed`;
      }

      syncTurn();

      // gameover check
      if (cpuTurn.gameOver) {
        winnerEl.textContent = `${controller.getPlayer(cpuTurn.winner).name} wins!`;
        syncPhase();
      }

      repaint();

      // keep cpu message
      if (cpuTurn.result === SHIP_STATES.HIT && !controller.isGameOver) await sleep(DELAY_MS.PLAYER);
    }

    busy = false;
    activeBoard = BOARDS.ENEMY;
    syncBoard();
    repaint();
  }

  function onPlacementKeyDown(event) {
    const isRotateKey = event.key.toLowerCase() === "r" && !event.ctrlKey && !event.altKey && !event.metaKey;

    if (!isRotateKey || controller.phase !== GAMEPHASE.PLACE) return;

    event.preventDefault();
    onRotate();
  }

  function onUndo() {
    const name = lastShip();

    // conditions for immediate exit
    if (controller.phase !== GAMEPHASE.PLACE) return;
    if (!name) return;

    try {
      controller.removeShip(0, name);
    } catch (error) {
      repaint();
      statusEl.textContent = error.message;
      return;
    }

    repaint();
    buttonStartEl.disabled = true;
    buttonUndoEl.disabled = controller.getPlayer(0).gameboard.fleetShips.length === 0;
    statusEl.textContent = `Place: ${currentShip()}`;
    refreshPreview();
  }

  function onRotate() {
    direction = direction === DIRECTIONS.H ? DIRECTIONS.V : DIRECTIONS.H;
    refreshPreview();
  }

  function onRestart() {
    controller.resetGame();
    selectedShip = null;
    repaint();
    syncPhase();
    activeBoard = BOARDS.PLAYER;
    syncBoard();
    clearPlayerPreview();
    direction = DIRECTIONS.H;
    busy = false;
    buttonStartEl.disabled = true;
    buttonUndoEl.disabled = true;
    statusEl.textContent = "Place: Carrier";
  }

  function onReset() {
    try {
      controller.resetBoard(0);
    } catch (error) {
      repaint();
      statusEl.textContent = error.message;
      return;
    }

    selectedShip = null;
    clearPlayerPreview();
    repaint();
    direction = DIRECTIONS.H;
    buttonUndoEl.disabled = true;
    buttonStartEl.disabled = true;
    statusEl.textContent = "Place: Carrier";
  }

  function onStart() {
    try {
      controller.startGame();
    } catch (error) {
      statusEl.textContent = error.message;
      return;
    }

    syncPhase();
    activeBoard = BOARDS.ENEMY;
    syncBoard();
    statusEl.textContent = "Select target";
  }

  function onSelect(event) {
    const button = event.target.closest("button[data-name]");

    // conditions for immediate exit
    if (!button) return;
    if (placedShipNames().has(button.dataset.name)) return;
    if (controller.phase !== GAMEPHASE.PLACE) return;

    selectedShip = button.dataset.name;
    statusEl.textContent = `Place: ${selectedShip}`;
    updateQueue(queueEl, controller.getPlayer(0).gameboard, currentShip());
    refreshPreview();
  }

  function refreshPreview() {
    if (previewKey === null) return;

    const name = currentShip();
    if (!name) {
      clearPlayerPreview();
      return;
    }

    const ship = FLEET.find(({ name: shipName }) => shipName === name);
    if (!ship) {
      clearPlayerPreview();
      return;
    }

    const gameboard = controller.getPlayer(0).gameboard;
    const { cells, valid } = highlightShip(previewKey, ship.length, direction, gameboard);
    renderPreview(playerBoard, cells, valid);
  }

  function previewShip(event) {
    if (controller.phase !== GAMEPHASE.PLACE) {
      clearPlayerPreview();
      return;
    }

    const key = parseKey(event);
    if (Number.isNaN(key)) {
      clearPlayerPreview();
      return;
    }

    previewKey = key;
    refreshPreview();
  }

  function clearPlayerPreview() {
    previewKey = null;
    clearPreview(playerBoard);
  }

  function syncTurn() {
    const isPlay = controller.phase === GAMEPHASE.PLAY && !controller.isGameOver;

    if (!isPlay) {
      gameEl.removeAttribute("data-turn");
      turnStatusEl.hidden = true;
      return;
    }

    const activePlayer = controller.getPlayer(controller.activePlayer);

    gameEl.dataset.turn = controller.activePlayer;
    turnStatusEl.hidden = false;
    turnStatusEl.textContent =
      controller.activePlayer === 0 ? `${controller.getPlayer(0).name}'s turn` : `${activePlayer.name}'s turn`;
  }

  function syncBoard() {
    gameEl.dataset.board = activeBoard;
    boardLabelNode.nodeValue = activeBoard === BOARDS.PLAYER ? BOARD_MESSAGE.ENEMY : BOARD_MESSAGE.PLAYER;
  }

  function onToggleBoard() {
    activeBoard = activeBoard === BOARDS.PLAYER ? BOARDS.ENEMY : BOARDS.PLAYER;
    syncBoard();
  }

  function syncPhase() {
    gameEl.dataset.phase = controller.phase;
    const interact = controller.phase === GAMEPHASE.PLACE;
    buttonToggleBoardEl.hidden = interact;
    for (const button of queueEl.querySelectorAll("button")) button.disabled = !interact;
    syncTurn();
    if (controller.isGameOver) gameoverEl.showModal();
    else gameoverEl.close();
  }

  // setup event listeners
  document.addEventListener("keydown", onPlacementKeyDown);
  playerBoard.addEventListener("click", onClickPlace);
  playerBoard.addEventListener("keydown", (e) => onBoardKeyDown(e, onClickPlace));
  playerBoard.addEventListener("pointerover", previewShip);
  playerBoard.addEventListener("focusin", previewShip);
  playerBoard.addEventListener("pointerleave", clearPlayerPreview);
  // clear preview when focus goes off board
  playerBoard.addEventListener("focusout", (e) => {
    if (playerBoard.contains(e.relatedTarget)) return;
    clearPlayerPreview();
  });
  enemyBoard.addEventListener("click", onClickAttack);
  enemyBoard.addEventListener("keydown", (e) => onBoardKeyDown(e, onClickAttack));
  queueEl.addEventListener("click", onSelect);
  buttonToggleBoardEl.addEventListener("click", onToggleBoard);
  buttonUndoEl.addEventListener("click", onUndo);
  buttonRotateEl.addEventListener("click", onRotate);
  buttonResetEl.addEventListener("click", onReset);
  buttonStartEl.addEventListener("click", onStart);
  buttonRestartEl.addEventListener("click", onRestart);
  buttonAgainEl.addEventListener("click", onRestart);

  // one-time setup
  buildQueue(queueEl);
  createIcons({ icons, root: queueEl });
  repaint();
  syncPhase();
  syncBoard();
  buttonStartEl.disabled = true;
  statusEl.textContent = "Place: Carrier";
}
