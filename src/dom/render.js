import { FLEET, SIZE } from "../constants.js";

const SHIP_CLASSES = Object.freeze({
  MISS: "miss",
  HIT: "hit",
  SUNK: "sunk",
  PLACED: "placed",
  SHIP: "ship",
  ACTIVE: "active",
});

const SUNK_BORDER_CLASSES = Object.freeze({
  CARRIER: "sunk-carrier",
  BATTLESHIP: "sunk-battleship",
  CRUISER: "sunk-cruiser",
  SUBMARINE: "sunk-submarine",
  DESTROYER: "sunk-destroyer",
});

const PREVIEW_CLASSES = Object.freeze({
  VALID: "preview-valid",
  INVALID: "preview-invalid",
});

export function createBoard() {
  const board = document.createElement("div");
  board.classList.add("board");
  board.style.setProperty("--size", SIZE);

  for (let key = 0; key < SIZE * SIZE; key++) {
    const cell = document.createElement("div");
    cell.classList.add("cell");
    // assign key (coords) to dataset
    cell.dataset.key = key;
    // allow tab to cycle through the two gameboards
    cell.tabIndex = key === 0 ? 0 : -1;
    board.appendChild(cell);
  }

  return board;
}

export function updateBoard(boardEl, gameboard) {
  for (const [key, cell] of boardEl.querySelectorAll(".cell").entries()) {
    const ship = gameboard.shipAt(key);
    const result = gameboard.resultAt(key);
    const sunk = ship?.isSunk ?? false;
    if (result === SHIP_CLASSES.MISS) cell.classList.add(SHIP_CLASSES.MISS);
    if (result === SHIP_CLASSES.HIT) cell.classList.add(SHIP_CLASSES.HIT);

    if (sunk) {
      cell.classList.add(SHIP_CLASSES.SUNK);
      cell.classList.add(SUNK_BORDER_CLASSES[ship.name.toUpperCase()]);
    }
  }
}

export function clearBoard(boardEl) {
  for (const cell of boardEl.querySelectorAll(".cell")) {
    for (const shipClass of Object.values(SHIP_CLASSES)) cell.classList.remove(shipClass);
    for (const borderClass of Object.values(SUNK_BORDER_CLASSES)) cell.classList.remove(borderClass);
    for (const previewClass of Object.values(PREVIEW_CLASSES)) cell.classList.remove(previewClass);
  }
}

export function updateQueue(ulEl, gameboard, activeName = null) {
  const fleet = new Set();
  const sunk = new Set();

  for (const ship of gameboard.fleetShips) {
    fleet.add(ship.name);
    if (ship.isSunk) sunk.add(ship.name);
  }

  for (const button of ulEl.querySelectorAll("button")) {
    const name = button.dataset.name;
    const isPlaced = fleet.has(name);
    const isSunk = sunk.has(name);
    button.classList.toggle(SHIP_CLASSES.PLACED, isPlaced);
    button.classList.toggle(SHIP_CLASSES.SUNK, isSunk);
    button.classList.toggle(SHIP_CLASSES.ACTIVE, name === activeName);
  }
}

export function buildQueue(ulEl) {
  for (const { name } of FLEET) {
    const li = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    const icon = document.createElement("i");
    icon.dataset.lucide = "sailboat";
    button.append(icon, name);
    button.dataset.name = name;
    li.appendChild(button);
    ulEl.appendChild(li);
  }
}

export function markShips(boardEl, gameboard) {
  const shipKeys = new Set(gameboard.fleetShips.flatMap((ship) => ship.cells));
  for (const [key, cell] of boardEl.querySelectorAll(".cell").entries())
    cell.classList.toggle(SHIP_CLASSES.SHIP, shipKeys.has(key));
}

export function clearPreview(boardEl) {
  for (const cell of boardEl.querySelectorAll(".cell")) {
    cell.classList.remove(PREVIEW_CLASSES.VALID);
    cell.classList.remove(PREVIEW_CLASSES.INVALID);
  }
}

export function renderPreview(boardEl, cells, valid) {
  clearPreview(boardEl);
  const className = valid ? PREVIEW_CLASSES.VALID : PREVIEW_CLASSES.INVALID;
  for (const key of cells) {
    const cell = boardEl.querySelector(`.cell[data-key="${key}"]`);
    if (cell) cell.classList.add(className);
  }
}
