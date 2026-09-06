# 2Life · мобильное приложение.
# Единственная точка входа: всё, что делают с проектом, вызывается через make.
# Скрипты в package.json — реализация; помнить их наизусть не нужно.

NPM ?= npm
PLATFORM ?= ios

# CocoaPods падает на нормализации пути, если локаль не UTF-8: ruby считает путь
# ASCII-8BIT и роняет `pod install` изнутри, не объяснив причину. Задаём локаль
# в целях, которые его дёргают.
UTF8 := LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8

.DEFAULT_GOAL := help
.PHONY: help setup install hooks start ios android web lint lint-fix format \
        format-check typecheck test test-watch check doctor prebuild tokens clean reset \
        build-dev build-preview run-native pods

help: ## Показать список команд
	@grep -hE '^[a-z][a-zA-Z_-]*:.*?## ' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

setup: install hooks ## Первый запуск проекта: зависимости и git-хуки
	@echo "Готово. Дальше — make ios или make start."

install: ## Поставить зависимости строго по package-lock.json
	$(NPM) ci

# npm install включает хуки сам (скрипт prepare). Цель нужна, когда дерево
# переклонировали или hooksPath сбросили руками.
hooks: ## Включить git-хуки из .githooks
	git config core.hooksPath .githooks

start: ## Dev-сервер Expo (выбор платформы в терминале)
	$(NPM) run start

ios: ## Запустить на iOS-симуляторе
	$(NPM) run start:ios

android: ## Запустить на Android-эмуляторе
	$(NPM) run start:android

run-native: ## Собрать нативно и запустить на симуляторе (PLATFORM=ios|android)
	$(UTF8) npx expo run:$(PLATFORM)

pods: ## Переустановить CocoaPods после смены нативных зависимостей
	cd ios && $(UTF8) pod install

build-dev: ## Дев-сборка с dev-client (PLATFORM=ios|android|all)
	npx eas-cli build --profile development --platform $(PLATFORM)

build-preview: ## Сборка, которую можно отдать в руки (PLATFORM=ios|android|all)
	npx eas-cli build --profile preview --platform $(PLATFORM)

web: ## Открыть веб-версию — быстрый способ посмотреть вёрстку
	$(NPM) run web

tokens: ## Пересобрать цветовые шкалы из рецепта в scripts/generate-palette.mjs
	node scripts/generate-palette.mjs
	npx prettier --write src/shared/theme/palette.gen.ts

lint: ## ESLint: границы слоёв, дисциплина токенов, гигиена импортов
	$(NPM) run lint

lint-fix: ## ESLint с автоправкой
	$(NPM) run lint:fix

format: ## Отформатировать всё Prettier'ом
	$(NPM) run format

format-check: ## Проверить форматирование, ничего не меняя
	$(NPM) run format:check

typecheck: ## Проверить типы без сборки
	$(NPM) run typecheck

test: ## Прогнать тесты
	$(NPM) test

test-watch: ## Тесты в режиме наблюдения
	$(NPM) run test:watch

check: format-check lint typecheck test ## Полный прогон — ровно то же делает CI

doctor: ## Проверить, что версии пакетов совместимы с этим SDK
	npx expo-doctor

# Скрипты запуска называются start:ios / start:android намеренно: prebuild
# переписывает их, только если значение дословно `expo start --ios`.
prebuild: ## Сгенерировать нативные проекты ios/ и android/
	$(UTF8) npx expo prebuild --clean

clean: ## Убрать сборочный мусор
	rm -rf .expo dist coverage

reset: clean ## Снести node_modules и поставить заново
	rm -rf node_modules
	$(NPM) install

# --- Релизная сборка iOS ------------------------------------------------------
# Локально, без облака: xcodebuild archive → export .ipa → загрузка в TestFlight.
# Версия и номер сборки живут в app.json — это единственный источник правды,
# перед сборкой они синкаются в нативный проект.
#
#   make build-ipa ENV=prod     собрать и залить в TestFlight
#   make set-build N=2          поднять номер сборки
#
# Загрузка идёт ключом App Store Connect API: пароль в терминал не вводят и в
# репозиторий не кладут. Ключ (.p8) лежит в ~/.appstoreconnect/private_keys/,
# идентификаторы — в переменных окружения или в .env.release (он в .gitignore).

WORKSPACE   := ios/2Life.xcworkspace
SCHEME      := 2Life
ARCHIVE     := build/ios/2Life.xcarchive
DERIVED     := build/ios/DerivedData
IPA_DIR     := build/ios/ipa
INFO_PLIST  := ios/2Life/Info.plist
PBXPROJ     := ios/2Life.xcodeproj/project.pbxproj

APP_VERSION := $(shell node -p "require('./app.json').expo.version")
BUILD_NUM   := $(shell node -p "require('./app.json').expo.ios.buildNumber || 1")
# Команда подписи. Expo prebuild её не проставляет, поэтому значение живёт
# здесь и уезжает в нативный проект при сборке. Переопределить:
# make build-ipa TEAM_ID=XXXXXXXXXX
TEAM_ID     ?= DL3ZMDX6R9

# Контур сборки: от него зависит только адрес API — секретов в бандле нет.
ENV ?= prod
API_URL_prod    := https://2life.blackshift.dev
API_URL_staging := https://2life.blackshift.dev
API_URL         := $(API_URL_$(ENV))

.PHONY: set-build build-ipa upload-ipa

set-build: ## Выставить номер сборки в app.json (N=<число>)
	@[ -n "$(N)" ] || { echo "Использование: make set-build N=<номер сборки>"; exit 1; }
	@node -e "const fs=require('fs'),f='app.json',j=JSON.parse(fs.readFileSync(f));j.expo.ios.buildNumber=String($(N));j.expo.android.versionCode=Number($(N));fs.writeFileSync(f,JSON.stringify(j,null,2)+'\n');console.log('→ номер сборки:',$(N));"

build-ipa: ## Собрать .ipa и залить в TestFlight (ENV=prod|staging)
	@[ -n "$(API_URL)" ] || { echo "✗ Неизвестный контур ENV=$(ENV). Есть: prod, staging"; exit 1; }
	@[ -d ios ] || { echo "✗ Нет каталога ios/. Сначала: make prebuild"; exit 1; }
	@echo ""
	@echo "  2Life $(APP_VERSION) ($(BUILD_NUM)) · контур $(ENV) · $(API_URL)"
	@echo "  Team: $(TEAM_ID) · ветка $$(git rev-parse --abbrev-ref HEAD)"
	@echo ""
	@echo "→ Синк версии и команды подписи из app.json в нативный проект"
	@sed -i '' -E 's/CURRENT_PROJECT_VERSION = [0-9.]+;/CURRENT_PROJECT_VERSION = $(BUILD_NUM);/g' $(PBXPROJ)
	@sed -i '' -E 's/MARKETING_VERSION = [0-9.]+;/MARKETING_VERSION = $(APP_VERSION);/g' $(PBXPROJ)
	@grep -q 'DEVELOPMENT_TEAM' $(PBXPROJ) \
	  && sed -i '' -E 's/DEVELOPMENT_TEAM = [A-Z0-9]*;/DEVELOPMENT_TEAM = $(TEAM_ID);/g' $(PBXPROJ) \
	  || sed -i '' -E 's/(PRODUCT_BUNDLE_IDENTIFIER = [^;]+;)/DEVELOPMENT_TEAM = $(TEAM_ID);\n\t\t\t\t\1/g' $(PBXPROJ)
	@plutil -replace CFBundleVersion -string "$(BUILD_NUM)" $(INFO_PLIST)
	@plutil -replace CFBundleShortVersionString -string "$(APP_VERSION)" $(INFO_PLIST)
	@mkdir -p build/ios
	@printf '%s\n' \
	  '<?xml version="1.0" encoding="UTF-8"?>' \
	  '<plist version="1.0">' \
	  '<dict>' \
	  '  <key>method</key><string>app-store-connect</string>' \
	  '  <key>teamID</key><string>$(TEAM_ID)</string>' \
	  '  <key>signingStyle</key><string>automatic</string>' \
	  '  <key>stripSwiftSymbols</key><true/>' \
	  '  <key>uploadSymbols</key><true/>' \
	  '  <key>destination</key><string>export</string>' \
	  '</dict>' \
	  '</plist>' > build/ios/ExportOptions.plist
	@echo "→ Архивирую ($(SCHEME), Release)…"
	@set -o pipefail; \
	EXPO_PUBLIC_API_URL=$(API_URL) $(UTF8) xcodebuild archive \
	  -workspace $(WORKSPACE) -scheme $(SCHEME) -configuration Release \
	  -destination 'generic/platform=iOS' \
	  -archivePath $(ARCHIVE) -derivedDataPath $(DERIVED) \
	  DEVELOPMENT_TEAM=$(TEAM_ID) \
	  -allowProvisioningUpdates
	@echo "→ Экспортирую .ipa…"
	@rm -rf $(IPA_DIR)
	@set -o pipefail; \
	xcodebuild -exportArchive \
	  -archivePath $(ARCHIVE) -exportPath $(IPA_DIR) \
	  -exportOptionsPlist build/ios/ExportOptions.plist \
	  -allowProvisioningUpdates
	@$(MAKE) --no-print-directory upload-ipa

upload-ipa: ## Залить собранный .ipa в TestFlight
	@[ -f .env.release ] && . ./.env.release || true; \
	key="$${ASC_KEY_ID}"; issuer="$${ASC_ISSUER_ID}"; \
	if [ -z "$$key" ] || [ -z "$$issuer" ]; then \
	  echo ""; \
	  echo "✗ Нет ключа App Store Connect API — заливать нечем."; \
	  echo "  App Store Connect → Users and Access → Integrations → App Store Connect API,"; \
	  echo "  роль App Manager. Скачанный AuthKey_XXXX.p8 положить в"; \
	  echo "  ~/.appstoreconnect/private_keys/ и создать .env.release рядом с Makefile:"; \
	  echo ""; \
	  echo "    ASC_KEY_ID=XXXXXXXXXX"; \
	  echo "    ASC_ISSUER_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"; \
	  echo ""; \
	  echo "  Готовый .ipa лежит здесь: $(IPA_DIR)"; \
	  exit 1; \
	fi; \
	ipa=$$(ls $(IPA_DIR)/*.ipa 2>/dev/null | head -1); \
	[ -n "$$ipa" ] || { echo "✗ .ipa не найден в $(IPA_DIR). Сначала: make build-ipa"; exit 1; }; \
	echo "→ Заливаю $$ipa в TestFlight…"; \
	xcrun altool --upload-app -f "$$ipa" -t ios --apiKey "$$key" --apiIssuer "$$issuer"; \
	echo ""; \
	echo "✅ 2Life $(APP_VERSION) ($(BUILD_NUM)) ушёл в TestFlight."; \
	echo "   Обработка занимает 5–15 минут, потом сборка появится в App Store Connect."
