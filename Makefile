# 2Life · мобильное приложение.
# Единственная точка входа: всё, что делают с проектом, вызывается через make.
# Скрипты в package.json — реализация; помнить их наизусть не нужно.

NPM ?= npm

.DEFAULT_GOAL := help
.PHONY: help setup install hooks start ios android web lint lint-fix format \
        format-check typecheck test test-watch check doctor prebuild clean reset

help: ## Показать список команд
	@grep -hE '^[a-z][a-zA-Z_-]*:.*?## ' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

setup: install hooks ## Первый запуск проекта: зависимости и git-хуки
	@echo "Готово. Дальше — make ios или make start."

install: ## Поставить зависимости строго по package-lock.json
	$(NPM) ci

hooks: ## Включить git-хуки из .githooks
	git config core.hooksPath .githooks

start: ## Dev-сервер Expo (выбор платформы в терминале)
	$(NPM) run start

ios: ## Запустить на iOS-симуляторе
	$(NPM) run ios

android: ## Запустить на Android-эмуляторе
	$(NPM) run android

web: ## Открыть веб-версию — быстрый способ посмотреть вёрстку
	$(NPM) run web

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

prebuild: ## Сгенерировать нативные проекты ios/ и android/
	npx expo prebuild --clean

clean: ## Убрать сборочный мусор
	rm -rf .expo dist coverage

reset: clean ## Снести node_modules и поставить заново
	rm -rf node_modules
	$(NPM) install
