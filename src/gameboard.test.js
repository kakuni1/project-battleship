import { describe, expect, it } from "vitest";
import { Gameboard } from "./gameboard.js";

describe("Gameboard", () => {
  it("initialize empty board, 100 cells, each filled as null", () => {
    const board = new Gameboard();
    for (let key = 0; key < 100; key++) expect(board.isEmpty(key)).toBe(true);
  });

  it("integer check, non-integer throw error", () => {
    const board = new Gameboard();
    expect(() => board.placeShip([0, 1.1], "Destroyer", "horizontal")).toThrow("place, must be integer");
    expect(() => board.placeShip(1.1, "Destroyer", "h")).toThrow("place, must be integer");
    expect(() => board.placeShip(-Infinity, "Destroyer", "h")).toThrow("place, must be integer");
    expect(() => board.placeShip(NaN, "Destroyer", "h")).toThrow("place, must be integer");
  });

  it("check for valid ship name (number)", () => {
    const board = new Gameboard();
    expect(() => board.placeShip(0, 1, "horizontal")).toThrow("place, invalid ship name");
  });

  it("check for valid ship name, (non-integer number)", () => {
    const board = new Gameboard();
    expect(() => board.placeShip(0, 2.5, "horizontal")).toThrow("place, invalid ship name");
  });

  it("cannot place a ship after a miss, game started, throw error", () => {
    const board = new Gameboard();
    board.receiveAttack(0);
    expect(() => board.placeShip(0, "Destroyer", "horizontal")).toThrow("place, game already started");
  });

  it("cannot place a ship after a hit, game started, throw error", () => {
    const board = new Gameboard();
    board.placeShip(0, "Destroyer", "horizontal");
    board.receiveAttack(0);
    expect(() => board.placeShip(10, "Carrier", "horizontal")).toThrow("place, game already started");
  });

  it("check for valid direction", () => {
    const board = new Gameboard();
    expect(() => board.placeShip(0, "Destroyer", "x")).toThrow("place, invalid direction");
  });

  it("place ship (2), horizontal", () => {
    const board = new Gameboard();
    board.placeShip(0, "Destroyer", "horizontal");
    for (const cell of [0, 1]) expect(board.shipAt(cell)).toEqual({ name: "Destroyer", isSunk: false });
  });

  it("place ship (5), vertical", () => {
    const board = new Gameboard();
    board.placeShip(22, "Carrier", "vertical");
    for (const cell of [22, 32, 42, 52, 62]) {
      expect(board.shipAt(cell)).toEqual({ name: "Carrier", isSunk: false });
    }
  });

  it("place ship (5), vertical, completely out of bounds", () => {
    const board = new Gameboard();
    expect(() => board.placeShip(-55, "Carrier", "vertical")).toThrow("place, out of bounds");
  });

  it("place ship (2), horizontal, extends out of bounds", () => {
    const board = new Gameboard();
    expect(() => board.placeShip(99, "Destroyer", "horizontal")).toThrow("place, out of bounds");
  });

  it("place ships (2) & (3), overlap", () => {
    const board = new Gameboard();
    board.placeShip(0, "Destroyer", "horizontal");
    expect(() => board.placeShip(0, "Submarine", "horizontal")).toThrow("place, cell occupied");
  });

  it("place ships (2) & (3), overlap, retry continues & succeeds", () => {
    const board = new Gameboard();
    board.placeShip(0, "Destroyer", "horizontal");
    expect(() => board.placeShip(1, "Submarine", "horizontal")).toThrow("place, cell occupied");
    const ship = board.placeShip(55, "Carrier", "vertical");
    expect(ship.length).toBe(5);
  });

  it("place ship (2) & (2), duplicate, no overlap, throws error", () => {
    const board = new Gameboard();
    board.placeShip(0, "Destroyer", "horizontal");
    expect(() => board.placeShip(55, "Destroyer", "vertical")).toThrow("place, ship already placed");
  });

  it("ship (2), receive attack (1), isSunk false", () => {
    const board = new Gameboard();
    const ship = board.placeShip(0, "Destroyer", "horizontal");
    board.receiveAttack(0);
    expect(ship.isSunk).toBe(false);
  });

  it("integer check, attack, non-integer", () => {
    const board = new Gameboard();
    board.placeShip(0, "Destroyer", "horizontal");
    expect(() => board.receiveAttack(1.111)).toThrow("attack, must be integer");
  });

  it("integer check, attack, infinity non-integer", () => {
    const board = new Gameboard();
    board.placeShip(0, "Destroyer", "horizontal");
    expect(() => board.receiveAttack(-Infinity)).toThrow("attack, must be integer");
  });

  it("ship (2), receive attack (2), isSunk true", () => {
    const board = new Gameboard();
    const ship = board.placeShip(0, "Destroyer", "horizontal");
    board.receiveAttack(0);
    board.receiveAttack(1);
    expect(ship.isSunk).toBe(true);
  });

  it("ship (5), receive attack (7), extra misses, isSunk true", () => {
    const board = new Gameboard();
    const ship = board.placeShip(22, "Carrier", "vertical");
    for (const cell of [22, 32, 42, 52, 62, 72, 82]) board.receiveAttack(cell);
    expect(ship.isSunk).toBe(true);
  });

  it("miss (1), track the miss", () => {
    const board = new Gameboard();
    board.placeShip(0, "Destroyer", "horizontal");
    board.receiveAttack(55);
    expect(board.resultAt(55)).toBe("miss");
  });

  it("hit (1), miss, dont track as miss", () => {
    const board = new Gameboard();
    board.placeShip(0, "Destroyer", "horizontal");
    board.receiveAttack(0);
    expect(board.resultAt(0)).not.toBe("miss");
  });

  it("hit (1), track the hit", () => {
    const board = new Gameboard();
    board.placeShip(0, "Destroyer", "horizontal");
    board.receiveAttack(0);
    expect(board.resultAt(0)).toBe("hit");
  });

  it("miss (1), dont track as hit", () => {
    const board = new Gameboard();
    board.placeShip(0, "Destroyer", "horizontal");
    board.receiveAttack(55);
    expect(board.resultAt(55)).not.toBe("hit");
  });

  it("hits (2), track in order", () => {
    const board = new Gameboard();
    board.placeShip(0, "Destroyer", "horizontal");
    board.receiveAttack(0);
    board.receiveAttack(1);
    expect(board.resultAt(0)).toBe("hit");
    expect(board.resultAt(1)).toBe("hit");
  });

  it("ships (2) & (5), not sunk, allSunk false", () => {
    const board = new Gameboard();
    board.placeShip(0, "Destroyer", "horizontal");
    board.placeShip(55, "Submarine", "vertical");
    board.receiveAttack(0);
    board.receiveAttack(55);
    expect(board.allSunk).toBe(false);
  });

  it("ships (2) & (5), sink only (2), allSunk false", () => {
    const board = new Gameboard();
    board.placeShip(0, "Destroyer", "horizontal");
    board.placeShip(55, "Submarine", "vertical");
    for (const cell of [0, 1]) board.receiveAttack(cell);
    expect(board.allSunk).toBe(false);
  });

  it("ships (2) & (5), sunk, allSunk true", () => {
    const board = new Gameboard();
    board.placeShip(0, "Destroyer", "horizontal");
    board.placeShip(33, "Carrier", "vertical");
    for (const cell of [0, 1]) board.receiveAttack(cell);
    for (const cell of [33, 43, 53, 63, 73]) board.receiveAttack(cell);
    expect(board.allSunk).toBe(true);
  });

  it("no ships, empty board, dont auto end game on start, allSunk false", () => {
    const board = new Gameboard();
    expect(board.allSunk).toBe(false);
  });

  it("ship (2), duplicate attack, hit check", () => {
    const board = new Gameboard();
    board.placeShip(0, "Destroyer", "horizontal");
    board.receiveAttack(0);
    expect(() => board.receiveAttack(0)).toThrow("attack, duplicate");
  });

  it("ship (2), duplicate attack, miss check", () => {
    const board = new Gameboard();
    board.placeShip(0, "Destroyer", "horizontal");
    board.receiveAttack(77);
    expect(board.resultAt(77)).toBe("miss");
    expect(() => board.receiveAttack(77)).toThrow("attack, duplicate");
    expect(board.resultAt(77)).toBe("miss");
  });

  it("ship (2), attack out of bounds", () => {
    const board = new Gameboard();
    board.placeShip(0, "Destroyer", "horizontal");
    expect(() => board.receiveAttack(100)).toThrow("attack, out of bounds");
  });

  it("ship (2), return 'hit'", () => {
    const board = new Gameboard();
    board.placeShip(0, "Destroyer", "horizontal");
    expect(board.receiveAttack(0)).toEqual({
      name: "Destroyer",
      result: "hit",
      sunk: false,
    });
  });

  it("ship (2), return 'miss'", () => {
    const board = new Gameboard();
    board.placeShip(0, "Destroyer", "horizontal");
    expect(board.receiveAttack(7)).toEqual({
      result: "miss",
      name: null,
      sunk: false,
    });
  });

  it("ship (2), final hit, return sunk", () => {
    const board = new Gameboard();
    board.placeShip(0, "Destroyer", "horizontal");
    board.receiveAttack(0);
    expect(board.receiveAttack(1)).toEqual({
      result: "hit",
      name: "Destroyer",
      sunk: true,
    });
  });

  it("no attack, isAttacked false", () => {
    const board = new Gameboard();
    expect(board.isAttacked(0)).toBe(false);
  });

  it("attack (1), isAttacked true", () => {
    const board = new Gameboard();
    board.receiveAttack(0);
    expect(board.isAttacked(0)).toBe(true);
  });

  it("ship (2), attack(1), isAttacked true", () => {
    const board = new Gameboard();
    board.placeShip(0, "Destroyer", "horizontal");
    board.receiveAttack(0);
    expect(board.isAttacked(0)).toBe(true);
    expect(board.isAttacked(1)).toBe(false);
  });

  it("ship (2), attack (2), hit (1), miss (1), isAttacked true", () => {
    const board = new Gameboard();
    board.placeShip(0, "Destroyer", "horizontal");
    board.receiveAttack(0);
    board.receiveAttack(5);
    expect(board.isAttacked(0)).toBe(true);
    expect(board.isAttacked(5)).toBe(true);
    expect(board.isAttacked(1)).toBe(false);
  });

  it("isEmpty, empty cell true, occupied false", () => {
    const board = new Gameboard();
    board.placeShip(0, "Destroyer", "horizontal");
    expect(board.isEmpty(0)).toBe(false);
    expect(board.isEmpty(1)).toBe(false);
    expect(board.isEmpty(2)).toBe(true);
  });

  it("isEmpty, out of bounds, throw error", () => {
    const board = new Gameboard();
    expect(() => board.isEmpty(100)).toThrow("isEmpty, out of bounds");
    expect(() => board.isEmpty(-1)).toThrow("isEmpty, out of bounds");
  });

  it("isEmpty, non-integer, throw error", () => {
    const board = new Gameboard();
    expect(() => board.isEmpty(1.1)).toThrow("isEmpty, must be integer");
  });

  it("isAttacked, out of bounds, throw error", () => {
    const board = new Gameboard();
    expect(() => board.isAttacked(100)).toThrow("isAttacked, out of bounds");
    expect(() => board.isAttacked(-1)).toThrow("isAttacked, out of bounds");
  });

  it("isAttacked, non-integer, throw error", () => {
    const board = new Gameboard();
    expect(() => board.isAttacked(1.5)).toThrow("isAttacked, must be integer");
  });

  it("no ships placed, fleetDone false", () => {
    const board = new Gameboard();
    expect(board.fleetDone).toBe(false);
  });

  it("ships placed (4 out of 5), fleetDone false", () => {
    const board = new Gameboard();
    board.placeShip(0, "Destroyer", "horizontal");
    board.placeShip(20, "Submarine", "horizontal");
    board.placeShip(40, "Cruiser", "horizontal");
    board.placeShip(60, "Battleship", "horizontal");
    expect(board.fleetDone).toBe(false);
  });

  it("all ships placed (5 out of 5), fleetDone true", () => {
    const board = new Gameboard();
    board.placeShip(0, "Destroyer", "horizontal");
    board.placeShip(20, "Submarine", "horizontal");
    board.placeShip(40, "Cruiser", "horizontal");
    board.placeShip(60, "Battleship", "horizontal");
    board.placeShip(80, "Carrier", "horizontal");
    expect(board.fleetDone).toBe(true);
  });

  it("place ship (2), horizontal, edge fit, last cells of row, succeeds", () => {
    const board = new Gameboard();
    board.placeShip(8, "Destroyer", "horizontal");
    for (const cell of [8, 9]) expect(board.shipAt(cell)).toEqual({ name: "Destroyer", isSunk: false });
  });

  it("place ship (2), horizontal, wraps to next row, throws", () => {
    const board = new Gameboard();
    expect(() => board.placeShip(9, "Destroyer", "horizontal")).toThrow("place, out of bounds");
  });

  it("place ship (5), vertical, extends past bottom edge, throw error", () => {
    const board = new Gameboard();
    expect(() => board.placeShip(75, "Carrier", "vertical")).toThrow("place, out of bounds");
  });

  it("remove ship (2) from grid, horizontal, return null", () => {
    const board = new Gameboard();
    board.placeShip(0, "Destroyer", "horizontal");
    board.removeShip("Destroyer");
    for (const cell of [0, 1]) expect(board.shipAt(cell)).toBeNull();
  });

  it("remove ship (2) from grid, vertical, return null", () => {
    const board = new Gameboard();
    board.placeShip(12, "Carrier", "vertical");
    board.removeShip("Carrier");
    for (const cell of [12, 22, 32, 42, 52]) expect(board.shipAt(cell)).toBeNull();
  });

  it("place same ship after removal", () => {
    const board = new Gameboard();
    board.placeShip(0, "Destroyer", "horizontal");
    board.removeShip("Destroyer");
    for (const cell of [0, 1]) expect(board.shipAt(cell)).toBeNull();
    board.placeShip(0, "Destroyer", "horizontal");
    for (const cell of [0, 1]) expect(board.shipAt(cell)).toEqual({ name: "Destroyer", isSunk: false });
  });

  it("place different ship on removed cells", () => {
    const board = new Gameboard();
    board.placeShip(0, "Destroyer", "horizontal");
    board.removeShip("Destroyer");
    board.placeShip(0, "Carrier", "horizontal");
    for (const cell of [0, 1, 2, 3, 4]) expect(board.shipAt(cell)).toEqual({ name: "Carrier", isSunk: false });
  });

  it("removal doesnt affect other ships", () => {
    const board = new Gameboard();
    board.placeShip(0, "Destroyer", "horizontal");
    board.placeShip(55, "Submarine", "vertical");
    board.removeShip("Destroyer");
    for (const cell of [0, 1]) expect(board.shipAt(cell)).toBeNull();
    board.placeShip(0, "Carrier", "vertical");
    for (const cell of [55, 65, 75]) expect(board.shipAt(cell)).toEqual({ name: "Submarine", isSunk: false });
  });

  it("ship not placed, throw error", () => {
    const board = new Gameboard();
    expect(() => board.removeShip("Destroyer")).toThrow("remove, ship not yet placed");
  });

  it("cannot remove a ship after a miss, throw error", () => {
    const board = new Gameboard();
    board.placeShip(0, "Destroyer", "horizontal");
    board.receiveAttack(5);
    expect(() => board.removeShip("Destroyer")).toThrow("remove, game already started");
  });

  it("cannot remove a ship after a hit, throw error", () => {
    const board = new Gameboard();
    board.placeShip(0, "Destroyer", "horizontal");
    board.receiveAttack(0);
    expect(() => board.removeShip("Destroyer")).toThrow("remove, game already started");
  });

  it("cannot reset after a miss, throw error", () => {
    const board = new Gameboard();
    board.placeShip(0, "Destroyer", "horizontal");
    board.receiveAttack(5);
    expect(() => board.reset()).toThrow("reset, game already started");
  });

  it("cannot reset after a hit (game start), throw error", () => {
    const board = new Gameboard();
    board.placeShip(0, "Destroyer", "horizontal");
    board.receiveAttack(0);
    expect(() => board.reset()).toThrow("reset, game already started");
  });

  it("reset still allowed after removeShip", () => {
    const board = new Gameboard();
    board.placeShip(0, "Destroyer", "horizontal");
    board.placeShip(10, "Carrier", "horizontal");
    board.removeShip("Carrier");
    board.reset();
    expect(board.fleetShips).toEqual([]);
  });

  it("reset, clear all", () => {
    const board = new Gameboard();
    board.placeShip(0, "Destroyer", "horizontal");
    board.placeShip(10, "Carrier", "horizontal");
    board.reset();
    for (let key = 0; key < 100; key++) expect(board.isEmpty(key)).toBe(true);
  });

  it("getter fleetShips, returns name, cells & isSunk", () => {
    const board = new Gameboard();
    board.placeShip(0, "Destroyer", "horizontal");
    board.receiveAttack(0);
    board.receiveAttack(1);
    expect(board.fleetShips).toEqual([{ name: "Destroyer", cells: [0, 1], isSunk: true }]);
  });

  it("getter fleetShips (multi-ship), returns copies, no mutations", () => {
    const board = new Gameboard();
    board.placeShip(0, "Destroyer", "horizontal");
    board.placeShip(50, "Carrier", "horizontal");

    const leak = board.fleetShips;
    leak[0].cells.push(100);

    expect(board.fleetShips).toEqual([
      { name: "Destroyer", cells: [0, 1], isSunk: false },
      { name: "Carrier", cells: [50, 51, 52, 53, 54], isSunk: false },
    ]);
  });

  it("shipAt, returns name & isSunk for a position", () => {
    const board = new Gameboard();
    board.placeShip(0, "Destroyer", "horizontal");
    expect(board.shipAt(0)).toEqual({ name: "Destroyer", isSunk: false });
    expect(board.shipAt(1)).toEqual({ name: "Destroyer", isSunk: false });
    expect(board.shipAt(2)).toBeNull();
  });

  it("shipCells, returns copy occupied cells for ship, no mutations", () => {
    const board = new Gameboard();
    board.placeShip(0, "Destroyer", "horizontal");

    const leak = board.shipCells("Destroyer");
    leak.push(100);

    expect(() => board.shipCells("Shippy")).toThrow("shipCells, unknown ship");
    expect(board.shipCells("Destroyer")).toEqual([0, 1]);
    board.removeShip("Destroyer");
    expect(() => board.shipCells("Destroyer")).toThrow("shipCells, unknown ship");

    board.placeShip(0, "Destroyer", "horizontal");
    board.receiveAttack(0);
    board.receiveAttack(1);
    expect(board.shipCells("Destroyer")).toEqual([0, 1]);
  });
});
