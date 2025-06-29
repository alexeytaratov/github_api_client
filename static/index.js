function showLoader(buttonId) {
    const btn = document.getElementById(buttonId);
    btn.querySelector('.spinner').classList.remove('hidden');
    btn.querySelector('.btn-text').classList.add('hidden');
    btn.disabled = true;
}

function hideLoader(buttonId) {
    const btn = document.getElementById(buttonId);
    btn.querySelector('.spinner').classList.add('hidden');
    btn.querySelector('.btn-text').classList.remove('hidden');
    btn.disabled = false;
}

function showError(elementId, message) {
    document.getElementById(elementId).innerHTML = `
        <div class="error">
            <svg viewBox="0 0 24 24" width="24" height="24">
                <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
            <span>${message}</span>
        </div>`;
}

function clearResults(elementId) {
    document.getElementById(elementId).innerHTML = '';
}

function highlightText(text, phrase) {
    if (!phrase) return text;
    const regex = new RegExp(phrase, 'gi');
    return text.replace(regex, match => `<span class="highlight">${match}</span>`);
}

document.getElementById('repoForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const repoUrl = document.getElementById('repoUrl').value.trim();
    showLoader('repoForm');
    clearResults('repoInfo');

    try {
        const response = await fetch('/get_repo_info', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `repo_url=${encodeURIComponent(repoUrl)}`
        });

        const data = await response.json();

        if (!response.ok) {
            showError('repoInfo', data.error || 'Ошибка запроса');
            return;
        }

        document.getElementById('repoInfo').innerHTML = `
            <div class="repo-info">
                <h3>${data.name}</h3>
                <p class="repo-description">${data.description}</p>
                <div class="repo-stats">⭐ ${data.stars} звезд</div>
                <a href="${data.url}" target="_blank" class="repo-link">Открыть в GitHub</a>
            </div>`;
    } catch (error) {
        showError('repoInfo', 'Ошибка сервера');
    } finally {
        hideLoader('repoForm');
    }
});

document.getElementById('searchPhrase').addEventListener('input', function () {
    document.getElementById('searchCommitsBtn').disabled = this.value.trim() === '';
});

async function fetchCommits(searchPhrase = null) {
    const repoUrl = document.getElementById('repoUrl').value.trim();
    const buttonId = searchPhrase ? 'searchCommitsBtn' : 'showAllCommitsBtn';

    if (!repoUrl) {
        alert('Пожалуйста, сначала введите URL репозитория');
        return;
    }

    showLoader(buttonId);
    clearResults('commitResults');

    try {
        const response = await fetch('/search_commits', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `repo_url=${encodeURIComponent(repoUrl)}${searchPhrase ? `&search_phrase=${encodeURIComponent(searchPhrase)}` : ''}`
        });

        const data = await response.json();

        if (!response.ok) {
            showError('commitResults', data.error || 'Ошибка поиска');
            return;
        }

        if (data.commits.length === 0) {
            document.getElementById('commitResults').innerHTML = `<div class="info"><p>Коммиты не найдены</p></div>`;
            return;
        }

        let html = `<div class="commits-header"><h3>${searchPhrase ? `Результаты поиска: "${searchPhrase}"` : 'Последние коммиты'}</h3><span class="badge">${data.commits.length} коммитов</span></div><div class="commits-list">`;

        data.commits.forEach(commit => {
            const highlightedMessage = highlightText(commit.message, searchPhrase);
            html += `
            <div class="commit-item">
                <div class="commit-meta">
                    <span class="commit-sha"><a href="${commit.url}" target="_blank">${commit.sha}</a></span>
                    <span class="commit-author">${commit.author}</span>
                    <span class="commit-date">${commit.date}</span>
                </div>
                <div class="commit-message">${highlightedMessage}</div>
            </div>`;
        });

        html += '</div>';
        document.getElementById('commitResults').innerHTML = html;
    } catch (error) {
        showError('commitResults', 'Ошибка сервера');
    } finally {
        hideLoader(buttonId);
    }
}

document.getElementById('searchCommitsBtn').addEventListener('click', async (e) => {
    e.preventDefault();
    const searchPhrase = document.getElementById('searchPhrase').value.trim();
    if (searchPhrase) {
        await fetchCommits(searchPhrase);
    }
});

document.getElementById('showAllCommitsBtn').addEventListener('click', async (e) => {
    e.preventDefault();
    await fetchCommits();
});

document.getElementById('getIssuesStatsBtn').addEventListener('click', async (e) => {
    e.preventDefault();
    const repoUrl = document.getElementById('repoUrl').value.trim();
    const statsContainer = document.getElementById('issuesStats');

    if (!repoUrl) {
        alert('Пожалуйста, сначала введите URL репозитория');
        return;
    }

    showLoader('getIssuesStatsBtn');
    clearResults('issuesStats');

    try {
        const response = await fetch('/get_issues_stats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `repo_url=${encodeURIComponent(repoUrl)}`
        });

        const data = await response.json();

        if (!response.ok) {
            showError('issuesStats', data.error || 'Ошибка запроса');
            return;
        }

        if (!data.labels || Object.keys(data.labels).length === 0) {
            statsContainer.innerHTML = `<div class="info"><p>Задачи или метки не найдены</p></div>`;
            return;
        }

        let html = `<div class="stats-header"><h3>Статистика по меткам</h3></div><div class="stats-list"><table><thead><tr><th>Метка</th><th>Открыто</th><th>Закрыто</th><th>Всего</th></tr></thead><tbody>`;

        for (const [label, counts] of Object.entries(data.labels)) {
            const total = counts.open + counts.closed;
            html += `<tr><td>${label === 'no-label' ? 'Без метки' : label}</td><td>${counts.open}</td><td>${counts.closed}</td><td>${total}</td></tr>`;
        }

        html += '</tbody></table></div>';
        statsContainer.innerHTML = html;
    } catch (error) {
        showError('issuesStats', 'Ошибка сервера');
    } finally {
        hideLoader('getIssuesStatsBtn');
    }
});

let chartInstance = null;
document.getElementById('drawChartBtn').addEventListener('click', async () => {
    const repoUrl = document.getElementById('repoUrl').value.trim();
    const groupBy = document.getElementById('groupBy').value;
    const dateFrom = document.getElementById('dateFrom').value;
    const dateTo = document.getElementById('dateTo').value;

    if (!repoUrl) {
        alert('Пожалуйста, сначала введите URL репозитория');
        return;
    }

    try {
        const response = await fetch('/get_commit_frequency', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `repo_url=${encodeURIComponent(repoUrl)}&group_by=${groupBy}&date_from=${dateFrom}&date_to=${dateTo}`
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.error || 'Ошибка получения данных');
            return;
        }

        const labels = Object.keys(data);
        const values = Object.values(data);

        if (chartInstance) chartInstance.destroy();

        const ctx = document.getElementById('commitChart').getContext('2d');
        chartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Коммиты',
                    data: values,
                    backgroundColor: '#4CAF50'
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false },
                    title: {
                        display: true,
                        text: `Коммиты сгруппированы по ${groupBy === 'day' ? 'дням' : groupBy === 'week' ? 'неделям' : groupBy === 'month' ? 'месяцам' : 'годам'}`
                    }
                },
                scales: {
                    x: {
                        ticks: { maxRotation: 90, minRotation: 45 },
                        title: { display: true, text: groupBy === 'day' ? 'День' : groupBy === 'week' ? 'Неделя' : groupBy === 'month' ? 'Месяц' : 'Год' }
                    },
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Количество коммитов' }
                    }
                }
            }
        });
    } catch (err) {
        alert('Ошибка построения графика');
    }
});