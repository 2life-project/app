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
# Локально, без облака: xcodebuild archive → export с загрузкой в TestFlight.
# Версия и номер сборки живут в app.json — единственный источник правды,
# перед сборкой они синкаются в нативный проект.
#
#   make build-ipa ENV=prod     собрать и залить в TestFlight
#   make build-ipa UPLOAD=0     только собрать .ipa, никуда не отправляя
#   make set-build N=2          поднять номер сборки
#
# Загружает сам Xcode учётной записью, которая в нём уже вошла: ни ключей, ни
# паролей в терминале и в репозитории. Подпись автоматическая,
# `-allowProvisioningUpdates` сам заводит и обновляет профиль.

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

# Куда девать собранное: upload — сразу в TestFlight, export — .ipa на диск.
UPLOAD      ?= 1
DESTINATION := $(if $(filter 1,$(UPLOAD)),upload,export)

.PHONY: set-build build-ipa

set-build: ## Выставить номер сборки в app.json (N=<число>)
	@[ -n "$(N)" ] || { echo "Использование: make set-build N=<номер сборки>"; exit 1; }
	@node -e "const fs=require('fs'),f='app.json',j=JSON.parse(fs.readFileSync(f));j.expo.ios.buildNumber=String($(N));j.expo.android.versionCode=Number($(N));fs.writeFileSync(f,JSON.stringify(j,null,2)+'\n');console.log('→ номер сборки:',$(N));"

build-ipa: ## Собрать и залить в TestFlight (ENV=prod|staging, UPLOAD=0 — только .ipa)
	@[ -n "$(API_URL)" ] || { echo "✗ Неизвестный контур ENV=$(ENV). Есть: prod, staging"; exit 1; }
	@[ -d ios ] || { echo "✗ Нет каталога ios/. Сначала: make prebuild"; exit 1; }
	@echo ""
	@echo "  2Life $(APP_VERSION) ($(BUILD_NUM)) · контур $(ENV) · $(API_URL)"
	@echo "  Team: $(TEAM_ID) · ветка $$(git rev-parse --abbrev-ref HEAD) · назначение: $(DESTINATION)"
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
	  '  <key>destination</key><string>$(DESTINATION)</string>' \
	  '  <key>teamID</key><string>$(TEAM_ID)</string>' \
	  '  <key>signingStyle</key><string>automatic</string>' \
	  '  <key>stripSwiftSymbols</key><true/>' \
	  '  <key>uploadSymbols</key><true/>' \
	  '  <key>manageAppVersionAndBuildNumber</key><false/>' \
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
	@echo "→ $(if $(filter 1,$(UPLOAD)),Заливаю в TestFlight…,Экспортирую .ipa…)"
	@rm -rf $(IPA_DIR)
	@set -o pipefail; \
	$(UTF8) xcodebuild -exportArchive \
	  -archivePath $(ARCHIVE) -exportPath $(IPA_DIR) \
	  -exportOptionsPlist build/ios/ExportOptions.plist \
	  -allowProvisioningUpdates
	@echo ""
	@if [ "$(UPLOAD)" = "1" ]; then \
	  echo "✅ 2Life $(APP_VERSION) ($(BUILD_NUM)) ушёл в TestFlight."; \
	  echo "   Обработка занимает 5-15 минут, потом сборка появится в App Store Connect."; \
	else \
	  echo "✅ .ipa готов: $(IPA_DIR)"; \
	fi
