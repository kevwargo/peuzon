export AWS_DEFAULT_REGION ?= eu-north-1
CDK_OUTPUTS := $(shell realpath cdk.out/outputs.json)
API_KEY_EXPORT := $(shell realpath .api-key)

.PHONY: deploy synth bootstrap generate-api-key

deploy:
	npx cdk deploy --outputs-file $(CDK_OUTPUTS) --require-approval=never '*'

synth:
	npx cdk synth '*' >/dev/null

bootstrap:
	npx cdk bootstrap

generate-api-key:
	uv run --directory src python -m scripts.generate_key $(CDK_OUTPUTS) $(API_KEY_EXPORT)
