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
