import { App } from "aws-cdk-lib";
import { PeuzonStack } from "./stack";

const app = new App();

new PeuzonStack(app, "PeuzonStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});
