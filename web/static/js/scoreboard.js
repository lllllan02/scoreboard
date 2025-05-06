/**
 * 记分板功能
 */
console.log('记分板脚本加载成功 - 版本2 - 队名和学校分离');

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
    // 添加五角星样式
    const style = document.createElement('style');
    style.textContent = `
        .team-badge-star {
            display: inline-block;
            margin-left: 5px;
            font-size: 0.9em;
            color: gold;
            text-shadow: 0 0 1px #000;
            animation: star-pulse 1.5s infinite alternate;
        }
        
        @keyframes star-pulse {
            from { opacity: 0.7; }
            to { opacity: 1; transform: scale(1.2); }
        }
    `;
    document.head.appendChild(style);
    
    // 启动计时器（会立即调用updateTimeDisplay更新比赛状态）
    startTimer();
    
    // 加载记分板数据（由于已经通过updateTimeDisplay设置了contestStatus，不会导致重复加载）
    loadScoreboardData();
    
    // 设置组别筛选事件
    setupGroupFilter();
    
    // 设置刷新按钮事件
    document.getElementById('refreshBtn').addEventListener('click', function() {
        loadScoreboardData();
        showNotification('记分板已刷新', 'success');
    });
});

// 根据背景色计算合适的文字颜色（黑色或白色）
function getContrastColor(backgroundColor) {
    // 如果未提供背景色，返回黑色
    if (!backgroundColor) return '#000000';
    
    // 将背景色格式标准化为RGB
    let color = backgroundColor.toLowerCase();
    let rgb = [];
    
    // 处理十六进制颜色
    if (color.startsWith('#')) {
        color = color.substring(1);
        
        // 处理简写形式 (#RGB)
        if (color.length === 3) {
            color = color[0] + color[0] + color[1] + color[1] + color[2] + color[2];
        }
        
        rgb = [
            parseInt(color.substring(0, 2), 16),
            parseInt(color.substring(2, 4), 16),
            parseInt(color.substring(4, 6), 16)
        ];
    }
    // 处理rgb格式
    else if (color.startsWith('rgb')) {
        const matches = color.match(/(\d+),\s*(\d+),\s*(\d+)/);
        if (matches) {
            rgb = [
                parseInt(matches[1]),
                parseInt(matches[2]),
                parseInt(matches[3])
            ];
        } else {
            return '#000000';  // 默认黑色
        }
    }
    // 无法解析的颜色，返回黑色
    else {
        return '#000000';
    }
    
    // 使用更精确的灰度级别计算公式
    // grayLevel = R * 0.299 + G * 0.587 + B * 0.114
    const grayLevel = rgb[0] * 0.299 + rgb[1] * 0.587 + rgb[2] * 0.114;

    // 如果灰度级别低于192，文字使用白色，否则使用黑色
    return grayLevel < 192 ? '#FFFFFF' : '#000000';
}

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
    console.log('开始渲染记分板，分离队名和学校');
    
    const tableBody = document.getElementById('scoreboard-body');
    tableBody.innerHTML = '';
    
    const results = data.results;
    const problemIds = data.contest.problem_id;
    // 获取气球颜色配置
    const balloonColors = data.contest.balloon_color || [];
    
    // 用于跟踪已经显示了排名的学校
    const displayedSchoolRanks = new Set();
    
    if (results.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="${problemIds.length + 5}" class="text-center py-5">
                    暂无数据
                </td>
            </tr>
        `;
        console.log('记分板无数据');
        return;
    }
    
    console.log(`准备渲染 ${results.length} 支队伍，学校和队名分离版本`);
    
    // 统计每题的通过数量
    const problemStatsMap = calculateProblemStats(results, problemIds);
    
    // 更新表头题目的颜色和通过数量
    updateProblemColumnStyles(problemIds, balloonColors, problemStatsMap);
    
    results.forEach(result => {
        const row = document.createElement('tr');
        row.className = 'scoreboard-row';
        
        // 排名
        const rankCell = document.createElement('td');
        rankCell.className = 'text-center';
        rankCell.textContent = result.rank;
        row.appendChild(rankCell);
        
        // 学校信息
        const schoolCell = document.createElement('td');
        schoolCell.className = 'text-center position-relative';
        schoolCell.textContent = result.team.organization;
        
        // 只在学校第一次出现时添加学校排名
        const schoolName = result.team.organization;
        if (result.school_rank && !displayedSchoolRanks.has(schoolName)) {
            // 创建包含排名的容器，使用绝对定位
            const rankSpan = document.createElement('span');
            rankSpan.className = 'position-absolute';
            rankSpan.style.left = '8px';  // 靠左边距
            rankSpan.style.top = '50%';
            rankSpan.style.transform = 'translateY(-50%)';  // 垂直居中
            rankSpan.style.fontSize = '0.85em';  // 字体更小
            rankSpan.style.color = '#666';  // 灰色，不那么显眼
            rankSpan.textContent = result.school_rank;
            
            schoolCell.appendChild(rankSpan);
            
            // 记录这个学校已经显示过排名
            displayedSchoolRanks.add(schoolName);
        }
        
        console.log(`创建学校单元格：${result.team.organization}`);
        row.appendChild(schoolCell);
        
        // 队伍名称
        const teamCell = document.createElement('td');
        teamCell.className = 'text-center';
        
        const teamName = document.createElement('div');
        teamName.textContent = result.team.name;
        
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
        
        // 检查是否为打星队伍（unofficial组）
        if (result.team.group && result.team.group.includes('unofficial')) {
            const starBadge = document.createElement('span');
            starBadge.className = 'team-badge team-badge-star';
            starBadge.innerHTML = '★'; // 使用五角星符号
            starBadge.title = '打星队伍';
            teamName.appendChild(starBadge);
        }
        
        teamCell.appendChild(teamName);
        row.appendChild(teamCell);
        
        // 解题数
        const scoreCell = document.createElement('td');
        scoreCell.className = 'text-center fw-bold';
        scoreCell.textContent = result.score;
        row.appendChild(scoreCell);
        
        // 罚时
        const timeCell = document.createElement('td');
        timeCell.className = 'text-center';
        // 后端已经将罚时转换为分钟，直接显示数字
        timeCell.textContent = result.total_time;
        row.appendChild(timeCell);
        
        // 题目状态
        problemIds.forEach((problemId, index) => {
            const problemCell = document.createElement('td');
            problemCell.className = 'problem-cell text-center';
            
            const problemResult = result.problem_results[problemId];
            
            if (problemResult) {
                if (problemResult.solved) {
                    // 题目已解决，显示为 + 提交次数/通过时间
                    problemCell.classList.add('problem-solved');
                    if (problemResult.first_to_solve) {
                        problemCell.classList.add('problem-first-to-solve');
                    }
                    
                    // 计算总提交次数 = 错误尝试 + 1次正确
                    const totalAttempts = problemResult.attempts + 1;
                    // 获取通过时间（后端已经以分钟为单位返回）
                    const solvedTimeMinutes = problemResult.solved_time;
                    
                    // 新的格式: + 1/分钟数
                    problemCell.innerHTML = `
                        <div class="result-status">+</div>
                        <div class="result-details">1/${solvedTimeMinutes}</div>
                    `;
                } else if (problemResult.attempts > 0) {
                    // 尝试但未解决，显示为 - 提交次数
                    problemCell.classList.add('problem-failed');
                    
                    // 如果有待定提交
                    if (problemResult.is_frozen && problemResult.pending_attempts > 0) {
                        problemCell.classList.add('problem-pending');
                        // 使用问号显示有冻结提交的情况
                        problemCell.innerHTML = `
                            <div class="result-status">?</div>
                            <div class="result-details">${problemResult.attempts}+${problemResult.pending_attempts}</div>
                        `;
                    } else {
                        problemCell.innerHTML = `
                            <div class="result-status">-</div>
                            <div class="result-details">${problemResult.attempts}</div>
                        `;
                    }
                } else if (problemResult.is_frozen && problemResult.pending_attempts > 0) {
                    // 仅有待定提交
                    problemCell.classList.add('problem-pending');
                    problemCell.innerHTML = `
                        <div class="result-status">?</div>
                        <div class="result-details">${problemResult.pending_attempts}</div>
                    `;
                }
            }
            
            row.appendChild(problemCell);
        });
        
        tableBody.appendChild(row);
    });
}

// 统计每道题目的通过数量
function calculateProblemStats(results, problemIds) {
    const statsMap = {};
    
    // 初始化每题的通过数量为0
    problemIds.forEach(problemId => {
        statsMap[problemId] = {
            solvedCount: 0,
            totalAttempts: 0,
            teams: results.length
        };
    });
    
    // 统计各题目的通过情况
    results.forEach(result => {
        problemIds.forEach(problemId => {
            const problemResult = result.problem_results[problemId];
            if (problemResult) {
                if (problemResult.solved) {
                    statsMap[problemId].solvedCount++;
                }
                statsMap[problemId].totalAttempts += problemResult.attempts + 
                    (problemResult.is_frozen ? problemResult.pending_attempts : 0);
            }
        });
    });
    
    return statsMap;
}

// 更新表头题目的颜色样式
function updateProblemColumnStyles(problemIds, balloonColors, problemStatsMap) {
    const headerRow = document.querySelector('#scoreboard-table thead tr');
    if (!headerRow) return;
    
    // 从第6个单元格开始是题目列（前5个是排名、学校、队伍、解题数、罚时）
    const problemColumns = headerRow.querySelectorAll('th.problem-column');
    
    problemColumns.forEach((column, index) => {
        const problemId = problemIds[index];
        const balloonColor = balloonColors[index] || {};
        const problemStats = problemStatsMap ? problemStatsMap[problemId] : null;
        
        // 更新表头内容，只添加通过数量
        if (problemStats) {
            const solvedCount = problemStats.solvedCount;
            
            // 创建新的表头内容，只显示题号和通过数量
            column.innerHTML = `
                <div>${problemId}</div>
                <div class="small problem-stats">${solvedCount}</div>
            `;
        }
        
        if (balloonColor.background_color) {
            // 使用灰度级别公式判断文字颜色
            const textColor = getContrastColor(balloonColor.background_color);
            
            // 构建样式字符串
            let styleString = `background-color: ${balloonColor.background_color} !important;`;
            
            // 如果后端明确指定了文字颜色，优先使用后端指定的，否则使用自动计算的对比色
            styleString += ` color: ${textColor} !important;`;
            
            // 一次性设置样式，避免多次覆盖
            column.setAttribute('style', styleString);
            
            // 添加调试信息
            console.log(`题目 ${problemIds[index]}: 背景色=${balloonColor.background_color}, 文字颜色=${textColor}, 最终颜色=${column.style.color}`);
        }
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
    
    // 计算剩余时间和已用时间（秒）
    const remainingTime = contestInfo.endTime - now;
    const elapsedTime = now - contestInfo.startTime;
    
    // 更新显示 - 这里仍使用时分秒格式
    document.getElementById('remaining-time').textContent = formatTimerDuration(Math.max(0, remainingTime));
    document.getElementById('elapsed-time').textContent = formatTimerDuration(Math.max(0, elapsedTime));
    
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
    
    // 记录首次调用时的状态，或检查状态是否变化并重新加载数据
    if (contestStatus === '') {
        // 首次调用时仅设置状态，不加载数据
        contestStatus = status;
    } else if (status !== contestStatus) {
        // 状态变化时更新状态并重新加载数据
        contestStatus = status;
        loadScoreboardData();
    }
}

// 格式化计时器时间为时:分:秒格式
function formatTimerDuration(seconds) {
    if (seconds < 0) {
        return "0:00:00";
    }
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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