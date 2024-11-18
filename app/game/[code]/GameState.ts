'use client'
export const ROWS = 6
export const COLS = 7
export const EMPTY = 0
export const PLAYER1 = 1
export const PLAYER2 = 2
export type GameState = {
	board: number[][]
	currentPlayer: number
	winner: number | null
	gameOver: boolean
	player1Name: string
	player2Name: string
}
type Action =
	| { type: 'PLACE_PIECE'; col: number }
	| { type: 'RESET_GAME' }
	| { type: 'SET_PLAYER_NAME'; player: 1 | 2; name: string }
	| { type: 'UPDATE_GAME_STATE'; newState: Partial<GameState> }

export function gameReducer(state: GameState, action: Action): GameState {
	switch (action.type) {
		case 'PLACE_PIECE': {
			const { col } = action
			const newBoard = state.board.map((row) => [...row])
			const row = findEmptyRow(newBoard, col)
			if (row === -1 || state.gameOver) return state

			newBoard[row][col] = state.currentPlayer
			const win = checkWin(newBoard, row, col, state.currentPlayer)
			const newPlayer = state.currentPlayer === PLAYER1 ? PLAYER2 : PLAYER1
			return {
				...state,
				board: newBoard,
				currentPlayer: newPlayer,
				winner: win ? state.currentPlayer : null,
				gameOver: win,
			}
		}
		case 'RESET_GAME':
			return {
				...state,
				board: Array(ROWS)
					.fill(null)
					.map(() => Array(COLS).fill(EMPTY)),
				currentPlayer: PLAYER1,
				winner: null,
				gameOver: false,
			}
		case 'SET_PLAYER_NAME':
			return action.player === 1
				? { ...state, player1Name: action.name }
				: { ...state, player2Name: action.name }
		case 'UPDATE_GAME_STATE':
			return { ...state, ...action.newState }
		default:
			return state
	}
}
function checkWin(
	board: number[][],
	row: number,
	col: number,
	player: number
): boolean {
	const directions = [
		[0, 1], // horizontal
		[1, 0], // vertical
		[1, 1], // diagonal top-left to bottom-right
		[1, -1], // diagonal top-right to bottom-left
	]

	return directions.some(([dx, dy]) => {
		for (let i = -3; i <= 0; i++) {
			if (
				[0, 1, 2, 3].every((j) => {
					const r = row + (i + j) * dx
					const c = col + (i + j) * dy
					return (
						r >= 0 && r < ROWS && c >= 0 && c < COLS && board[r][c] === player
					)
				})
			) {
				return true
			}
		}
		return false
	})
}
function findEmptyRow(board: number[][], col: number): number {
	for (let row = ROWS - 1; row >= 0; row--) {
		if (board[row][col] === EMPTY) {
			return row
		}
	}
	return -1
}
