'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { useParams, useRouter, useSearchParams } from 'next/navigation'

const ROWS = 6
const COLS = 7
const EMPTY = 0
const PLAYER1 = 1
const PLAYER2 = 2

// Mock HTTP pub/sub functions
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const publishGameState = async (gameCode: string, gameState: any) => {
	console.log(`Publishing game state for game ${gameCode}:`, gameState)
	// In a real implementation, this would send the game state to a server
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const subscribeToGameState = async (
	gameCode: string,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	callback: (gameState: any) => void
) => {
	console.log(`Subscribing to game state updates for game ${gameCode}`)
	// In a real implementation, this would set up a websocket or long-polling connection
	// For this mock, we'll simulate receiving updates every 5 seconds
	setInterval(() => {
		const mockUpdate = {
			board: [[]],
			currentPlayer: Math.random() > 0.5 ? PLAYER1 : PLAYER2,
		}
		callback(mockUpdate)
	}, 5000)
}

export function Connect4Component() {
	const params = useParams()
	const router = useRouter()
	const searchParams = useSearchParams()
	const gameCode = params.code as string
	const playerName = searchParams.get('player') || 'Player 1'
	const isCreator = searchParams.get('creator') === 'true'

	const [board, setBoard] = useState<number[][]>(() =>
		Array(ROWS)
			.fill(null)
			.map(() => Array(COLS).fill(EMPTY))
	)
	const [currentPlayer, setCurrentPlayer] = useState<number>(PLAYER1)
	const [winner, setWinner] = useState<number | null>(null)
	const [gameOver, setGameOver] = useState<boolean>(false)
	const [player1Name] = useState(
		isCreator ? playerName : 'Waiting for player...'
	)
	const [player2Name] = useState(
		isCreator ? 'Waiting for player...' : playerName
	)

	useEffect(() => {
		// Subscribe to game state updates
		subscribeToGameState(gameCode, (gameState) => {
			setBoard(gameState.board)
			setCurrentPlayer(gameState.currentPlayer)
		})
	}, [gameCode])

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

	function placePiece(
		board: number[][],
		row: number,
		col: number,
		player: number
	) {
		const newBoard = board.map((r) => [...r])
		newBoard[row][col] = player
		return newBoard
	}

	function handleClick(col: number) {
		if (
			gameOver ||
			(isCreator && currentPlayer !== PLAYER1) ||
			(!isCreator && currentPlayer !== PLAYER2)
		)
			return

		setBoard((prevBoard) => {
			const row = findEmptyRow(prevBoard, col)
			if (row === -1) return prevBoard // Column is full

			const newBoard = placePiece(prevBoard, row, col, currentPlayer)

			if (checkWin(newBoard, row, col, currentPlayer)) {
				setWinner(currentPlayer)
				setGameOver(true)
			} else {
				setCurrentPlayer((prev) => (prev === PLAYER1 ? PLAYER2 : PLAYER1))
			}

			// Publish the new game state
			publishGameState(gameCode, {
				board: newBoard,
				currentPlayer: currentPlayer === PLAYER1 ? PLAYER2 : PLAYER1,
			})

			return newBoard
		})
	}

	function resetGame() {
		const newBoard = Array(ROWS)
			.fill(null)
			.map(() => Array(COLS).fill(EMPTY))
		setBoard(newBoard)
		setCurrentPlayer(PLAYER1)
		setWinner(null)
		setGameOver(false)
		publishGameState(gameCode, { board: newBoard, currentPlayer: PLAYER1 })
	}

	const playerColor = isCreator ? 'red' : 'yellow'
	const isPlayerTurn =
		(isCreator && currentPlayer === PLAYER1) ||
		(!isCreator && currentPlayer === PLAYER2)

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
				{board.map((row, rowIndex) => (
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
				{!gameOver && (
					<p className="text-xl font-semibold mb-4">
						Current Player:{' '}
						{currentPlayer === PLAYER1 ? player1Name : player2Name}
						{isPlayerTurn ? ' (Your turn)' : ''}
					</p>
				)}
				{winner && (
					<p className="text-2xl font-bold mb-4">
						{winner === PLAYER1 ? player1Name : player2Name} wins!
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
