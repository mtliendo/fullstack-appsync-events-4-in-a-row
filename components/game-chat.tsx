'use client'

import { Send } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

interface GameMessage {
	message: string
	player: string
}

interface GameChatProps {
	messages: GameMessage[]
	currentPlayer: string
	onSendMessage: (message: string) => void
}

export function GameChat({
	messages,
	currentPlayer,
	onSendMessage,
}: GameChatProps) {
	const inputRef = useRef<HTMLInputElement>(null)
	const scrollRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		if (scrollRef.current) {
			scrollRef.current.scrollTop = scrollRef.current.scrollHeight
		}
	}, [messages])

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		if (inputRef.current?.value.trim()) {
			onSendMessage(inputRef.current.value)
			inputRef.current.value = ''
		}
	}

	return (
		<>
			<div className="p-3 border-b bg-muted/50">
				<h2 className="font-semibold">Game Chat</h2>
			</div>
			<ScrollArea ref={scrollRef} className="h-[300px] p-4 flex-1">
				<div className="flex flex-col gap-3">
					{messages.map((msg, i) => (
						<div
							key={i}
							className={cn(
								'flex max-w-[80%] flex-col gap-1 rounded-lg px-3 py-2 text-sm',
								msg.player === currentPlayer
									? 'ml-auto bg-primary text-primary-foreground'
									: 'bg-muted'
							)}
						>
							<div>{msg.message}</div>
						</div>
					))}
				</div>
			</ScrollArea>
			<form onSubmit={handleSubmit} className="p-3 border-t flex gap-2">
				<Input
					ref={inputRef}
					placeholder="Type a message..."
					className="flex-1"
				/>
				<Button type="submit" size="icon">
					<Send className="h-4 w-4" />
					<span className="sr-only">Send message</span>
				</Button>
			</form>
		</>
	)
}
