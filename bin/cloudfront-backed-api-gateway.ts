#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CloudfrontBackedApiGatewayStack } from '../lib/cloudfront-backed-api-gateway-stack';

const app = new cdk.App();
new CloudfrontBackedApiGatewayStack(app, 'CloudfrontBackedApiGatewayStackV2', {});