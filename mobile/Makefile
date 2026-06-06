.PHONY: build install run-android ensure-env start-metro

ensure-env:
	uv run --directory ../backend/src python -m scripts.export_env $(shell realpath env.json)

start-metro:
	npm run start

run-android: ensure-env
	npm run android

build: ensure-env
	mkdir -p android/app/src/main/assets
	npx react-native bundle \
		--platform android \
		--entry-file index.js \
		--bundle-output android/app/src/main/assets/index.android.bundle \
		--assets-dest android/app/src/main/res
	cd android && ./gradlew assembleDebug

install: build
	adb install android/app/build/outputs/apk/debug/app-debug.apk
