'use client'

import { useReducer, useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { events } from 'aws-amplify/data'

import { gameReducer, ROWS, COLS, EMPTY, PLAYER1, PLAYER2 } from './GameState'
import { Connect4Board } from '../../../components/connect4board'
import { GameChat } from '@/components/game-chat'

type GameMessage = {
	message: string
	player: string
}

export default function Connect4Component() {
	const params = useParams()
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
	const [messages, setMessages] = useState<GameMessage[]>([])

	useEffect(() => {
		const subscribeToGameChat = async (gameCode: string) => {
			const channel = await events.connect(`/game/${gameCode}/chat`)
			const sub = channel.subscribe({
				next: (data) => {
					if (data.event.player !== playerName) {
						setMessages((prevMessages) => [
							...prevMessages,
							data.event as GameMessage,
						])
					}
				},
				error: (err) => console.error('uh oh spaghetti-o', err),
			})
			return sub
		}

		const subPromise = subscribeToGameChat(gameCode)
		return () => {
			Promise.resolve(subPromise).then((sub) => {
				console.log('closing the connection')
				sub.unsubscribe()
			})
		}
	}, [gameCode, playerName])

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

	const handleSendMessage = async (text: string) => {
		if (text !== '') {
			const newMessage: GameMessage = { message: text, player: playerName }
			setMessages((prevMessages) => [...prevMessages, newMessage])

			await events.post(`/game/${gameCode}/chat`, newMessage)
		}
	}

	async function handleClick(col: number) {
		if (
			state.gameOver ||
			(isCreator && state.currentPlayer !== PLAYER1) ||
			(!isCreator && state.currentPlayer !== PLAYER2)
		)
			return

		const newState = gameReducer(state, { type: 'PLACE_PIECE', col })
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
		<div className="md:flex h-screen">
			<div className="flex-1 bg-muted">
				<div className="max-w-3xl mx-auto">
					<Connect4Board
						gameCode={gameCode}
						handleClick={handleClick}
						isPlayerTurn={isPlayerTurn}
						playerColor={playerColor}
						resetGame={resetGame}
						state={state}
					/>
				</div>
			</div>
			<div className="w-full max-w-sm border rounded-lg overflow-hidden bg-background shadow-sm min-h-screen flex flex-col">
				<GameChat
					currentPlayer={playerName}
					messages={messages}
					onSendMessage={handleSendMessage}
				/>
			</div>
		</div>
	)
}
