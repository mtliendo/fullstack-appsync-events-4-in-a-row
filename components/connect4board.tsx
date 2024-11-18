'use client'

import { useRouter } from 'next/navigation'
import { GameState, EMPTY, PLAYER1 } from '../app/game/[code]/GameState'
import { Button } from '@/components/ui/button'

type Connect4ViewProps = {
	gameCode: string
	playerColor: string
	state: GameState
	handleClick: (col: number) => void
	isPlayerTurn: boolean
	resetGame: () => void
}

export const Connect4Board = ({
	gameCode,
	playerColor,
	state,
	handleClick,
	isPlayerTurn,
	resetGame,
}: Connect4ViewProps) => {
	const router = useRouter()

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
