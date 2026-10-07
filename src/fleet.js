import { FLEET, SIZE } from "./constants.js";
import { fitsBoard, spanCells } from "./grid.js";
import { shuffle } from "./shuffle.js";

export function autoFleet(board, maxRestarts = 10) {
  // retry with wiped board if stuck
  for (let attempt = 0; attempt < maxRestarts; attempt++) if (randomFleet(board)) return board;
  throw new Error("cpu fleet, multiple restarts, unable to place ships");
}

function randomFleet(board) {
  for (const { name, length } of FLEET) {
    // shuffle the generated placements
    const cans = canCell(length).filter((can) => validCell(board, can));
    const pick = shuffle(cans).pop();

    // wipe board if unsuccessful
    if (pick === undefined) {
      board.reset();
      return false;
    }

    board.placeShip(pick.key, name, pick.direction);
  }

  return true;
}

function canCell(length) {
  // filter out-of-bounds considering ship length
  const cans = [];

  for (let key = 0; key < SIZE * SIZE; key++) {
    if (fitsBoard(key, length, "horizontal")) {
      cans.push({
        key,
        direction: "horizontal",
        cells: spanCells(key, length, "horizontal"),
      });
    }
    if (fitsBoard(key, length, "vertical")) {
      cans.push({
        key,
        direction: "vertical",
        cells: spanCells(key, length, "vertical"),
      });
    }
  }

  return cans;
}

function validCell(board, can) {
  // occupancy check
  return can.cells.every((cell) => board.isEmpty(cell));
}
