import { DIRECTIONS, SIZE } from "./constants.js";

export function spanCells(key, length, direction) {
  return Array.from({ length }, (_, i) => (direction === "horizontal" ? key + i : key + i * SIZE));
}

export function fitsBoard(key, length, direction) {
  if (!Object.values(DIRECTIONS).includes(direction)) return false;
  if (direction === "horizontal") return (key % SIZE) + length <= SIZE;
  if (direction === "vertical") return Math.floor(key / SIZE) + length <= SIZE;
}

export function calcRow(key) {
  return Math.floor(key / SIZE);
}

export function calcCol(key) {
  return key % SIZE;
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
