export AWS_DEFAULT_REGION ?= eu-north-1
CDK_OUTPUTS := $(shell realpath cdk.out/outputs.json)

.PHONY: deploy synth bootstrap

deploy:
	npx cdk deploy --outputs-file $(CDK_OUTPUTS) --require-approval=never --all --method direct

synth:
	npx cdk synth '*' >/dev/null

bootstrap:
	npx cdk bootstrap
