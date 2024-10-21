'use client'

import { useState, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { useParams, useRouter } from 'next/navigation'

const ROWS = 6
const COLS = 7
const EMPTY = 0
const PLAYER1 = 1
const PLAYER2 = 2

const findEmptyRow = (board: number[][], col: number): number => {
	for (let row = ROWS - 1; row >= 0; row--) {
		if (board[row][col] === EMPTY) {
			return row
		}
	}
	return -1
}

const placePiece = (
	board: number[][],
	row: number,
	col: number,
	player: number
) => {
	const newBoard = board.map((r) => [...r])
	newBoard[row][col] = player
	return newBoard
}

const switchPlayer = (player: number) => {
	return player === PLAYER1 ? PLAYER2 : PLAYER1
}

const checkWin = (
	board: number[][],
	row: number,
	col: number,
	player: number
): boolean => {
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

export function Connect4Component() {
	const params = useParams()
	const router = useRouter()
	const gameCode = params.code as string

	const [board, setBoard] = useState<number[][]>(() =>
		Array(ROWS)
			.fill(null)
			.map(() => Array(COLS).fill(EMPTY))
	)
	const [currentPlayer, setCurrentPlayer] = useState<number>(PLAYER1)
	const [winner, setWinner] = useState<number | null>(null)
	const [gameOver, setGameOver] = useState<boolean>(false)
	const [lastMove, setLastMove] = useState<{ row: number; col: number }>({
		row: -1,
		col: -1,
	})

	const handleMove = useCallback(
		(row: number, col: number, newBoard: number[][]) => {
			setLastMove({ row, col })

			if (checkWin(newBoard, row, col, currentPlayer)) {
				setWinner(currentPlayer)
				setGameOver(true)
			} else {
				setCurrentPlayer(switchPlayer(currentPlayer))
			}
		},
		[currentPlayer]
	)

	const handleClick = useCallback(
		(col: number) => {
			if (gameOver) return

			setBoard((prevBoard) => {
				const row = findEmptyRow(prevBoard, col)
				if (row === -1) return prevBoard // Column is full

				const newBoard = placePiece(prevBoard, row, col, currentPlayer)
				handleMove(row, col, newBoard)
				return newBoard
			})
		},
		[currentPlayer, gameOver, handleMove]
	)

	const resetGame = useCallback(() => {
		setBoard(
			Array(ROWS)
				.fill(null)
				.map(() => Array(COLS).fill(EMPTY))
		)
		setCurrentPlayer(PLAYER1)
		setWinner(null)
		setGameOver(false)
		setLastMove({ row: -1, col: -1 })
	}, [])

	useEffect(() => {
		const timer = setTimeout(() => {
			setLastMove({ row: -1, col: -1 })
		}, 600)

		return () => clearTimeout(timer)
	}, [lastMove])

	return (
		<div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
			<h1 className="text-4xl font-bold mb-2 text-gray-800">Connect 4</h1>
			<h2 className="text-2xl font-semibold mb-8 text-gray-600">
				Game Code: {gameCode}
			</h2>
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
										} ${
											rowIndex === lastMove.row && colIndex === lastMove.col
												? 'animate-drop'
												: ''
										}`}
										style={
											{
												'--drop-height': `${(ROWS - rowIndex) * 100}%`,
											} as React.CSSProperties
										}
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
						Current Player: {currentPlayer === PLAYER1 ? 'Red' : 'Yellow'}
					</p>
				)}
				{winner && (
					<p className="text-2xl font-bold mb-4">
						Player {winner === PLAYER1 ? 'Red' : 'Yellow'} wins!
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
