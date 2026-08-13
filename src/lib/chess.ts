/** Minimal chess engine: board state, move generation, and status detection.
 *  Covers castling, en passant, promotion, check, checkmate, stalemate, and
 *  the 50-move rule. Local 2-player play only (no AI). */

export type Color = "w" | "b";
export type PieceType = "p" | "n" | "b" | "r" | "q" | "k";
export type Piece = { type: PieceType; color: Color };
/** Flat 64-cell board. index = rank * 8 + file, where rank 0 is the 8th rank
 *  (top) and file 0 is the a-file. */
export type Board = (Piece | null)[];

export const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

export function squareIndex(sq: string): number {
  const file = sq.charCodeAt(0) - 97;
  const rank = 8 - Number(sq[1]);
  return rank * 8 + file;
}

export function indexToSquare(i: number): string {
  const file = i % 8;
  const rank = 8 - Math.floor(i / 8);
  return FILES[file] + rank;
}

export const opponent = (c: Color): Color => (c === "w" ? "b" : "w");

export const PIECE_GLYPHS: Record<string, string> = {
  wK: "♔", wQ: "♕", wR: "♖", wB: "♗", wN: "♘", wP: "♙",
  bK: "♚", bQ: "♛", bR: "♜", bB: "♝", bN: "♞", bP: "♟",
};

export interface CastlingRights {
  K: boolean; // white king side
  Q: boolean; // white queen side
  k: boolean; // black king side
  q: boolean; // black queen side
}

export interface GameState {
  board: Board;
  turn: Color;
  castling: CastlingRights;
  enPassant: string | null;
  halfmove: number;
  fullmove: number;
}

export interface Move {
  from: string;
  to: string;
  promotion?: PieceType;
}

export function initialState(): GameState {
  const start = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR";
  const board: Board = new Array(64).fill(null);
  const rows = start.split("/");
  for (let r = 0; r < 8; r++) {
    let f = 0;
    for (const ch of rows[r]) {
      if (/\d/.test(ch)) {
        f += Number(ch);
      } else {
        const color: Color = ch === ch.toUpperCase() ? "w" : "b";
        board[r * 8 + f] = { type: ch.toLowerCase() as PieceType, color };
        f++;
      }
    }
  }
  return {
    board,
    turn: "w",
    castling: { K: true, Q: true, k: true, q: true },
    enPassant: null,
    halfmove: 0,
    fullmove: 1,
  };
}

const KNIGHT_DELTAS = [
  [-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1],
];
const KING_DELTAS = [
  [-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1],
];
const ROOK_DIRS = [
  [-1, 0], [1, 0], [0, -1], [0, 1],
];
const BISHOP_DIRS = [
  [-1, -1], [-1, 1], [1, -1], [1, 1],
];

/** Does the piece at `from` geometrically attack `to`? (No king-safety logic.) */
function attacksSquare(board: Board, from: number, to: number): boolean {
  const piece = board[from];
  if (!piece) return false;
  const fr = Math.floor(from / 8);
  const fc = from % 8;
  const tr = Math.floor(to / 8);
  const tc = to % 8;
  const dr = Math.abs(tr - fr);
  const dc = Math.abs(tc - fc);
  switch (piece.type) {
    case "p": {
      const dir = piece.color === "w" ? -1 : 1;
      return tr - fr === dir && dc === 1;
    }
    case "n":
      return (dr === 2 && dc === 1) || (dr === 1 && dc === 2);
    case "k":
      return Math.max(dr, dc) === 1;
    case "r": {
      if (fr !== tr && fc !== tc) return false;
      break;
    }
    case "b": {
      if (dr !== dc) return false;
      break;
    }
    case "q": {
      if (fr !== tr && fc !== tc && dr !== dc) return false;
      break;
    }
  }
  const sdr = Math.sign(tr - fr);
  const sdc = Math.sign(tc - fc);
  let r = fr + sdr;
  let c = fc + sdc;
  while (r !== tr || c !== tc) {
    if (board[r * 8 + c]) return false;
    r += sdr;
    c += sdc;
  }
  return true;
}

export function isSquareAttacked(board: Board, to: number, byColor: Color): boolean {
  for (let i = 0; i < 64; i++) {
    const p = board[i];
    if (p && p.color === byColor && attacksSquare(board, i, to)) return true;
  }
  return false;
}

const PROMOTIONS: PieceType[] = ["q", "r", "b", "n"];

/** All pseudo-legal moves for the piece at `from`, assuming it belongs to
 *  `state.turn`. Includes castling, en passant, and promotion variants. */
export function generatePseudoMoves(state: GameState, from: number): Move[] {
  const piece = state.board[from];
  if (!piece || piece.color !== state.turn) return [];
  const board = state.board;
  const moves: Move[] = [];
  const fromSq = indexToSquare(from);
  const fr = Math.floor(from / 8);
  const fc = from % 8;

  const add = (to: number, promo?: PieceType) => {
    moves.push({ from: fromSq, to: indexToSquare(to), promotion: promo });
  };
  const pushTarget = (tr: number, tc: number) => {
    if (tr < 0 || tr > 7 || tc < 0 || tc > 7) return;
    const t = tr * 8 + tc;
    const target = board[t];
    if (!target || target.color !== piece.color) add(t);
  };

  switch (piece.type) {
    case "n":
      for (const [dr, dc] of KNIGHT_DELTAS) pushTarget(fr + dr, fc + dc);
      break;
    case "k":
      for (const [dr, dc] of KING_DELTAS) pushTarget(fr + dr, fc + dc);
      if (fc === 4 && !isSquareAttacked(board, from, opponent(piece.color))) {
        const row = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => board[fr * 8 + i]);
        if (
          (piece.color === "w" ? state.castling.K : state.castling.k) &&
          !row[5] && !row[6] && row[7]?.type === "r" && row[7]?.color === piece.color &&
          !isSquareAttacked(board, fr * 8 + 5, opponent(piece.color)) &&
          !isSquareAttacked(board, fr * 8 + 6, opponent(piece.color))
        ) {
          add(fr * 8 + 6);
        }
        if (
          (piece.color === "w" ? state.castling.Q : state.castling.q) &&
          !row[1] && !row[2] && !row[3] && row[0]?.type === "r" && row[0]?.color === piece.color &&
          !isSquareAttacked(board, fr * 8 + 3, opponent(piece.color)) &&
          !isSquareAttacked(board, fr * 8 + 2, opponent(piece.color))
        ) {
          add(fr * 8 + 2);
        }
      }
      break;
    case "r":
      for (const [dr, dc] of ROOK_DIRS) {
        let r = fr + dr;
        let c = fc + dc;
        while (r >= 0 && r < 8 && c >= 0 && c < 8) {
          const t = r * 8 + c;
          if (board[t]) {
            if (board[t]!.color !== piece.color) add(t);
            break;
          }
          add(t);
          r += dr;
          c += dc;
        }
      }
      break;
    case "b":
      for (const [dr, dc] of BISHOP_DIRS) {
        let r = fr + dr;
        let c = fc + dc;
        while (r >= 0 && r < 8 && c >= 0 && c < 8) {
          const t = r * 8 + c;
          if (board[t]) {
            if (board[t]!.color !== piece.color) add(t);
            break;
          }
          add(t);
          r += dr;
          c += dc;
        }
      }
      break;
    case "q":
      for (const [dr, dc] of [...ROOK_DIRS, ...BISHOP_DIRS]) {
        let r = fr + dr;
        let c = fc + dc;
        while (r >= 0 && r < 8 && c >= 0 && c < 8) {
          const t = r * 8 + c;
          if (board[t]) {
            if (board[t]!.color !== piece.color) add(t);
            break;
          }
          add(t);
          r += dr;
          c += dc;
        }
      }
      break;
    case "p": {
      const dir = piece.color === "w" ? -1 : 1;
      const startRank = piece.color === "w" ? 6 : 1;
      const promoRank = piece.color === "w" ? 0 : 7;
      const one = (fr + dir) * 8 + fc;
      if (one >= 0 && one < 64 && !board[one]) {
        if (fr + dir === promoRank) {
          for (const pr of PROMOTIONS) add(one, pr);
        } else {
          add(one);
        }
        if (fr === startRank) {
          const two = (fr + 2 * dir) * 8 + fc;
          if (!board[two]) add(two);
        }
      }
      for (const dc of [-1, 1]) {
        const tr = fr + dir;
        const tc = fc + dc;
        if (tr < 0 || tr > 7 || tc < 0 || tc > 7) continue;
        const t = tr * 8 + tc;
        const target = board[t];
        if (target && target.color !== piece.color) {
          if (tr === promoRank) {
            for (const pr of PROMOTIONS) add(t, pr);
          } else {
            add(t);
          }
        } else if (!target && indexToSquare(t) === state.enPassant) {
          add(t);
        }
      }
      break;
    }
  }
  return moves;
}

export function makeMove(state: GameState, move: Move): GameState {
  const board = state.board.slice();
  const from = squareIndex(move.from);
  const to = squareIndex(move.to);
  const piece = board[from]!;
  const captured = board[to];
  const castling = { ...state.castling };

  let epCaptured = false;
  if (piece.type === "p" && move.to === state.enPassant) {
    board[to + (piece.color === "w" ? 8 : -8)] = null;
    epCaptured = true;
  }

  board[to] = move.promotion
    ? { type: move.promotion, color: piece.color }
    : piece;
  board[from] = null;

  if (piece.type === "k" && Math.abs(to - from) === 2) {
    const rank = Math.floor(from / 8);
    if (to > from) {
      board[rank * 8 + 5] = board[rank * 8 + 7];
      board[rank * 8 + 7] = null;
    } else {
      board[rank * 8 + 3] = board[rank * 8];
      board[rank * 8] = null;
    }
  }

  if (piece.type === "k") {
    if (piece.color === "w") {
      castling.K = false;
      castling.Q = false;
    } else {
      castling.k = false;
      castling.q = false;
    }
  }
  if (piece.type === "r") {
    if (move.from === "a8") castling.q = false;
    if (move.from === "h8") castling.k = false;
    if (move.from === "a1") castling.Q = false;
    if (move.from === "h1") castling.K = false;
  }
  if (captured?.type === "r") {
    if (move.to === "a8") castling.q = false;
    if (move.to === "h8") castling.k = false;
    if (move.to === "a1") castling.Q = false;
    if (move.to === "h1") castling.K = false;
  }

  const enPassant =
    piece.type === "p" && Math.abs(to - from) === 16
      ? indexToSquare((from + to) / 2)
      : null;
  const halfmove =
    piece.type === "p" || captured || epCaptured ? 0 : state.halfmove + 1;
  const fullmove = state.turn === "b" ? state.fullmove + 1 : state.fullmove;

  return { board, turn: opponent(state.turn), castling, enPassant, halfmove, fullmove };
}

export function findKing(board: Board, color: Color): number {
  for (let i = 0; i < 64; i++) {
    const p = board[i];
    if (p?.type === "k" && p.color === color) return i;
  }
  return -1;
}

export function inCheck(state: GameState, color: Color): boolean {
  const k = findKing(state.board, color);
  return k >= 0 && isSquareAttacked(state.board, k, opponent(color));
}

export function isMoveLegal(state: GameState, move: Move): boolean {
  const next = makeMove(state, move);
  return !inCheck(next, state.turn);
}

export function generateLegalMoves(state: GameState): Move[] {
  const moves: Move[] = [];
  for (let i = 0; i < 64; i++) {
    const p = state.board[i];
    if (p && p.color === state.turn) {
      for (const m of generatePseudoMoves(state, i)) {
        if (isMoveLegal(state, m)) moves.push(m);
      }
    }
  }
  return moves;
}

export type GameStatus =
  | "playing"
  | "check"
  | "checkmate"
  | "stalemate"
  | "draw";

export function getStatus(state: GameState): {
  status: GameStatus;
  winner?: Color;
} {
  if (state.halfmove >= 100) return { status: "draw" };
  const legal = generateLegalMoves(state);
  if (legal.length === 0) {
    if (inCheck(state, state.turn)) {
      return { status: "checkmate", winner: opponent(state.turn) };
    }
    return { status: "stalemate" };
  }
  if (inCheck(state, state.turn)) return { status: "check" };
  return { status: "playing" };
}
