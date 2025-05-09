// 提交记录相关功能
document.addEventListener('DOMContentLoaded', function() {
    console.log('提交记录功能已加载');
    
    // 获取提交按钮
    const submissionsBtn = document.getElementById('submissionsBtn');
    if (submissionsBtn) {
        submissionsBtn.addEventListener('click', function() {
            showSubmissions();
        });
        console.log('提交记录按钮事件已绑定');
    }
});

// 显示提交记录信息
function showSubmissions() {
    console.log('正在显示提交记录');
    
    try {
        // 防止重复调用
        if (window.loadingSubmissions) {
            console.log('正在加载提交记录，忽略重复调用');
            return;
        }
        
        // 设置正在加载标记
        window.loadingSubmissions = true;
        
        // 获取排行榜表格容器
        const tableContainer = document.querySelector('.card-body .table-responsive');
        if (!tableContainer) {
            console.error('找不到表格容器');
            showNotification('找不到表格容器', 'danger');
            window.loadingSubmissions = false;
            return;
        }
        
        // 显示加载中状态
        tableContainer.innerHTML = `
            <div class="text-center py-5">
                <div class="spinner-border text-primary mb-3" role="status">
                    <span class="visually-hidden">加载中...</span>
                </div>
                <p class="mb-0">正在加载提交记录...</p>
            </div>
        `;
        
        // 切换按钮状态
        updateViewButtons('submissions');
        
        // 获取比赛ID
        const contestDataElem = document.getElementById('contest-data');
        let contestId = contestDataElem ? contestDataElem.getAttribute('data-contest-id') : 
                        (window.contestInfo ? window.contestInfo.id : 
                        (typeof contestInfo !== 'undefined' ? contestInfo.id : ''));
        
        if (!contestId) {
            console.error('无法获取比赛ID');
            showNotification('无法获取比赛ID', 'danger');
            window.loadingSubmissions = false;
            return;
        }
        
        // 获取当前激活的筛选按钮
        const activeFilter = document.querySelector('.filter-buttons .btn[data-filter].active');
        let filter = activeFilter ? activeFilter.getAttribute('data-filter') : 'all';
        console.log('当前筛选条件:', filter);
        
        // 有效的筛选类型列表
        const validFilters = ['all', 'official', 'unofficial', 'girls', 'undergraduate', 'special'];
        
        // 如果筛选类型无效，使用默认值
        if (!validFilters.includes(filter)) {
            console.warn(`无效的筛选类型: ${filter}，使用默认值 'all'`);
            filter = 'all';
        }
        
        // 构建API URL
        let apiUrl = `/api/submissions/${contestId}`;
        
        // 添加筛选参数
        const urlParams = new URLSearchParams();
        if (filter !== 'all') {
            urlParams.append('filter', filter);
        }
        if (urlParams.toString()) {
            apiUrl += '?' + urlParams.toString();
        }
        
        // 更新URL，始终保存当前视图为submissions和筛选条件
        if (typeof window.updateURLWithFilter === 'function') {
            window.updateURLWithFilter(filter, 'submissions');
        } else {
            updateURLParams(filter, 'submissions');
        }
        
        console.log('正在请求提交记录，URL:', apiUrl);
        
        // 发送请求获取提交记录
        fetch(apiUrl)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP错误 ${response.status}: ${response.statusText}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('提交记录加载成功:', data);
                
                // 显示提交记录
                displaySubmissions(data, filter, tableContainer);
                
                // 重置加载标记
                window.loadingSubmissions = false;
            })
            .catch(error => {
                console.error('提交记录请求失败:', error);
                
                // 显示错误信息
                tableContainer.innerHTML = `
                    <div class="alert alert-danger my-5">
                        <i class="bi bi-exclamation-triangle me-2"></i>
                        获取提交记录失败: ${error.message}
                    </div>
                    <div class="text-center mt-3">
                        <button class="btn btn-primary" onclick="window.showSubmissions()">重试</button>
                        <button class="btn btn-outline-secondary ms-2" onclick="window.location.reload()">刷新页面</button>
                    </div>
                `;
                
                showNotification('获取提交记录失败，请重试', 'danger');
                
                // 重置加载标记
                window.loadingSubmissions = false;
            });
        
    } catch (error) {
        console.error('显示提交记录时发生错误:', error);
        showNotification('显示提交记录时发生错误: ' + error.message, 'danger');
        window.loadingSubmissions = false;
    }
}

// 显示提交记录
function displaySubmissions(submissions, filter, container) {
    // 准备数据
    const filterText = getFilterDisplayText(filter);
    
    // 创建提交记录表格
    const submissionsContent = document.createElement('div');
    
    // 判断是否有提交记录
    if (!submissions || submissions.length === 0) {
        submissionsContent.innerHTML = `
            <div class="alert alert-info my-5 text-center">
                <i class="bi bi-info-circle me-2"></i>
                没有找到符合条件的提交记录
            </div>
        `;
        container.innerHTML = '';
        container.appendChild(submissionsContent);
        return;
    }
    
    // 构建表格头
    let tableHTML = `
        <table class="table table-hover submissions-table">
            <thead>
                <tr>
                    <th scope="col">ID</th>
                    <th scope="col">时间</th>
                    <th scope="col">题目</th>
                    <th scope="col">结果</th>
                    <th scope="col">语言</th>
                    <th scope="col">队伍</th>
                    <th scope="col">学校</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    // 构建表格内容
    submissions.forEach(submission => {
        // 跳过被筛选的提交（如果IsFiltered标记为true）
        if (submission.is_filtered) {
            return;
        }
        
        // 格式化提交时间
        const submissionTime = new Date(submission.timestamp);
        const formattedTime = formatDateTime(submissionTime);
        
        // 确定结果样式
        const statusClass = getStatusClass(submission.status);
        const statusText = getStatusText(submission.status);
        
        // 添加表格行
        tableHTML += `
            <tr>
                <td>${submission.id}</td>
                <td>${formattedTime}</td>
                <td>${submission.problem_id}</td>
                <td><span class="badge ${statusClass}">${statusText}</span></td>
                <td>${submission.language || '-'}</td>
                <td>${submission.team_name}</td>
                <td>${submission.school}</td>
            </tr>
        `;
    });
    
    // 完成表格
    tableHTML += `
            </tbody>
        </table>
    `;
    
    submissionsContent.innerHTML = tableHTML;
    
    // 清空容器并添加提交记录内容
    container.innerHTML = '';
    container.appendChild(submissionsContent);
}

// 更新视图按钮状态
function updateViewButtons(activeView) {
    // 获取所有视图按钮
    const rankBtn = document.getElementById('rankBtn');
    const statisticsBtn = document.getElementById('statisticsBtn');
    const submissionsBtn = document.getElementById('submissionsBtn');
    
    // 重置所有按钮状态
    document.querySelectorAll('.filter-buttons .btn[data-view]').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // 设置活动按钮状态
    switch (activeView) {
        case 'rank':
            if (rankBtn) {
                rankBtn.classList.add('active');
            }
            break;
        case 'statistics':
            if (statisticsBtn) {
                statisticsBtn.classList.add('active');
            }
            break;
        case 'submissions':
            if (submissionsBtn) {
                submissionsBtn.classList.add('active');
            }
            break;
    }
}

// 获取筛选条件显示文本
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

// 格式化日期时间
function formatDateTime(date) {
    if (!(date instanceof Date) || isNaN(date)) {
        return '-';
    }
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// 获取状态样式类
function getStatusClass(status) {
    switch (status.toUpperCase()) {
        case 'ACCEPTED':
            return 'bg-success';
        case 'WRONG_ANSWER':
            return 'bg-danger';
        case 'TIME_LIMIT_EXCEEDED':
            return 'bg-warning text-dark';
        case 'MEMORY_LIMIT_EXCEEDED':
            return 'bg-warning text-dark';
        case 'RUNTIME_ERROR':
            return 'bg-info';
        case 'COMPILATION_ERROR':
            return 'bg-secondary';
        case 'FROZEN':
            return 'bg-primary';
        case 'PENDING':
            return 'bg-light text-dark';
        default:
            return 'bg-secondary';
    }
}

// 获取状态显示文本
function getStatusText(status) {
    const statusMap = {
        'ACCEPTED': '通过',
        'WRONG_ANSWER': '答案错误',
        'TIME_LIMIT_EXCEEDED': '超时',
        'MEMORY_LIMIT_EXCEEDED': '超内存',
        'RUNTIME_ERROR': '运行错误',
        'COMPILATION_ERROR': '编译错误',
        'FROZEN': '已冻结',
        'PENDING': '等待评测'
    };
    
    return statusMap[status.toUpperCase()] || status;
}

// 更新URL参数
function updateURLParams(filter, view) {
    // 获取当前URL
    const url = new URL(window.location.href);
    
    // 更新筛选参数
    if (filter && filter !== 'all') {
        url.searchParams.set('filter', filter);
    } else {
        // 如果是'all'，则删除filter参数
        url.searchParams.delete('filter');
    }
    
    // 更新视图参数
    if (view) {
        url.searchParams.set('view', view);
    } else {
        // 如果没有指定视图，则删除view参数
        url.searchParams.delete('view');
    }
    
    // 更新浏览器历史记录，但不重新加载页面
    window.history.pushState({}, '', url.toString());
    
    console.log(`URL已更新: ${url.toString()}`);
}

// 确保关键函数在全局范围内可用
window.showSubmissions = showSubmissions;
window.updateViewButtons = updateViewButtons; 