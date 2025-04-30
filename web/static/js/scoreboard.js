/**
 * 记分板功能
 */

// 当前选择的组别
let currentGroup = '';

// 当前记分板数据
let scoreboardData = null;

// 比赛状态
let contestStatus = '';

// 倒计时定时器
let timerInterval = null;

// 初始化页面
document.addEventListener('DOMContentLoaded', function() {
    // 获取比赛状态
    contestStatus = contestInfo.currentStatus;
    
    // 加载记分板数据
    loadScoreboardData();
    
    // 设置组别筛选事件
    setupGroupFilter();
    
    // 设置刷新按钮事件
    document.getElementById('refreshBtn').addEventListener('click', function() {
        loadScoreboardData();
        showNotification('记分板已刷新', 'success');
    });
    
    // 启动计时器
    startTimer();
});

// 加载记分板数据
function loadScoreboardData() {
    const url = `/api/scoreboard/${contestInfo.id}${currentGroup ? `?group=${currentGroup}` : ''}`;
    
    console.log('正在请求记分板数据, URL:', url);
    
    fetch(url)
        .then(response => {
            console.log('记分板API响应状态:', response.status);
            if (!response.ok) {
                throw new Error(`无法获取记分板数据, 状态码: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('获取到记分板数据:', data);
            if (!data || !data.results || !data.contest) {
                console.error('获取的记分板数据格式不正确:', data);
                showErrorMessage('获取记分板数据失败，返回的数据格式不正确');
                return;
            }
            scoreboardData = data;
            renderScoreboard(data);
        })
        .catch(error => {
            console.error('获取记分板数据失败:', error);
            showErrorMessage('获取记分板数据失败: ' + error.message);
        });
}

// 渲染记分板
function renderScoreboard(data) {
    const tableBody = document.getElementById('scoreboard-body');
    tableBody.innerHTML = '';
    
    const results = data.results;
    const problemIds = data.contest.problem_ids;
    
    if (results.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="${problemIds.length + 4}" class="text-center py-5">
                    暂无数据
                </td>
            </tr>
        `;
        return;
    }
    
    results.forEach(result => {
        const row = document.createElement('tr');
        row.className = 'scoreboard-row';
        
        // 排名
        const rankCell = document.createElement('td');
        rankCell.className = 'text-center';
        rankCell.textContent = result.rank;
        row.appendChild(rankCell);
        
        // 队伍信息
        const teamCell = document.createElement('td');
        const teamName = document.createElement('div');
        teamName.className = 'fw-bold';
        teamName.textContent = result.team.name;
        
        const teamOrg = document.createElement('div');
        teamOrg.className = 'small text-muted';
        teamOrg.textContent = result.team.organization;
        
        // 添加队伍标签
        if (result.team.undergraduate) {
            const badge = document.createElement('span');
            badge.className = 'team-badge team-badge-undergrad';
            badge.textContent = '本科';
            teamName.appendChild(badge);
        }
        
        if (result.team.girl) {
            const badge = document.createElement('span');
            badge.className = 'team-badge team-badge-girl';
            badge.textContent = '女队';
            teamName.appendChild(badge);
        }
        
        if (result.team.vocational) {
            const badge = document.createElement('span');
            badge.className = 'team-badge team-badge-vocational';
            badge.textContent = '高职';
            teamName.appendChild(badge);
        }
        
        teamCell.appendChild(teamName);
        teamCell.appendChild(teamOrg);
        row.appendChild(teamCell);
        
        // 解题数
        const scoreCell = document.createElement('td');
        scoreCell.className = 'text-center fw-bold';
        scoreCell.textContent = result.score;
        row.appendChild(scoreCell);
        
        // 罚时
        const timeCell = document.createElement('td');
        timeCell.className = 'text-center';
        timeCell.textContent = formatDuration(result.total_time);
        row.appendChild(timeCell);
        
        // 题目状态
        problemIds.forEach(problemId => {
            const problemCell = document.createElement('td');
            problemCell.className = 'problem-cell';
            
            const problemResult = result.problem_results[problemId];
            
            if (problemResult) {
                if (problemResult.solved) {
                    // 题目已解决
                    problemCell.classList.add('problem-solved');
                    if (problemResult.first_to_solve) {
                        problemCell.classList.add('problem-first-to-solve');
                    }
                    
                    const attempts = problemResult.attempts > 0 ? 
                        `<div class="small">(-${problemResult.attempts})</div>` : '';
                    
                    problemCell.innerHTML = `
                        <div>${formatDuration(problemResult.solved_time)}</div>
                        ${attempts}
                    `;
                } else if (problemResult.attempts > 0) {
                    // 尝试但未解决
                    problemCell.classList.add('problem-failed');
                    problemCell.innerHTML = `<div>-${problemResult.attempts}</div>`;
                    
                    // 如果有待定提交
                    if (problemResult.is_frozen && problemResult.pending_attempts > 0) {
                        problemCell.classList.add('problem-pending');
                        problemCell.innerHTML += `<div class="small">+${problemResult.pending_attempts}</div>`;
                    }
                } else if (problemResult.is_frozen && problemResult.pending_attempts > 0) {
                    // 仅有待定提交
                    problemCell.classList.add('problem-pending');
                    problemCell.innerHTML = `<div>+${problemResult.pending_attempts}</div>`;
                }
            }
            
            row.appendChild(problemCell);
        });
        
        tableBody.appendChild(row);
    });
}

// 设置组别筛选
function setupGroupFilter() {
    const dropdownItems = document.querySelectorAll('.dropdown-menu .dropdown-item');
    
    dropdownItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            
            // 移除所有active类
            dropdownItems.forEach(i => i.classList.remove('active'));
            
            // 添加active类到当前项
            this.classList.add('active');
            
            // 更新当前组别
            currentGroup = this.getAttribute('data-group');
            
            // 重新加载数据
            loadScoreboardData();
            
            // 更新下拉按钮文本
            const groupText = currentGroup ? this.textContent : '筛选组别';
            document.getElementById('groupDropdown').textContent = groupText;
        });
    });
}

// 开始计时器
function startTimer() {
    // 清除现有定时器
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    
    // 更新时间显示
    updateTimeDisplay();
    
    // 设置定时器每秒更新一次
    timerInterval = setInterval(updateTimeDisplay, 1000);
}

// 更新时间显示
function updateTimeDisplay() {
    const now = getCurrentTimestamp();
    
    // 计算剩余时间和已用时间
    const remainingTime = contestInfo.endTime - now;
    const elapsedTime = now - contestInfo.startTime;
    
    // 更新显示
    document.getElementById('remaining-time').textContent = formatDuration(Math.max(0, remainingTime));
    document.getElementById('elapsed-time').textContent = formatDuration(Math.max(0, elapsedTime));
    
    // 更新比赛状态
    let status = '';
    if (now < contestInfo.startTime) {
        status = '未开始';
    } else if (now > contestInfo.endTime) {
        status = '已结束';
    } else {
        status = '进行中';
    }
    
    document.getElementById('contest-status').textContent = status;
    
    // 如果比赛状态发生变化，重新加载数据
    if (status !== contestStatus) {
        contestStatus = status;
        loadScoreboardData();
    }
}

// 显示错误信息
function showErrorMessage(message) {
    const tableBody = document.getElementById('scoreboard-body');
    tableBody.innerHTML = `
        <tr>
            <td colspan="100" class="text-center py-5">
                <div class="alert alert-danger mb-0">
                    <i class="bi bi-exclamation-triangle-fill me-2"></i> ${message}
                </div>
                <button class="btn btn-primary mt-3" id="retryBtn">重试</button>
            </td>
        </tr>
    `;
    
    // 添加重试按钮事件
    document.getElementById('retryBtn').addEventListener('click', () => {
        tableBody.innerHTML = `
            <tr>
                <td colspan="100" class="text-center py-5">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">加载中...</span>
                    </div>
                    <p class="mt-2">正在加载记分板数据...</p>
                </td>
            </tr>
        `;
        loadScoreboardData();
    });
} 