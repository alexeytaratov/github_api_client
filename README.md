# GitHub Repository Analyzer

Инструмент для анализа репозиториев GitHub через API

## Функционал

- Получение основной информации о репозитории:
  - Название
  - URL
  - Описание
  - Количество звезд
- Поиск по коммитам:
  - Поиск по фразе
  - Отображение хеша коммита, автора, даты и сообщения
- Статистика по задачам (issues):
  - Количество открытых и закрытых задач по меткам
- График активности коммитов:
  - Группировка по дням, неделям, месяцам или годам
  - Фильтрация по датам

## Технологии

- Python 3
- Flask (веб-сервер)
- GitHub REST API
- Chart.js (визуализация графиков)
- Docker (контейнеризация)

## Структура проекта

```
github-repo-analyzer/
├── app.py                # Основное Flask-приложение
├── templates/
│   └── index.html        # HTML шаблон
├── static/
│   └── style.css         # Стили CSS
├── Dockerfile            # Конфигурация Docker
├── docker-compose.yml    # Конфигурация Docker Compose
├── requirements.txt      # Зависимости Python
└── README.md             # Документация
```

## Установка и запуск

### Вариант 1: С помощью Docker (рекомендуется)

1. Установите Docker и Docker Compose
2. Клонируйте репозиторий
3. Выполните команду:
   ```bash
   docker-compose up -d
Откройте в браузере: http://localhost:5000

Для запуска с Docker:

```bash
docker-compose up -d
```

Приложение будет доступно по адресу http://localhost:5000

Для остановки:

```bash
docker-compose down
```

Для локального запуска без Docker:

```bash
pip install -r requirements.txt
python app.py
