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

// 进度条拖动状态
let isDragging = false;
let progressBarWidth = 0;
let contestDuration = 0;

// 初始化页面
document.addEventListener('DOMContentLoaded', function() {
    console.log('初始化页面开始');
    
    // 标记是否已经加载数据，防止重复加载
    window.dataLoaded = false;
    
    // 标记是否正在加载统计数据，防止重复加载
    window.loadingStatistics = false;
    
    // 标记是否正在加载记分板数据，防止重复加载
    window.loadingScoreboard = false;
    
    // 格式化显示开始和结束时间
    formatContestTimes();
    
    // 启动计时器（会调用updateTimeDisplay更新比赛状态）
    // 注意：已修改updateTimeDisplay函数，它会在需要时加载数据
    startTimer();
    
    // 设置组别筛选事件
    setupGroupFilter();
    
    // 设置刷新按钮事件（如果存在）
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            loadScoreboardData();
            showNotification('记分板已刷新', 'success');
        });
    }

    // 设置统计按钮事件
    const statisticsBtn = document.getElementById('statisticsBtn');
    if (statisticsBtn) {
        statisticsBtn.addEventListener('click', function() {
            showStatistics();
        });
        console.log('统计按钮事件已绑定');
    } else {
        console.error('找不到统计按钮元素');
    }

    // 初始化进度条功能
    initProgressBar();
    
    console.log('初始化页面完成');
});

// 格式化显示比赛时间
function formatContestTimes() {
    // 获取开始和结束时间戳（秒）
    const startTime = parseInt(contestInfo.startTime);
    const endTime = parseInt(contestInfo.endTime);
    
    // 格式化为易读的日期时间
    const startFormatted = formatDateTime(startTime);
    const endFormatted = formatDateTime(endTime);
    
    // 更新显示
    document.getElementById('start-time-fmt').textContent = startFormatted;
    document.getElementById('end-time-fmt').textContent = endFormatted;
}

// 格式化为详细日期时间
function formatDateTime(timestamp) {
    const date = new Date(timestamp * 1000);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}`;
}

// 格式化为简短时间格式
function formatShortTime(date) {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    return `${hours}:${minutes}`;
}

// 初始化进度条功能
function initProgressBar() {
    const progressBar = document.getElementById('contest-progress-bar');
    const progressHandle = document.getElementById('progress-handle');
    const progressIndicator = document.getElementById('progress-indicator');
    const progressStatusText = document.getElementById('progress-status-text');

    if (!progressBar || !progressHandle || !progressIndicator) {
        console.log('进度条元素未找到，跳过初始化');
        return;
    }

    // 计算比赛总时长（秒）
    const startTime = parseInt(contestInfo.startTime);
    const endTime = parseInt(contestInfo.endTime);
    contestDuration = endTime - startTime;

    // 设置进度条宽度（用于后续计算）
    progressBarWidth = progressBar.offsetWidth;
    
    // 初始化进度条位置 - 设置为当前时间点
    const now = getCurrentTimestamp();
    const elapsedTime = now - startTime;
    
    if (contestDuration > 0) {
        const progressPercentage = Math.min(100, Math.max(0, (elapsedTime / contestDuration) * 100));
        progressHandle.style.left = `${progressPercentage}%`;
        progressIndicator.style.width = `${progressPercentage}%`;
        console.log('初始化进度条位置：', progressPercentage, '%');
        
        // 初始化时间显示
        updateTimeFromProgress(progressPercentage);
        
        // 初始化状态显示
        if (progressStatusText) {
            progressStatusText.textContent = contestInfo.currentStatus;
        }
    }

    // 鼠标按下事件
    progressHandle.addEventListener('mousedown', function(e) {
        isDragging = true;
        document.body.style.cursor = 'grabbing';
        e.preventDefault(); // 防止选择文本等默认行为
    });

    // 触摸开始事件（移动设备支持）
    progressHandle.addEventListener('touchstart', function(e) {
        isDragging = true;
        e.preventDefault(); // 防止滚动等默认行为
    });

    // 鼠标移动事件（仅在拖动时响应）
    document.addEventListener('mousemove', function(e) {
        if (!isDragging) return;
        
        // 计算相对位置
        const rect = progressBar.getBoundingClientRect();
        let position = e.clientX - rect.left;
        
        // 限制在进度条范围内
        position = Math.max(0, Math.min(position, rect.width));
        
        // 更新拖动手柄位置
        const percentage = position / rect.width * 100;
        progressHandle.style.left = `${percentage}%`;
        progressIndicator.style.width = `${percentage}%`;
        
        // 计算对应时间并更新显示
        updateTimeFromProgress(percentage);
    });

    // 触摸移动事件（移动设备支持）
    document.addEventListener('touchmove', function(e) {
        if (!isDragging) return;
        
        const touch = e.touches[0];
        const rect = progressBar.getBoundingClientRect();
        let position = touch.clientX - rect.left;
        
        // 限制在进度条范围内
        position = Math.max(0, Math.min(position, rect.width));
        
        // 更新拖动手柄位置
        const percentage = position / rect.width * 100;
        progressHandle.style.left = `${percentage}%`;
        progressIndicator.style.width = `${percentage}%`;
        
        // 计算对应时间并更新显示
        updateTimeFromProgress(percentage);
        
        e.preventDefault(); // 防止滚动
    });

    // 鼠标释放事件（停止拖动）
    document.addEventListener('mouseup', function() {
        if (isDragging) {
            isDragging = false;
            document.body.style.cursor = 'default';
            
            // 只在拖动进度条时重新加载数据
            const selectedTime = calculateTimeFromProgress();
            if (selectedTime && Number.isInteger(selectedTime)) {
                console.log(`拖动进度条后加载数据，时间戳: ${selectedTime}`);
                
                // 直接调用loadScoreboardData函数，使用时间戳作为参数
                // 让它来处理请求防重复和错误等逻辑
                loadScoreboardData(selectedTime);
            }
        }
    });

    // 触摸结束事件（移动设备支持）
    document.addEventListener('touchend', function() {
        if (isDragging) {
            isDragging = false;
            
            // 只在拖动进度条时重新加载数据
            const selectedTime = calculateTimeFromProgress();
            if (selectedTime && Number.isInteger(selectedTime)) {
                console.log(`触摸释放后加载数据，时间戳: ${selectedTime}`);
                
                // 直接调用loadScoreboardData函数，使用时间戳作为参数
                loadScoreboardData(selectedTime);
            }
        }
    });

    // 点击进度条直接跳转
    progressBar.addEventListener('click', function(e) {
        // 确保不是拖动结束时的点击
        if (isDragging) return;
        
        const rect = progressBar.getBoundingClientRect();
        const position = e.clientX - rect.left;
        const percentage = position / rect.width * 100;
        
        // 更新进度条位置
        progressHandle.style.left = `${percentage}%`;
        progressIndicator.style.width = `${percentage}%`;
        
        // 更新时间显示
        updateTimeFromProgress(percentage);
        
        // 计算对应的时间戳，加载数据
        const selectedTime = calculateTimeFromProgress();
        if (selectedTime && Number.isInteger(selectedTime)) {
            console.log(`点击进度条加载数据，时间戳: ${selectedTime}`);
            
            // 直接调用loadScoreboardData函数，使用时间戳作为参数
            loadScoreboardData(selectedTime);
        }
    });
}

// 格式化日期为tooltip显示格式
function formatDateForTooltip(date) {
    const hours = date.getUTCHours().toString().padStart(2, '0');
    const minutes = date.getUTCMinutes().toString().padStart(2, '0');
    const seconds = date.getUTCSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
}

// 根据进度百分比更新时间显示
function updateTimeFromProgress(percentage) {
    // 获取比赛起止时间
    const startTime = parseInt(contestInfo.startTime);
    const endTime = parseInt(contestInfo.endTime);
    
    // 计算对应的时间戳
    const elapsedSeconds = (endTime - startTime) * (percentage / 100);
    const currentTimestamp = startTime + elapsedSeconds;
    
    // 更新时间显示
    const remainingTimeElement = document.getElementById('remaining-time');
    const elapsedTimeElement = document.getElementById('elapsed-time');
    
    if (remainingTimeElement) {
        const remainingSeconds = Math.max(0, endTime - currentTimestamp);
        remainingTimeElement.textContent = formatTimerDuration(remainingSeconds);
    }
    
    if (elapsedTimeElement) {
        // 如果当前进度显示比赛已结束，固定显示总时长
        const elapsedSeconds = (percentage >= 100) ? 
            (endTime - startTime) : 
            (currentTimestamp - startTime);
        elapsedTimeElement.textContent = formatTimerDuration(Math.max(0, elapsedSeconds));
    }
}

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
function loadScoreboardData(selectedTimeOrFilter) {
    // 防止重复调用
    if (window.loadingScoreboard) {
        console.log('正在加载记分板数据，忽略重复调用');
        return;
    }
    
    // 设置正在加载标记
    window.loadingScoreboard = true;
    
    // 判断参数类型，区分是时间点还是筛选条件
    let isFilter = typeof selectedTimeOrFilter === 'string';
    let selectedTime = !isFilter ? selectedTimeOrFilter : null;
    let filterType = isFilter ? selectedTimeOrFilter : currentGroup;
    
    // 有效的筛选类型列表
    const validFilters = ['all', 'official', 'unofficial', 'girls', 'undergraduate', 'special'];
    
    // 获取contestInfo - 可能来自内联js或外部变量
    const contestInfoObj = window.contestInfo || {};
    const contestId = contestInfoObj.id;
    
    if (!contestId) {
        // 尝试从隐藏元素获取contestId
        const contestDataElem = document.getElementById('contest-data');
        if (contestDataElem) {
            const id = contestDataElem.getAttribute('data-contest-id');
            if (id) {
                console.log('从HTML元素获取到比赛ID:', id);
                // 如果获取成功，更新contestInfo对象
                if (!window.contestInfo) {
                    window.contestInfo = {
                        id: id,
                        startTime: parseInt(contestDataElem.getAttribute('data-start-time') || '0'),
                        endTime: parseInt(contestDataElem.getAttribute('data-end-time') || '0'),
                        currentStatus: contestDataElem.getAttribute('data-status') || ''
                    };
                }
            } else {
                console.error('隐藏元素中找不到比赛ID');
                showErrorMessage('无法获取比赛ID');
                window.loadingScoreboard = false;
                return;
            }
        } else {
            console.error('找不到比赛ID元素');
            showErrorMessage('无法获取比赛信息');
            window.loadingScoreboard = false;
            return;
        }
    }
    
    // 重新获取contestId（可能已更新）
    const finalContestId = window.contestInfo.id;
    
    // 构建基本URL
    let url = `/api/scoreboard/${finalContestId}`;
    
    // 添加查询参数
    const params = new URLSearchParams();
    // 检查筛选类型是否有效
    if (filterType && filterType !== 'all' && validFilters.includes(filterType)) {
        params.append('filter', filterType);
    }
    if (selectedTime && Number.isInteger(selectedTime)) {
        params.append('time', selectedTime);
    }
    
    // 将参数添加到URL
    const queryString = params.toString();
    if (queryString) {
        url += `?${queryString}`;
    }
    
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
                window.loadingScoreboard = false;
                return;
            }
            scoreboardData = data;
            renderScoreboard(data);
            
            // 重置加载标记
            window.loadingScoreboard = false;
        })
        .catch(error => {
            console.error('获取记分板数据失败:', error);
            showErrorMessage('获取记分板数据失败: ' + error.message);
            
            // 重置加载标记
            window.loadingScoreboard = false;
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
        // 添加title属性，鼠标悬停时显示完整学校名称
        schoolCell.title = result.team.organization;
        
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
        // 添加title属性，鼠标悬停时显示完整队名
        teamName.title = result.team.name;
        
        if (result.team.girl) {
            const girlContainer = document.createElement('span');
            girlContainer.className = 'girl-team-icon'; 
            girlContainer.innerHTML = '💃';
            girlContainer.title = '女队';
            teamName.appendChild(girlContainer);
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
                    
                    // 如果是首A，使用深绿色背景
                    if (problemResult.first_to_solve) {
                        problemCell.classList.add('problem-first-to-solve');
                    }
                    
                    // 计算总提交次数 = 错误尝试 + 1次正确
                    const totalAttempts = problemResult.attempts + 1;
                    // 获取通过时间（后端已经以分钟为单位返回）
                    const solvedTimeMinutes = problemResult.solved_time;
                    
                    // 首A时使用白色文字，否则使用深绿色文字
                    const statusClass = problemResult.first_to_solve ? 'text-white' : '';
                    
                    // 新的格式: + 1/分钟数
                    problemCell.innerHTML = `
                        <div class="result-status ${statusClass}">+</div>
                        <div class="result-details ${statusClass}">${totalAttempts}/${solvedTimeMinutes}</div>
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
        const problemId = index < problemIds.length ? problemIds[index] : column.textContent.trim();
        const balloonColor = balloonColors && index < balloonColors.length ? balloonColors[index] || {} : {};
        const problemStats = problemStatsMap ? problemStatsMap[problemId] : null;
        
        // 更新表头内容，只添加通过数量
        if (problemStats) {
            const solvedCount = problemStats.solvedCount;
            
            // 创建新的表头内容，只显示题号和通过数量
            column.innerHTML = `
                <div>${problemId}</div>
                <div class="small problem-stats">${solvedCount}</div>
            `;
        } else {
            // 如果没有统计数据，至少保留题号
            column.innerHTML = `<div>${problemId}</div>`;
        }
        
        // 默认使用深绿色作为题目列头背景
        let backgroundColor = '#4CAF50';
        
        // 如果后端提供了气球颜色，则使用后端提供的颜色
        if (balloonColor.background_color) {
            backgroundColor = balloonColor.background_color;
        }
        
        // 使用灰度级别公式判断文字颜色
        const textColor = getContrastColor(backgroundColor);
        
        // 构建样式字符串
        let styleString = `background-color: ${backgroundColor} !important;`;
        
        // 如果后端明确指定了文字颜色，优先使用后端指定的，否则使用自动计算的对比色
        styleString += ` color: ${textColor} !important;`;
        
        // 一次性设置样式，避免多次覆盖
        column.setAttribute('style', styleString);
        
        // 确保设置了所有必要的类
        column.classList.add('text-center', 'problem-column');
        column.setAttribute('scope', 'col');
        
        // 添加调试信息
        console.log(`题目 ${problemId}: 背景色=${backgroundColor}, 文字颜色=${textColor}`);
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
            const newGroup = this.getAttribute('data-group');
            console.log(`切换组别筛选: ${currentGroup} -> ${newGroup}`);
            currentGroup = newGroup;
            
            // 使用组别字符串作为筛选参数加载数据
            loadScoreboardData(currentGroup);
            
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
    
    // 先执行一次更新
    updateTimeDisplay();
    
    // 检查比赛是否已结束
    const currentTime = getCurrentTimestamp();
    const endTime = parseInt(contestInfo.startTime) + parseInt(contestInfo.endTime);
    const startTime = parseInt(contestInfo.startTime);
    
    console.log(`比赛时间: 开始=${new Date(startTime*1000).toLocaleString()}, 结束=${new Date(endTime*1000).toLocaleString()}, 现在=${new Date(currentTime*1000).toLocaleString()}`);
    
    if (currentTime > endTime) {
        // 比赛已结束，不设置轮询
        console.log('比赛已结束，不设置轮询');
        document.getElementById('contest-status').textContent = '已结束';
        if (document.getElementById('progress-status-text')) {
            document.getElementById('progress-status-text').textContent = '已结束';
        }
        // 不设置定时器，只执行一次初始更新
        return;
    } else if (currentTime < startTime) {
        // 比赛未开始
        const minutesToStart = Math.floor((startTime - currentTime) / 60);
        
        if (minutesToStart > 60) {
            // 距离开始超过1小时，每小时更新一次
            console.log(`比赛还有${minutesToStart}分钟开始，设置每小时轮询`);
            timerInterval = setInterval(updateTimeDisplay, 3600000); // 每小时更新一次
        } else {
            // 距离开始不到1小时，每5分钟更新一次
            console.log(`比赛即将开始（${minutesToStart}分钟），设置每5分钟轮询`);
            timerInterval = setInterval(updateTimeDisplay, 300000); // 每5分钟更新一次
        }
    } else {
        // 比赛进行中，每分钟更新一次
        const minutesToEnd = Math.floor((endTime - currentTime) / 60);
        console.log(`比赛进行中，还剩${minutesToEnd}分钟，设置每分钟轮询`);
        timerInterval = setInterval(updateTimeDisplay, 60000); // 每分钟更新一次
    }
}

// 更新时间显示
function updateTimeDisplay() {
    // 获取当前时间和比赛时间信息
    const currentTime = getCurrentTimestamp();
    const startTime = parseInt(contestInfo.startTime);
    const endTime = parseInt(contestInfo.endTime) + startTime; // 确保计算的是绝对结束时间
    const frozenTime = contestInfo.frozenTime ? parseInt(contestInfo.frozenTime) : null;
    
    // 计算已用时间和剩余时间（秒）
    const elapsedTime = currentTime - startTime;
    const remainingTime = endTime - currentTime;
    
    // 更新页面显示
    const statusElement = document.getElementById('contest-status');
    const remainingTimeElement = document.getElementById('remaining-time');
    const elapsedTimeElement = document.getElementById('elapsed-time');
    const statusTextElement = document.getElementById('progress-status-text');
    const statusIndicator = document.querySelector('.status-indicator');
    
    let indicatorColor = '';
    let currentStatus = '';
    let previousStatus = contestStatus; // 保存之前的状态用于比较
    
    // 确定当前比赛状态
    if (currentTime < startTime) {
        currentStatus = "未开始";
        contestStatus = "未开始";
        indicatorColor = '#ffc107'; // 黄色
    } else if (currentTime >= startTime && currentTime < endTime) {
        currentStatus = "进行中";
        contestStatus = "进行中";
        indicatorColor = '#28a745'; // 绿色
        
        // 检查是否冻结
        if (frozenTime && currentTime >= (startTime + frozenTime)) {
            currentStatus = "已冻结";
            contestStatus = "已冻结";
            indicatorColor = '#fd7e14'; // 橙色
        }
    } else {
        currentStatus = "已结束";
        contestStatus = "已结束";
        indicatorColor = '#dc3545'; // 红色
        
        // 如果比赛已结束，清除定时器（不需要再轮询）
        if (timerInterval) {
            console.log('比赛已结束，停止轮询');
            clearInterval(timerInterval);
            timerInterval = null;
        }
    }
    
    // 更新状态文本
    if (statusElement) {
        statusElement.textContent = currentStatus;
    }
    
    // 同步更新进度条上的状态文本
    if (statusTextElement) {
        statusTextElement.textContent = currentStatus;
    }
    
    // 更新状态指示器颜色
    if (statusIndicator) {
        statusIndicator.style.backgroundColor = indicatorColor;
    }
    
    // 更新剩余时间和已用时间显示
    if (remainingTimeElement) {
        if (currentTime < startTime) {
            remainingTimeElement.textContent = formatTimerDuration(endTime - startTime);
        } else if (currentTime >= startTime && currentTime < endTime) {
            remainingTimeElement.textContent = formatTimerDuration(remainingTime);
        } else {
            remainingTimeElement.textContent = "00:00:00";
        }
    }
    
    if (elapsedTimeElement) {
        if (currentTime < startTime) {
            elapsedTimeElement.textContent = "00:00:00";
        } else if (currentTime >= startTime && currentTime < endTime) {
            elapsedTimeElement.textContent = formatTimerDuration(elapsedTime);
        } else {
            elapsedTimeElement.textContent = formatTimerDuration(endTime - startTime);
        }
    }
    
    // 更新进度条
    updateProgressBar(currentTime);
    
    // 仅在以下情况下加载记分板数据：
    // 1. 初次加载（scoreboardData为null且未加载过数据）
    // 2. 状态变化时（从未开始到进行中，或从进行中到已结束）
    if ((!scoreboardData && !window.dataLoaded) || previousStatus !== contestStatus) {
        console.log(`状态变化: ${previousStatus} -> ${contestStatus}，重新加载记分板数据`);
        
        // 设置已加载标记，防止重复加载
        window.dataLoaded = true;
        
        // 获取当前筛选类型
        const activeFilter = document.querySelector('.filter-buttons .btn.active');
        const filterType = activeFilter ? activeFilter.getAttribute('data-filter') : 'all';
        
        // 有效的筛选类型列表
        const validFilters = ['all', 'official', 'unofficial', 'girls', 'undergraduate', 'special'];
        
        // 验证筛选类型
        const validFilter = validFilters.includes(filterType) ? filterType : 'all';
        
        // 确保使用字符串筛选类型参数调用loadScoreboardData，而不是使用时间戳
        loadScoreboardData(validFilter);
        
        // 如果状态变为"已结束"，停止轮询
        if (contestStatus === "已结束" && timerInterval) {
            console.log('比赛已结束，停止轮询');
            clearInterval(timerInterval);
            timerInterval = null;
        }
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

// 获取当前时间戳（秒）
function getCurrentTimestamp() {
    return Math.floor(Date.now() / 1000);
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

// 更新进度条位置
function updateProgressBar(currentTime) {
    const startTime = parseInt(contestInfo.startTime);
    const endTime = parseInt(contestInfo.endTime);
    
    // 计算比赛总时长
    const contestDuration = endTime - startTime;
    
    if (contestDuration <= 0) return; // 防止除以零
    
    // 计算当前进度百分比
    let progressPercentage = 0;
    
    if (currentTime < startTime) {
        // 比赛未开始
        progressPercentage = 0;
    } else if (currentTime > endTime) {
        // 比赛已结束
        progressPercentage = 100;
    } else {
        // 比赛进行中
        const elapsedTime = currentTime - startTime;
        progressPercentage = Math.min(100, (elapsedTime / contestDuration) * 100);
    }
    
    // 更新进度条和手柄位置
    const progressHandle = document.getElementById('progress-handle');
    const progressIndicator = document.getElementById('progress-indicator');
    
    if (progressHandle && progressIndicator) {
        progressHandle.style.left = `${progressPercentage}%`;
        progressIndicator.style.width = `${progressPercentage}%`;
    }
}

// 根据当前进度计算对应的时间戳
function calculateTimeFromProgress() {
    // 获取当前进度条位置
    const progressHandle = document.getElementById('progress-handle');
    if (!progressHandle) return null;
    
    // 获取当前百分比
    const leftPosition = parseFloat(progressHandle.style.left);
    if (isNaN(leftPosition)) return null;
    
    // 获取比赛时间范围
    const startTime = parseInt(contestInfo.startTime);
    const endTime = parseInt(contestInfo.endTime);
    
    // 计算对应的时间戳
    const percentage = leftPosition / 100;
    const timestamp = startTime + (percentage * (endTime - startTime));
    
    return Math.floor(timestamp);
}

// 显示统计信息
function showStatistics() {
    console.log('正在显示统计信息');
    
    // 防止重复调用
    if (window.loadingStatistics) {
        console.log('正在加载统计数据，忽略重复调用');
        return;
    }
    
    // 设置正在加载标记
    window.loadingStatistics = true;
    
    // 获取排行榜表格容器
    const scoreboardContainer = document.querySelector('.card-body .table-responsive');
    if (!scoreboardContainer) {
        console.error('找不到排行榜容器');
        showNotification('找不到排行榜容器', 'danger');
        window.loadingStatistics = false;
        return;
    }
    
    // 显示加载中状态
    scoreboardContainer.innerHTML = `
        <div class="text-center py-5">
            <div class="spinner-border text-primary mb-3" role="status">
                <span class="visually-hidden">加载中...</span>
            </div>
            <p class="mb-0">正在加载统计数据...</p>
        </div>
    `;
    
    // 切换按钮显示状态
    const statisticsBtn = document.getElementById('statisticsBtn');
    const scoreboardBtn = document.getElementById('scoreboardBtn');
    if (statisticsBtn) {
        statisticsBtn.style.display = 'none';
        statisticsBtn.classList.remove('btn-primary');
        statisticsBtn.classList.add('btn-outline-primary');
    }
    if (scoreboardBtn) {
        scoreboardBtn.style.display = 'inline-block';
        scoreboardBtn.classList.remove('btn-outline-primary');
        scoreboardBtn.classList.add('btn-primary');
    }
    
    // 构建API请求URL，使用原有API接口，增加filter参数
    const contestId = contestInfo.id;
    let apiUrl = `/api/statistics/${contestId}`;
    
    // 获取当前激活的筛选按钮
    const activeFilter = document.querySelector('.filter-buttons .btn.active');
    let filter = 'all';
    if (activeFilter) {
        filter = activeFilter.getAttribute('data-filter');
    }
    
    // 有效的筛选类型列表
    const validFilters = ['all', 'official', 'unofficial', 'girls', 'undergraduate', 'special'];
    
    // 如果筛选类型无效，使用默认值
    if (!validFilters.includes(filter)) {
        console.warn(`无效的筛选类型: ${filter}，使用默认值 'all'`);
        filter = 'all';
    }
    
    // 添加筛选参数
    const urlParams = new URLSearchParams();
    if (filter !== 'all') {
        urlParams.append('filter', filter);
    }
    if (urlParams.toString()) {
        apiUrl += '?' + urlParams.toString();
    }
    
    console.log('正在请求统计数据，URL:', apiUrl);
    
    // 发送请求到后端
    fetch(apiUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error('网络请求失败');
            }
            return response.json();
        })
        .then(data => {
            // 显示统计数据
            displayStatistics(data, filter, scoreboardContainer);
            // 重置加载标记
            window.loadingStatistics = false;
        })
        .catch(error => {
            console.error('统计请求失败:', error);
            
            // 显示错误信息
            scoreboardContainer.innerHTML = `
                <div class="alert alert-danger my-5">
                    <i class="bi bi-exclamation-triangle me-2"></i>
                    获取统计数据失败: ${error.message}
                </div>
            `;
            
            // 恢复按钮状态
            if (statisticsBtn) {
                statisticsBtn.style.display = 'inline-block';
                statisticsBtn.classList.remove('btn-outline-primary');
                statisticsBtn.classList.add('btn-primary');
            }
            if (scoreboardBtn) {
                scoreboardBtn.style.display = 'none';
                scoreboardBtn.classList.remove('btn-primary');
                scoreboardBtn.classList.add('btn-outline-primary');
            }
            
            showNotification('获取统计数据失败，请重试', 'danger');
            // 重置加载标记
            window.loadingStatistics = false;
        });
}

// 显示统计数据
function displayStatistics(data, filter, container) {
    // 调用内部实现函数
    window.internalDisplayStatistics(data, filter, container);
}

// 生成卡片式热力图（图二样式）
function generateCardHeatmap(problemStats) {
    if (!problemStats || Object.keys(problemStats).length === 0) {
        return '<div class="alert alert-warning">没有可用的题目统计数据</div>';
    }

    // 创建热力图容器
    let heatmapHtml = '<div class="card-heatmap-container">';
    
    // 按题目ID排序
    const sortedProblemIds = Object.keys(problemStats).sort();
    
    // 为每个题目生成卡片式热力图
    sortedProblemIds.forEach(problemId => {
        const stats = problemStats[problemId];
        
        // 计算总提交次数
        const totalSubmissions = stats.accepted + stats.rejected + stats.pending;
        if (totalSubmissions === 0) return; // 跳过无提交的题目
        
        // 计算通过率
        const acceptRate = totalSubmissions > 0 ? (stats.accepted / totalSubmissions * 100).toFixed(1) : '0.0';
        
        // 创建题目卡片 - 完全匹配新截图
        heatmapHtml += `
            <div class="problem-card">
                <div class="problem-badge" style="background-color: #4CAF50;">${problemId}</div>
                
                <div style="width: 100%; padding: 0 15px; margin-top: 10px; text-align: left;">
                    <div class="stat-row">
                        <span class="stat-percent">${acceptRate}%</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-submissions">${totalSubmissions}次提交</span>
                    </div>
                </div>
            </div>
        `;
    });
    
    // 关闭容器
    heatmapHtml += '</div>';
    return heatmapHtml;
}

// 生成提交方块 - 不再使用，但保留函数以防需要恢复
function generateSubmissionBlocks(count, type) {
    if (count <= 0) return '';
    
    // 根据截图现在不需要显示方块，返回空字符串
    return '';
}

// 确保关键函数在全局范围内可用
window.loadScoreboardData = loadScoreboardData;
window.renderScoreboard = renderScoreboard;
window.showStatistics = showStatistics;
window.showNotification = showNotification;
window.initializeCharts = initializeCharts;

// 内部实现统计数据显示的函数，暴露为全局函数以供筛选功能调用
window.internalDisplayStatistics = function(data, filter, container) {
    // 准备数据
    const filterText = getFilterDisplayText(filter);
    
    // 创建统计内容
    const statsContent = document.createElement('div');
    statsContent.className = 'statistics-container';
    statsContent.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-3">
            <h4 class="mb-0">比赛统计 ${filterText ? `(${filterText})` : ''}</h4>
        </div>
        
        <!-- 基本统计数据 -->
        <div class="row mb-4">
            <div class="col-md-4">
                <div class="card text-center">
                    <div class="card-body">
                        <h2 class="card-title">${data.problem_count}</h2>
                        <p class="card-text">题目数</p>
                    </div>
                </div>
            </div>
            <div class="col-md-4">
                <div class="card text-center">
                    <div class="card-body">
                        <h2 class="card-title">${data.team_count}</h2>
                        <p class="card-text">队伍数</p>
                    </div>
                </div>
            </div>
            <div class="col-md-4">
                <div class="card text-center">
                    <div class="card-body">
                        <h2 class="card-title">${data.submission_count}</h2>
                        <p class="card-text">提交数</p>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- 题目提交情况 -->
        <div class="mb-4">
            <h5 class="heatmap-title">题目提交热力图</h5>
            <div class="problem-heatmap">
                ${generateCardHeatmap(data.problem_stats)}
            </div>
        </div>
    `;
    
    // 清空容器并添加统计内容
    container.innerHTML = '';
    container.appendChild(statsContent);
    
    // 初始化图表
    initializeCharts(data);
};

// 初始化各种图表
function initializeCharts(data) {
    // 准备提交类型图表数据
    const submissionTypeLabels = [];
    const submissionTypeData = [];
    const submissionTypeColors = [];
    
    // 使用预定义的颜色
    const submissionTypeColorMap = {
        'accepted': '#28a745', // 绿色
        'rejected': '#dc3545', // 红色
        'frozen': '#ffc107',   // 黄色
        'pending': '#6c757d'   // 灰色
    };
    
    // 遍历提交类型
    for (const [type, count] of Object.entries(data.submission_types)) {
        submissionTypeLabels.push(getSubmissionTypeDisplayText(type));
        submissionTypeData.push(count);
        
        // 使用预定义颜色或默认颜色
        const color = submissionTypeColorMap[type] || '#007bff';
        submissionTypeColors.push(color);
    }
    
    // 队伍解题数数据
    const teamSolvedLabels = [];
    const teamSolvedData = [];
    
    // 遍历解题数统计
    for (let i = 0; i <= data.problem_count; i++) {
        teamSolvedLabels.push(i);
        teamSolvedData.push(data.team_solved_count[i] || 0);
    }
    
    // 构建题目提交数据
    const problemLabels = [];
    const acceptedData = [];
    const rejectedData = [];
    const pendingData = [];
    
    // 遍历题目统计数据
    for (const problemId of Object.keys(data.problem_stats).sort()) {
        const stats = data.problem_stats[problemId];
        problemLabels.push(problemId);
        acceptedData.push(stats.accepted);
        rejectedData.push(stats.rejected);
        pendingData.push(stats.pending);
    }
    
    // 创建提交类型饼图
    const submissionTypeCtx = document.getElementById('submissionTypeChart');
    if (submissionTypeCtx) {
        new Chart(submissionTypeCtx, {
            type: 'doughnut',
            data: {
                labels: submissionTypeLabels,
                datasets: [{
                    data: submissionTypeData,
                    backgroundColor: submissionTypeColors,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                    },
                    title: {
                        display: false
                    }
                }
            }
        });
    }
    
    // 创建队伍解题数柱状图
    const teamSolvedCtx = document.getElementById('teamSolvedChart');
    if (teamSolvedCtx) {
        new Chart(teamSolvedCtx, {
            type: 'bar',
            data: {
                labels: teamSolvedLabels,
                datasets: [{
                    label: '队伍数',
                    data: teamSolvedData,
                    backgroundColor: '#4e73df',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: '过题数'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: '队伍数'
                        }
                    }
                }
            }
        });
    }
    
    // 创建题目提交分布堆叠柱状图
    const problemSubmissionCtx = document.getElementById('problemSubmissionChart');
    if (problemSubmissionCtx) {
        new Chart(problemSubmissionCtx, {
            type: 'bar',
            data: {
                labels: problemLabels,
                datasets: [
                    {
                        label: '通过',
                        data: acceptedData,
                        backgroundColor: '#28a745',
                        stack: 'Stack 0'
                    },
                    {
                        label: '拒绝',
                        data: rejectedData,
                        backgroundColor: '#dc3545',
                        stack: 'Stack 0'
                    },
                    {
                        label: '待定',
                        data: pendingData,
                        backgroundColor: '#ffc107',
                        stack: 'Stack 0'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: '题目编号'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        stacked: true,
                        title: {
                            display: true,
                            text: '提交数'
                        }
                    }
                }
            }
        });
    }
}

// 根据筛选条件获取显示文本
function getFilterDisplayText(filter) {
    const filterMap = {
        'all': '全部',
        'official': '正式队伍',
        'unofficial': '打星队伍',
        'girls': '女队',
        'undergraduate': '本科组',
        'special': '专科组'
    };
    return filterMap[filter] || filter;
}

// 提交状态显示文本转换
function getSubmissionTypeDisplayText(type) {
    const typeMap = {
        'accepted': '通过',
        'rejected': '拒绝',
        'frozen': '冻结',
        'wrong_answer': '答案错误',
        'time_limit_exceeded': '超时',
        'memory_limit_exceeded': '超内存',
        'runtime_error': '运行错误',
        'compilation_error': '编译错误',
        'pending': '待定'
    };
    return typeMap[type] || type;
}

// 显示通知消息
function showNotification(message, type = 'info') {
    // 创建通知元素
    const notification = document.createElement('div');
    notification.className = `alert alert-${type} alert-dismissible fade show fixed-top mx-auto mt-3`;
    notification.style.maxWidth = '500px';
    notification.style.zIndex = '9999';
    notification.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
    notification.role = 'alert';
    
    // 设置通知内容
    notification.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    // 添加到页面
    document.body.appendChild(notification);
    
    // 自动删除通知
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 150);
    }, 3000);
}

// 初始化各种图表
function initializeCharts(data) {
    // 准备提交类型图表数据
    const submissionTypeLabels = [];
    const submissionTypeData = [];
    const submissionTypeColors = [];
    
    // 使用预定义的颜色
    const submissionTypeColorMap = {
        'accepted': '#28a745', // 绿色
        'rejected': '#dc3545', // 红色
        'frozen': '#ffc107',   // 黄色
        'pending': '#6c757d'   // 灰色
    };
    
    // 遍历提交类型
    for (const [type, count] of Object.entries(data.submission_types)) {
        submissionTypeLabels.push(getSubmissionTypeDisplayText(type));
        submissionTypeData.push(count);
        
        // 使用预定义颜色或默认颜色
        const color = submissionTypeColorMap[type] || '#007bff';
        submissionTypeColors.push(color);
    }
    
    // 队伍解题数数据
    const teamSolvedLabels = [];
    const teamSolvedData = [];
    
    // 遍历解题数统计
    for (let i = 0; i <= data.problem_count; i++) {
        teamSolvedLabels.push(i);
        teamSolvedData.push(data.team_solved_count[i] || 0);
    }
    
    // 构建题目提交数据
    const problemLabels = [];
    const acceptedData = [];
    const rejectedData = [];
    const pendingData = [];
    
    // 遍历题目统计数据
    for (const problemId of Object.keys(data.problem_stats).sort()) {
        const stats = data.problem_stats[problemId];
        problemLabels.push(problemId);
        acceptedData.push(stats.accepted);
        rejectedData.push(stats.rejected);
        pendingData.push(stats.pending);
    }
    
    // 创建提交类型饼图
    const submissionTypeCtx = document.getElementById('submissionTypeChart');
    if (submissionTypeCtx) {
        new Chart(submissionTypeCtx, {
            type: 'doughnut',
            data: {
                labels: submissionTypeLabels,
                datasets: [{
                    data: submissionTypeData,
                    backgroundColor: submissionTypeColors,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                    },
                    title: {
                        display: false
                    }
                }
            }
        });
    }
    
    // 创建队伍解题数柱状图
    const teamSolvedCtx = document.getElementById('teamSolvedChart');
    if (teamSolvedCtx) {
        new Chart(teamSolvedCtx, {
            type: 'bar',
            data: {
                labels: teamSolvedLabels,
                datasets: [{
                    label: '队伍数',
                    data: teamSolvedData,
                    backgroundColor: '#4e73df',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: '过题数'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: '队伍数'
                        }
                    }
                }
            }
        });
    }
    
    // 创建题目提交分布堆叠柱状图
    const problemSubmissionCtx = document.getElementById('problemSubmissionChart');
    if (problemSubmissionCtx) {
        new Chart(problemSubmissionCtx, {
            type: 'bar',
            data: {
                labels: problemLabels,
                datasets: [
                    {
                        label: '通过',
                        data: acceptedData,
                        backgroundColor: '#28a745',
                        stack: 'Stack 0'
                    },
                    {
                        label: '拒绝',
                        data: rejectedData,
                        backgroundColor: '#dc3545',
                        stack: 'Stack 0'
                    },
                    {
                        label: '待定',
                        data: pendingData,
                        backgroundColor: '#ffc107',
                        stack: 'Stack 0'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: '题目编号'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        stacked: true,
                        title: {
                            display: true,
                            text: '提交数'
                        }
                    }
                }
            }
        });
    }
} 