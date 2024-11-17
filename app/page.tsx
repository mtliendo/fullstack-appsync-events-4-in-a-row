'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import { Label } from '@/components/ui/label'

function generateShortCode() {
	const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
	const length = Math.floor(Math.random() * 3) + 6 // 6-8 characters
	let result = ''
	for (let i = 0; i < length; i++) {
		result += characters.charAt(Math.floor(Math.random() * characters.length))
	}
	return result
}

export default function StartGameComponent() {
	const [shortCode, setShortCode] = useState('')
	const [generatedCode, setGeneratedCode] = useState('')
	const [screenName, setScreenName] = useState('')
	const router = useRouter()

	const handleGenerateCode = () => {
		const newCode = generateShortCode()
		setGeneratedCode(newCode)
	}

	const handleStartGame = (code: string) => {
		if (code && screenName) {
			router.push(
				`/game/${code}?player=${encodeURIComponent(screenName)}&creator=true`
			)
		}
	}

	const handleJoinGame = (code: string) => {
		if (code && screenName) {
			router.push(
				`/game/${code}?player=${encodeURIComponent(screenName)}&creator=false`
			)
		}
	}

	return (
		<div className="flex items-center justify-center min-h-screen bg-gray-100">
			<Card className="w-[350px]">
				<CardHeader>
					<CardTitle>Start a Connect 4 Game</CardTitle>
					<CardDescription>
						Enter your screen name and generate a new game or join an existing
						one
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="screen-name">Screen Name</Label>
							<Input
								id="screen-name"
								placeholder="Enter your screen name"
								value={screenName}
								onChange={(e) => setScreenName(e.target.value)}
							/>
						</div>
						<div>
							<Button onClick={handleGenerateCode} className="w-full mb-2">
								Generate New Game Code
							</Button>
							{generatedCode && (
								<div className="text-center">
									<p className="mb-2">Your game code:</p>
									<p className="font-bold text-2xl">{generatedCode}</p>
									<Button
										onClick={() => handleStartGame(generatedCode)}
										className="mt-2"
										disabled={!screenName}
									>
										Start New Game
									</Button>
								</div>
							)}
						</div>
						<div className="space-y-2">
							<Label htmlFor="game-code">Join Existing Game</Label>
							<div className="flex items-center space-x-2">
								<Input
									id="game-code"
									placeholder="Enter game code"
									value={shortCode}
									onChange={(e) => setShortCode(e.target.value.toUpperCase())}
									maxLength={8}
								/>
								<Button
									onClick={() => handleJoinGame(shortCode)}
									disabled={!screenName || !shortCode}
								>
									Join Game
								</Button>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}
