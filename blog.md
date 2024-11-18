# Developing Real-time Web Games with Chat using AppSync Events, AWS Amplify Gen 2 and NextJS

I remember first teaching my kids how to win at the popular game tic-tac-toe. For those that didn't know, it's what's known as a ["solved"](<https://en.wikipedia.org/wiki/Solved_game#:~:text=Many%20algorithms%20rely%20on%20a,(a%20result%20manually%20determinable).>) game--there's a way to guarantee you either win or draw. This was a great way for them to learn about algorithms, but admittedly, it made our time playing the game much less fun.

Fortunately, it was at that moment in their young age that I introduced them to Connect 4. While this is still a solved game, it's more difficult to track and much easier to simply have a good time playing.

In this post, we'll look at the core concepts needed to create an online version of this game. How AWS Amplify Gen 2 enables us to quickly connect to an AWS backend, and how AWS AppSync Events allow for players to to send game updates in real-time through the use of WebSocket connections. By the end of this post, you'll feel more confident in using AppSync Events with IAM authorization, and better understand its role in modern application development.

> This post is the second post in a series on AppSync Events. While the [announcement post](https://aws.amazon.com/blogs/mobile/announcing-aws-appsync-events-serverless-websocket-apis/) contains an overview of the service, the first post in this series on building with AppSync Events can be found [here]().

## Application Overview --inlude architecture diagram and repo

Instead of carrying around the game pieces and being within talking distance to the person we're playing against, our application is fully online and supports chat functionality. However, instead of requiring players to login, we'll instead ask for their username and generate a unique game code that they can share with the person they're playing with.

![screenshot of homepage with screenname and gamecode showing]()

By creating a game, you are player one (red), and by joining a game, you are the player two (yellow). To make sure the other player is there, players can chat with eachother throughout the game.

![screenshot of gamepage with tokens played and chats sent]()

The game will automatically stop once a 4 of the same colored pieces are placed in a row, whether that's vertically, horizontally, or diagonally. From there, players can choose to play a new game, or exit the game all together.

> To view the code, along with a readme with instructions for hosting and running the code locally, view the repository.

Due to games being short-lived, there isn't a need to persist data in a database. In addition, having real-time capabilities as the heart of this application, mean there isn't an API.

In fact, the entire backend is comprised of 2 core AWS services:

- **Amazon Cognito**: A Cognito Identity pool provides scoped down permissions for unauthenticated access to our Event API
- **AWS AppSync**: Completely detached from GraphQL, AppSync Events offers standalone WebSocket endpoints that scale to millions of subscribers.

![screenshot of fullstack architecture diagram]()

## Creating an AppSync Event API with IAM Authorization

An AppSync Event API can authorize calls using an API key, Cognito userpools, AWS Lambda, OIDC, or IAM. In the previous post, we saw how an API key can be configured, and in future posts we'll showcase both Lambda and Cognito. However, for applications that need secure unauthenticated access, the IAM auth mode is a great choice and what we'll discuss in this section.

In the `amplify/backend.ts` file, you'll notice that the we have `auth` configured:

```ts
const backend = defineBackend({ auth })
```

This one line of code setups ups our Cognito user pool and Cognito Identity pool. Since the user pool keeps track of logged in users, we won't make use of it, however, we the Identity pool is key for our application since it will authorize our users that visit our app but haven't logged in. To showcase how that comes together, we create a seperate CDK stack to house services that extend Amplify:

```ts
const customResources = backend.createStack('custom-resources-connect4')
```

This is simply a logical way to group services together and nest them in our main `backend` stack. The items that we'll add to this stack will all related to our Event API:

```ts
const cfnEventAPI = new CfnApi(customResources, 'cfnEventAPI', {
	name: 'serverless-connect4',
	eventConfig: {
		authProviders: [{ authType: AuthorizationType.IAM }],
		connectionAuthModes: [{ authType: AuthorizationType.IAM }],
		defaultPublishAuthModes: [{ authType: AuthorizationType.IAM }],
		defaultSubscribeAuthModes: [{ authType: AuthorizationType.IAM }],
	},
})

new CfnChannelNamespace(customResources, 'cfnEventAPINamespace', {
	apiId: cfnEventAPI.attrApiId,
	name: 'game',
})
```

As shown above, we first create our Event API by leveraging the L1 construct from the AWS CDK. In doing so, we provide it with the name of our API, and pass in an config that represents the auth providers we'll accept, and which providers to allow for connecting, publishing, and subscribing.

Additionally, we create a root namespace called `game`. Client apps can connect to this namespace, and segments off of the root like `/game/gameId/chat`, to further specify the connection data they are interested in receiving.

> Setting up an Event API as infrasture-as-code (IAC), currently involves using an L1 construct. These directly correspond to their [CloudFormation reference](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-appsync-api.html). The posts in this series will be updated once the higher-level L2 constructs are available.

By specifying, `IAM` as the authorization mode, we'll need to attach a policy that allows calling our Event API to an AWS service. The service we'll use is our Cognito Identity pool:

```ts
backend.auth.resources.unauthenticatedUserIamRole.attachInlinePolicy(
	new Policy(customResources, 'AppSyncEventPolicy', {
		statements: [
			new PolicyStatement({
				actions: [
					'appsync:EventConnect',
					'appsync:EventPublish',
					'appsync:EventSubscribe',
				],
				resources: [`${cfnEventAPI.attrApiArn}/*`, `${cfnEventAPI.attrApiArn}`],
			}),
		],
	})
)
```

Above, we simply use the `unauthenticatedUserIamRole` from our auth resource (Cognito) to directly attach a policy. Note that Cognito comes available with two roles: One for when users are logged in and stored in a user pool (`authenticatedRole`), and another for when they are not logged in and we want to use permissions from the Identity pool (`unauthenticatedRole`).

With our Event API configured and connected to Cognito, we'll pass the related values to our frontend application so we can make use of them to connect, publish, and subscribe:

```ts
backend.addOutput({
	custom: {
		events: {
			url: `https://${cfnEventAPI.getAtt('Dns.Http').toString()}/event`,
			aws_region: customResources.region,
			default_authorization_type: AuthorizationType.IAM,
		},
	},
})
```

The format here is important as the Amplify JavaScript libraries have been updated to work with Event API's so long as `custom` data in the `events` object contains the `url`, `aws_region`, and `default_authorization_type` items.

Following the readme for this project, with our backend configured, a developer can now run `npx ampx sandbox` to deploy these resources to their AWS account.

## Connecting to an AppSync Event API with AWS Amplify Gen 2

In our NextJS application, we have a home page located at `app/page.tsx`, and our game page at `app/game/[code]/page.tsx`.

As shown in the earlier screenshot, the home page simply captures the username of the user and in the event the user is creating a new game, it will generate a game code. From there, the user is taken to to a [dynamic route](https://nextjs.org/docs/pages/building-your-application/routing/dynamic-routes) where the `code` is the game code.

> As shown in the `app/layout.tsx` file, our NextJS application is already configured to use our AWS backend. The setup for this can be found in the `components/configureAmplify.tsx` file.

In the `app/game/[code]/page.tsx` we can see our application take shape. We connect to our WebSocket endpoint using the `events.connect` method from the `aws-amplify/data` library. The best place to do this is in a `useEffect` call since we want it to happen when the page first loads:

```ts
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
```

Once we establish a connection to a particular channel, we can begin publishing and subscribing to it. For this use case, everytime we receive a messsage from another player, we send the data to a [reducer](https://react.dev/reference/react/useReducer) so that the new state can be rendered in our UI. This can be viewed in the `app/game/[code]/GameState.ts` file.

The last part of this `useEffect` file involves cleaning up any connections once the page is closed or navigated away from. This is connection by calling a subscriptions `unsubscribe` method. This helps avoid memory leaks that would otherwise slow down our application.

Publishing an event is how we pass data from one event source to a client. In our app, anytime a player places a piece on the board, clicks the "New Game" or "Reset Game" buttons, we publish and event containing those details to the `/game/${gameCode}` segment on our channel:

```ts
await events.post(`/game/${gameCode}`, {
	board: newState.board,
	currentPlayer: newState.currentPlayer,
	winner: newState.winner,
	gameOver: newState.gameOver,
})
```

As you can see, making use of an Event API in your fullstack applications requires very little code!

When it comes to sending chat messages, the process is the same. Another `useEffect` call sets up a connnection on the `/game/${gameCode}/chat` segment of our channel and whenever a user hits enter on the message input, a call to `await events.post(`/game/${gameCode}/chat`,newMessage)` is sent.

## Conclusion

In this post, we discussed how to an application can be brought to life when combining modern frontend framework like NextJS, with the power of Amplify Gen 2, and the ease and scalability of AppSync Events. We also saw how Amplify can be extended beyond its core capabilities to use L1 constructs in the CDK.

AppSync Event API's offer 250,000 events to be sent as part of its free tier and scales to millions of subscribers. As a fully managed service, developers now have a simple way to bring real-time capabilities to their apps without being locked to a specific API service.

In future posts, we'll discuss how to publish an event from a Lambda function, while allowing authenticated users to subscribe to those events.

To learn more about AppSync events visit the [documentation page](https://docs.aws.amazon.com/appsync/latest/eventapi/event-api-welcome.html).
