from flask import Flask, render_template, request, jsonify
import requests
from urllib.parse import urlparse
from datetime import datetime, timezone
from dateutil.parser import parse
from collections import defaultdict


app = Flask(__name__)
GITHUB_HEADERS = {
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28'
}

# Извлекает владельца и название репозитория из URL.
def parse_repo_url(repo_url):
    path = urlparse(repo_url).path.strip('/').split('/')
    if len(path) < 2:
        raise ValueError("Некорректный URL репозитория")
    return path[0], path[1]

# Обрабатывает ошибки API GitHub.
def handle_github_error(response):
    return jsonify({'error': response.json().get('message', 'Неизвестная ошибка')}), 400

# Получает данные из API GitHub.
def fetch_github_data(url, params=None):
    try:
        response = requests.get(url, headers=GITHUB_HEADERS, params=params)
        if response.status_code == 404:
            return handle_github_error(response)
        return response if response.status_code == 200 else None
    except requests.exceptions.RequestException as e:
        print(f"Ошибка запроса: {e}")
        return None

# Отображает главную страницу.
@app.route('/')
def index():
    return render_template('index.html')

# Получает основную информацию о репозитории.
@app.route("/get_repo_info", methods=["POST"])
def get_repo_info():
    repo_url = request.form.get("repo_url")
    if not repo_url:
        return jsonify({"error": "Необходимо указать URL репозитория"}), 400
    try:
        owner, repo = parse_repo_url(repo_url)
        response = fetch_github_data(f"https://api.github.com/repos/{owner}/{repo}")
        if isinstance(response, tuple):
            return response
        if not response:
            return jsonify({"error": "Не удалось получить данные"}), 500
        data = response.json()
        return jsonify(
            {
                "name": data["name"],
                "description": data.get("description", "Нет описания"),
                "stars": data["stargazers_count"],
                "url": data["html_url"],
            }
        )
    except Exception as e:
        return jsonify({"error": f"Ошибка: {str(e)}"}), 500

# Ищет коммиты в репозитории.
@app.route('/search_commits', methods=['POST'])
def search_commits():
    repo_url = request.form.get('repo_url')
    search_phrase = request.form.get('search_phrase')
    if not repo_url:
        return jsonify({'error': 'Необходимо указать URL репозитория'}), 400
    try:
        owner, repo = parse_repo_url(repo_url)
        if search_phrase:
            # Search API для поиска коммитов
            response = fetch_github_data(
                f'https://api.github.com/search/commits?q=repo:{owner}/{repo}+{search_phrase}',
                {'per_page': 100}
            )
            commits = response.json().get('items', []) if response else []
        else:
            # Обычный запрос коммитов, если нет поисковой фразы
            response = fetch_github_data(
                f'https://api.github.com/repos/{owner}/{repo}/commits',
                {'per_page': 100}
            )
            commits = response.json() if response else []
        formatted = []
        for commit in commits[:100]:  # Ограничение 100 коммитами
            commit_data = commit.get('commit', {})
            author_data = commit_data.get('author', {})
            formatted.append({
                'sha': commit.get('sha', '')[:7],
                'message': commit_data.get('message', ''),
                'author': author_data.get('name', 'Неизвестен'),
                'date': parse(author_data.get('date')).strftime('%Y-%m-%d %H:%M:%S') 
                if author_data.get('date') else '',
                'url': commit.get('html_url', '')
            })
        return jsonify({'commits': formatted})
    except Exception as e:
        return jsonify({'error': f'Ошибка: {str(e)}'}), 500

# Фильтрует pull requests из списка issues.
def process_issues(issues):
    return [issue for issue in issues if 'pull_request' not in issue]

# Получает статистику по issues репозитория.
@app.route('/get_issues_stats', methods=['POST'])
def get_issues_stats():
    repo_url = request.form.get('repo_url')
    if not repo_url:
        return jsonify({'error': 'Необходимо указать URL репозитория'}), 400
    try:
        owner, repo = parse_repo_url(repo_url)
        labels_stats = defaultdict(lambda: {'open': 0, 'closed': 0})
        for state in ['open', 'closed']:
            response = fetch_github_data(
                f'https://api.github.com/repos/{owner}/{repo}/issues',
                {'state': state, 'per_page': 100}
            )
            if not response:
                return handle_github_error(response)
            for issue in process_issues(response.json()):
                labels = issue.get('labels', [])
                key = 'без метки' if not labels else labels[0]['name']
                labels_stats[key][state] += 1
        return jsonify({'labels': labels_stats})
    except Exception as e:
        return jsonify({'error': f'Ошибка: {str(e)}'}), 500

# Анализирует частоту коммитов.
@app.route('/get_commit_frequency', methods=['POST'])
def get_commit_frequency():
    repo_url = request.form.get('repo_url')
    if not repo_url:
        return jsonify({'error': 'Необходимо указать URL репозитория'}), 400
    try:
        owner, repo = parse_repo_url(repo_url)
        group_by = request.form.get('group_by', 'day')
        try:
            date_from = (
                parse(request.form.get('date_from')).astimezone(timezone.utc)
                if request.form.get('date_from')
                else datetime.min.replace(tzinfo=timezone.utc)
            )
            date_to = (
                parse(request.form.get('date_to')).astimezone(timezone.utc)
                if request.form.get('date_to')
                else datetime.now(timezone.utc)
            )
        except Exception:
            date_from = datetime.min.replace(tzinfo=timezone.utc)
            date_to = datetime.now(timezone.utc) 
        frequency = defaultdict(int)
        page = 1
        while True:
            response = fetch_github_data(
                f'https://api.github.com/repos/{owner}/{repo}/commits',
                {'page': page, 'per_page': 100}
            )
            if not response:
                return handle_github_error(response)
            commits = response.json()
            if not commits:
                break
            for commit in commits:
                commit_data = commit.get('commit', {})
                date_str = (
                    commit_data.get('author', {}).get('date') or
                    commit_data.get('committer', {}).get('date')
                )
                if not date_str:
                    continue
                try:
                    date_obj = parse(date_str).astimezone(timezone.utc)
                    if not (date_from <= date_obj <= date_to):
                        continue
                except Exception:
                    continue
                if group_by == 'week':
                    key = f"{date_obj.strftime('%Y')}-W{date_obj.isocalendar()[1]}"
                elif group_by == 'month':
                    key = date_obj.strftime('%Y-%m')
                elif group_by == 'year':
                    key = date_obj.strftime('%Y')
                else:
                    key = date_obj.strftime('%Y-%m-%d')
                frequency[key] += 1
            page += 1
        return jsonify(dict(sorted(frequency.items())))
    except Exception as e:
        return jsonify({'error': f'Ошибка: {str(e)}'}), 500


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)