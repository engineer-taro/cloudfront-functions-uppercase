import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Runtime } from 'aws-cdk-lib/aws-lambda';

export class CloudfrontBackedApiGatewayStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Lambda
    const lambda = new NodejsFunction(this, 'OutputHeadersLambda', {
      entry: 'src/output-headers.ts',
      handler: 'handler',
      runtime: Runtime.NODEJS_20_X,
      bundling: {
        forceDockerBundling: false
      }
    });

    // API Gateway Resource Policy
    const resourcePolicy = new iam.PolicyDocument({
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.DENY,
          actions: ["execute-api:Invoke"],
          principals: [new iam.AnyPrincipal()],
          resources: ["execute-api:/*"],
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ["execute-api:Invoke"],
          principals: [new iam.AnyPrincipal()],
          resources: ["execute-api:/*"],
        }),
      ],
    });


    // API Gateway
    const myApi = new apigateway.RestApi(this, 'MyApi', {
      deploy: true,
      deployOptions: {
        stageName: 'prod'
      },
      policy: resourcePolicy
    });
    myApi.root.addResource('sample').addMethod('GET', new apigateway.LambdaIntegration(lambda));

    // CloudFront Function
    const restrictIpFunction = new cloudfront.Function(this, 'RestrictIpFunction', {
      code: cloudfront.FunctionCode.fromFile({
        filePath: 'lib/sample-cloudfront-functions.js'
      }),
      runtime: cloudfront.FunctionRuntime.JS_2_0,
    });

    // CloudFront
    new cloudfront.Distribution(this, 'MyCloudFront', {
      defaultBehavior: {
        origin: new origins.RestApiOrigin(myApi, {
          originPath: '/prod',
        }),
        compress: false,
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
        functionAssociations: [
          {
            function: restrictIpFunction,
            eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
          }
        ]
      },
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
      enableIpv6: false,
    });
  }
}
