# Базовый образ Python
FROM python:3.9-slim

# Установка рабочей директории
WORKDIR /app

# Копирование файлов зависимостей
COPY requirements.txt .

# Установка зависимостей
RUN pip install --no-cache-dir -r requirements.txt

# Копирование всех файлов проекта
COPY . .

# Открытие порта
EXPOSE 5000

# Команда запуска приложения
CMD ["python", "app.py"]