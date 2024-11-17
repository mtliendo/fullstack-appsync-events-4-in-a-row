'use client'

import { useReducer, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { events } from 'aws-amplify/data'

import { gameReducer, ROWS, COLS, EMPTY, PLAYER1, PLAYER2 } from './GameState'

export function Connect4Component() {
	const params = useParams()
	const router = useRouter()
	const searchParams = useSearchParams()
	const gameCode = params.code as string
	const playerName = searchParams.get('player') || 'Player 1'
	const isCreator = searchParams.get('creator') === 'true'
	const initialGameState = {
		board: Array(ROWS)
			.fill(null)
			.map(() => Array(COLS).fill(EMPTY)),
		currentPlayer: PLAYER1,
		winner: null,
		gameOver: false,
		player1Name: isCreator ? playerName : 'Waiting for player...',
		player2Name: isCreator ? 'Waiting for player...' : playerName,
	}

	const [state, dispatch] = useReducer(gameReducer, initialGameState)

	useEffect(() => {
		const subscribeToGameState = async (gameCode: string) => {
			const channel = await events.connect(`/game/${gameCode}`)
			const sub = channel.subscribe({
				next: (data) => {
					dispatch({ type: 'UPDATE_GAME_STATE', newState: data.event })
				},
				error: (err) => console.error('uh oh spaghetti-o', err),
			})
			return sub
		}

		const subPromise = subscribeToGameState(gameCode)
		return () => {
			Promise.resolve(subPromise).then((sub) => {
				console.log('closing the connection')
				sub.unsubscribe()
			})
		}
	}, [gameCode])

	async function handleClick(col: number) {
		if (
			state.gameOver ||
			(isCreator && state.currentPlayer !== PLAYER1) ||
			(!isCreator && state.currentPlayer !== PLAYER2)
		)
			return

		const newState = gameReducer(state, { type: 'PLACE_PIECE', col })
		console.log('the new state from placing  a piece', newState)
		dispatch({ type: 'PLACE_PIECE', col })
		await events.post(`/game/${gameCode}`, {
			board: newState.board,
			currentPlayer: newState.currentPlayer,
			winner: newState.winner,
			gameOver: newState.gameOver,
		})
	}

	async function resetGame() {
		const newState = gameReducer(state, { type: 'RESET_GAME' })
		dispatch({ type: 'RESET_GAME' })

		await events.post(`/game/${gameCode}`, {
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
