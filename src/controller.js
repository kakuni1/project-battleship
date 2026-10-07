import { Deck } from "./cpu.js";
import { autoFleet } from "./fleet.js";
import { Player, PlayerType } from "./player.js";

export const GAMEPHASE = Object.freeze({
  MENU: "menu",
  PLACE: "place",
  PLAY: "play",
  GAMEOVER: "gameOver",
});

export const DEFAULT_NAMES = Object.freeze({
  REAL: "Player 1",
  CPU: "Computer",
});

export const SHIP_STATES = Object.freeze({
  HIT: "hit",
  MISS: "miss",
  DUPLICATE: "duplicate",
});

export class GameController {
  #players;
  #activePlayer;
  #phase;
  #winner;
  #cpuDeck;

  constructor(
    playerOneName = DEFAULT_NAMES.REAL,
    playerTwoName = DEFAULT_NAMES.CPU,
    playerOneType = PlayerType.REAL,
    playerTwoType = PlayerType.CPU,
  ) {
    this.#players = [new Player(playerOneName, playerOneType), new Player(playerTwoName, playerTwoType)];
    this.#activePlayer = 0;
    this.#phase = GAMEPHASE.PLACE;
    this.#winner = null;
    this.#cpuDeck = [
      playerOneType === PlayerType.CPU ? new Deck() : null,
      playerTwoType === PlayerType.CPU ? new Deck() : null,
    ];
  }

  placeShip(index, key, name, direction) {
    if (this.phase !== GAMEPHASE.PLACE) throw new Error("controller placeShip, not in 'place' phase");

    return this.getPlayer(index).gameboard.placeShip(key, name, direction);
  }

  removeShip(index, name) {
    if (this.phase !== GAMEPHASE.PLACE) throw new Error("controller removeShip, not in 'place' phase");

    return this.getPlayer(index).gameboard.removeShip(name);
  }

  resetBoard(index) {
    if (this.phase !== GAMEPHASE.PLACE) throw new Error("controller resetBoard, not in 'place' phase");

    return this.getPlayer(index).gameboard.reset();
  }

  #autoPlace(index) {
    const board = this.getPlayer(index).gameboard;
    board.reset();

    return autoFleet(board);
  }

  startGame() {
    if (this.phase !== GAMEPHASE.PLACE) throw new Error("controller start game, not in 'place' phase");

    const active = this.getPlayer(this.activePlayer);
    const opponent = this.getPlayer(this.opponentPlayer);

    if (active.type === PlayerType.CPU) this.#autoPlace(this.activePlayer);
    if (opponent.type === PlayerType.CPU) this.#autoPlace(this.opponentPlayer);
    if (active.gameboard.fleetDone !== true || opponent.gameboard.fleetDone !== true)
      throw new Error("controller start game, fleets not yet fully placed");

    this.#phase = GAMEPHASE.PLAY;
  }

  playTurn(key) {
    if (this.phase !== GAMEPHASE.PLAY) throw new Error("controller process turn, must be in phase 'play'");

    const attacker = this.activePlayer;
    const opponent = this.getPlayer(this.opponentPlayer);
    const isCpu = this.getPlayer(attacker).type === PlayerType.CPU;
    const targetKey = isCpu ? this.#cpuDeck[attacker].next() : key;

    // return result "duplicate" instead of error throw
    if (opponent.gameboard.isAttacked(targetKey))
      return {
        attacker,
        targetKey,
        result: SHIP_STATES.DUPLICATE,
        ship: null,
        sunk: false,
        cells: null,
        gameOver: this.isGameOver,
        winner: this.winner,
      };

    const result = opponent.gameboard.receiveAttack(targetKey);

    // on sink, record cells for ship sunk
    const cells = result.sunk ? opponent.gameboard.shipCells(result.name) : null;

    // record all cpu attacks
    if (isCpu) this.#cpuDeck[attacker].recordAttack(targetKey, result);

    // end game or swap players & continue game
    if (opponent.gameboard.allSunk === true) {
      this.#winner = this.activePlayer;
      this.#phase = GAMEPHASE.GAMEOVER;
    } else if (result.result === SHIP_STATES.MISS) this.#activePlayer = this.opponentPlayer;

    return {
      attacker,
      targetKey,
      result: result.result,
      ship: result.name,
      sunk: result.sunk,
      cells: cells,
      gameOver: this.isGameOver,
      winner: this.winner,
    };
  }

  getPlayer(index) {
    if (!Number.isInteger(index)) throw new Error("controller getPlayer, must be integer");
    if (index < 0 || index > 1) throw new Error("controller getPlayer, out of bounds");
    return this.#players[index];
  }

  resetGame() {
    this.#activePlayer = 0;
    this.#players = [
      new Player(this.#players[0].name, this.#players[0].type),
      new Player(this.#players[1].name, this.#players[1].type),
    ];
    this.#cpuDeck = [
      this.#players[0].type === PlayerType.CPU ? new Deck() : null,
      this.#players[1].type === PlayerType.CPU ? new Deck() : null,
    ];
    this.#phase = GAMEPHASE.PLACE;
    this.#winner = null;
  }

  get activePlayer() {
    return this.#activePlayer;
  }

  get opponentPlayer() {
    return this.activePlayer === 0 ? 1 : 0;
  }

  get phase() {
    return this.#phase;
  }

  get winner() {
    return this.#winner;
  }

  get isGameOver() {
    return this.#phase === GAMEPHASE.GAMEOVER;
  }
}
