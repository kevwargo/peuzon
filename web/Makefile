CDK_OUTPUTS := ../backend/cdk.out/outputs.json

.PHONY: deploy

deploy:
	npm run build
	aws s3 sync dist/ s3://$(shell jq -r .PeuzonStack.BucketName $(CDK_OUTPUTS))/
	jq -r .PeuzonStack.WebsiteUrl $(CDK_OUTPUTS)
