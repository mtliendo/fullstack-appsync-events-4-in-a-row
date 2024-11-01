'use client'

import { useReducer, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { events } from 'aws-amplify/data'
import { Amplify } from 'aws-amplify'
Amplify.configure({
	API: {
		Events: {
			endpoint:
				'https://gygvn4hmznhahcanughtt7o7aa.appsync-api.us-east-1.amazonaws.com/event',
			region: 'us-east-1',
			defaultAuthMode: 'apiKey',
			apiKey: 'da2-mkbcugpxybh2bdb5eziutml4ba',
		},
	},
})

const ROWS = 6
const COLS = 7
const EMPTY = 0
const PLAYER1 = 1
const PLAYER2 = 2

type GameState = {
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

const publishGameState = async (
	gameCode: string,
	gameState: Partial<GameState>
) => {
	console.log(`Publishing game state for game ${gameCode}:`, gameState)
	// In a real implementation, this would send the game state to a server
	await events.post(`/game/${gameCode}`, gameState)
}

const subscribeToGameState = async (
	gameCode: string,
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	callback: (gameState: Partial<GameState>) => void
) => {
	console.log(`Subscribing to game state updates for game ${gameCode}`)
	// We'll simulate receiving updates including win conditions

	const channel = await events.connect(`/game/${gameCode}`)
	channel.subscribe({
		next: (data) => {
			console.log('received', data)
		},
		error: (err) => console.error('error', err),
	})
}

function gameReducer(state: GameState, action: Action): GameState {
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

export function Connect4Component() {
	const params = useParams()
	const router = useRouter()
	const searchParams = useSearchParams()
	const gameCode = params.code as string
	const playerName = searchParams.get('player') || 'Player 1'
	const isCreator = searchParams.get('creator') === 'true'

	const [state, dispatch] = useReducer(gameReducer, {
		board: Array(ROWS)
			.fill(null)
			.map(() => Array(COLS).fill(EMPTY)),
		currentPlayer: PLAYER1,
		winner: null,
		gameOver: false,
		player1Name: isCreator ? playerName : 'Waiting for player...',
		player2Name: isCreator ? 'Waiting for player...' : playerName,
	})

	const stateRef = useRef(state)

	useEffect(() => {
		stateRef.current = state
	}, [state])

	useEffect(() => {
		subscribeToGameState(gameCode, (gameState) => {
			// Update state if there are any changes
			if (
				gameState.currentPlayer !== stateRef.current.currentPlayer ||
				gameState.winner !== stateRef.current.winner ||
				gameState.gameOver !== stateRef.current.gameOver
			) {
				dispatch({ type: 'UPDATE_GAME_STATE', newState: gameState })
			}
		})
	}, [gameCode])

	function handleClick(col: number) {
		if (
			state.gameOver ||
			(isCreator && state.currentPlayer !== PLAYER1) ||
			(!isCreator && state.currentPlayer !== PLAYER2)
		)
			return

		const newState = gameReducer(state, { type: 'PLACE_PIECE', col })
		dispatch({ type: 'PLACE_PIECE', col })

		publishGameState(gameCode, {
			board: newState.board,
			currentPlayer: newState.currentPlayer,
			winner: newState.winner,
			gameOver: newState.gameOver,
		})
	}

	function resetGame() {
		const newState = gameReducer(state, { type: 'RESET_GAME' })
		dispatch({ type: 'RESET_GAME' })
		publishGameState(gameCode, {
			board: newState.board,
			currentPlayer: newState.currentPlayer,
			winner: newState.winner,
			gameOver: newState.gameOver,
		})
	}

	const playerColor = isCreator ? 'red' : 'yellow'
	const isPlayerTurn =
		(isCreator && state.currentPlayer === PLAYER1) ||
		(!isCreator && state.currentPlayer === PLAYER2)

	return (
		<div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
			<h1 className="text-4xl font-bold mb-2 text-gray-800">Connect 4</h1>
			<h2 className="text-2xl font-semibold mb-8 text-gray-600">
				Game Code: {gameCode}
			</h2>
			<p className="text-lg mb-4">
				You are playing as{' '}
				<span
					className={`font-bold ${
						playerColor === 'red' ? 'text-red-500' : 'text-yellow-500'
					}`}
				>
					{playerColor}
				</span>
			</p>
			<div className="bg-blue-600 p-4 rounded-lg shadow-lg">
				{state.board.map((row, rowIndex) => (
					<div key={rowIndex} className="flex">
						{row.map((cell, colIndex) => (
							<div
								key={colIndex}
								className="w-12 h-12 bg-blue-500 border-2 border-blue-700 rounded-full m-1 flex items-center justify-center cursor-pointer hover:bg-blue-400 transition-colors duration-200 overflow-hidden"
								onClick={() => handleClick(colIndex)}
							>
								{cell !== EMPTY && (
									<div
										className={`w-10 h-10 rounded-full shadow-inner ${
											cell === PLAYER1 ? 'bg-red-500' : 'bg-yellow-500'
										}`}
									></div>
								)}
							</div>
						))}
					</div>
				))}
			</div>
			<div className="mt-8 text-center">
				{!state.gameOver && (
					<p className="text-xl font-semibold mb-4">
						Current Player:{' '}
						{state.currentPlayer === PLAYER1
							? state.player1Name
							: state.player2Name}
						{isPlayerTurn ? ' (Your turn)' : ''}
					</p>
				)}
				{state.winner && (
					<p className="text-2xl font-bold mb-4">
						{state.winner === PLAYER1 ? state.player1Name : state.player2Name}{' '}
						wins!
					</p>
				)}
				<div className="space-x-4">
					<Button
						onClick={resetGame}
						className="px-6 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors duration-200"
					>
						New Game
					</Button>
					<Button
						onClick={() => router.push('/')}
						className="px-6 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors duration-200"
					>
						Exit Game
					</Button>
				</div>
			</div>
		</div>
	)
}
