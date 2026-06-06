export AWS_DEFAULT_REGION ?= eu-north-1

.PHONY: deploy
deploy:
	npx cdk deploy --require-approval=never '*'

.PHONY: synth
synth:
	npx cdk synth '*' >/dev/null

.PHONY: bootstrap
bootstrap:
	npx cdk bootstrap
