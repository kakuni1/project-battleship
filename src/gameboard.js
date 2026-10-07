import { DIRECTIONS, FLEET, SIZE } from "./constants.js";
import { fitsBoard, spanCells } from "./grid.js";
import { Ship } from "./ship.js";

export class Gameboard {
  #attacks = new Set();
  #misses = new Set();
  #ships = new Map();
  #grid;

  constructor() {
    this.#grid = Array(SIZE * SIZE).fill(null);
  }

  placeShip(key, name, direction) {
    this.#validateKey(key, "place");
    if (this.#attacks.size > 0) throw new Error("place, game already started");

    // ship check
    const entry = FLEET.find((s) => s.name === name);
    if (entry === undefined) throw new Error("place, invalid ship name");

    // duplicate check
    if (this.#ships.has(name)) throw new Error("place, ship already placed");

    // direction check
    if (!Object.values(DIRECTIONS).includes(direction)) {
      throw new Error("place, invalid direction");
    }

    // wrap check
    if (!fitsBoard(key, entry.length, direction)) throw new Error("place, out of bounds");

    // overlap check
    const cells = spanCells(key, entry.length, direction);
    for (const cell of cells) {
      if (this.#grid[cell] !== null) throw new Error("place, cell occupied");
    }

    // valid ship position
    const ship = new Ship(entry.length);
    for (const cell of cells) this.#grid[cell] = ship;

    // return ship
    this.#ships.set(name, { ship, cells });
    return ship;
  }

  removeShip(name) {
    if (this.#attacks.size > 0) throw new Error("remove, game already started");
    if (!this.#ships.has(name)) throw new Error("remove, ship not yet placed");

    const entry = this.#ships.get(name);
    for (const cell of entry.cells) this.#grid[cell] = null;
    this.#ships.delete(name);
  }

  receiveAttack(key) {
    this.#validateKey(key, "attack");

    // duplicate check
    if (this.#attacks.has(key)) throw new Error("attack, duplicate");
    this.#attacks.add(key);

    // miss
    const target = this.#grid[key];
    if (target === null) {
      this.#misses.add(key);
      return { result: "miss", name: null, sunk: false };
    }

    // hit
    for (const [name, entry] of this.#ships) {
      if (entry.ship === target) {
        entry.ship.hit();
        return { result: "hit", name, sunk: entry.ship.isSunk };
      }
    }
  }

  isAttacked(key) {
    this.#validateKey(key, "isAttacked");
    return this.#attacks.has(key);
  }

  resultAt(key) {
    this.#validateKey(key, "resultAt");
    if (!this.#attacks.has(key)) return null;
    if (this.#misses.has(key)) return "miss";
    return "hit";
  }

  isEmpty(key) {
    this.#validateKey(key, "isEmpty");
    return this.#grid[key] === null;
  }

  get allSunk() {
    return this.#ships.size > 0 && this.#ships.values().every(({ ship }) => ship.isSunk);
  }

  shipAt(key) {
    this.#validateKey(key, "shipAt");

    // empty check
    const ship = this.#grid[key];
    if (ship === null) return null;

    for (const [name, entry] of this.#ships) if (entry.ship === ship) return { name, isSunk: ship.isSunk };

    return null;
  }

  shipCells(name) {
    if (!this.#ships.has(name)) throw new Error("shipCells, unknown ship");
    return [...this.#ships.get(name).cells];
  }

  get fleetShips() {
    return [...this.#ships].map(([name, { ship, cells }]) => ({
      name,
      cells: [...cells],
      isSunk: ship.isSunk,
    }));
  }

  get fleetDone() {
    return this.#ships.size === FLEET.length;
  }

  reset() {
    if (this.#attacks.size > 0) throw new Error("reset, game already started");

    this.#ships.clear();
    this.#grid.fill(null);
    this.#attacks.clear();
    this.#misses.clear();
  }

  #validateKey(key, prefix) {
    if (!Number.isInteger(key)) throw new Error(`${prefix}, must be integer`);
    if (key < 0 || key >= SIZE * SIZE) throw new Error(`${prefix}, out of bounds`);
  }
}
