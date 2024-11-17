import { defineBackend } from '@aws-amplify/backend'
import { auth } from './auth/resource'
import {
	AuthorizationType,
	CfnApi,
	CfnChannelNamespace,
} from 'aws-cdk-lib/aws-appsync'
import { Policy, PolicyStatement } from 'aws-cdk-lib/aws-iam'

const backend = defineBackend({
	auth,
})

const customResources = backend.createStack('custom-resources-connect4')

const cfnEventAPI = new CfnApi(customResources, 'cfnEventAPI', {
	name: 'serverless-connect4',
	eventConfig: {
		authProviders: [
			{
				authType: AuthorizationType.IAM,
			},
		],
		connectionAuthModes: [{ authType: AuthorizationType.IAM }],
		defaultPublishAuthModes: [{ authType: AuthorizationType.IAM }],
		defaultSubscribeAuthModes: [{ authType: AuthorizationType.IAM }],
	},
})

new CfnChannelNamespace(customResources, 'cfnEventAPINamespace', {
	apiId: cfnEventAPI.attrApiId,
	name: 'game',
})

// Add the policy as an inline policy (not managedPolicy) to avoid circular deps
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

backend.addOutput({
	custom: {
		events: {
			url: `https://${cfnEventAPI.getAtt('Dns.Http').toString()}/event`,
			aws_region: customResources.region,
			default_authorization_type: AuthorizationType.IAM,
		},
	},
})
