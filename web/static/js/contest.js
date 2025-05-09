// 初始化筛选条件
(function() {
    // 从URL获取初始筛选条件
    const url = new URL(window.location.href);
    const urlFilter = url.searchParams.get('filter');
    
    // 有效的筛选类型列表
    const validFilters = ['all', 'official', 'unofficial', 'girls', 'undergraduate', 'special'];
    // 验证并设置筛选类型
    const filterType = urlFilter && validFilters.includes(urlFilter) ? urlFilter : 'all';
    
    // 在页面刚开始加载时保存筛选类型到window对象
    window.initialFilterType = filterType;
    
    // 添加一个内联样式标签来预设按钮样式
    document.write(`
        <style id="initial-filter-style">
            /* 先重置所有按钮的样式为非激活状态 */
            .filter-buttons .btn {
                background-color: transparent !important;
                border: none !important;
                color: #555 !important;
                box-shadow: none !important;
            }
            /* 然后只激活对应的筛选按钮 */
            .filter-buttons .btn[data-filter="${filterType}"] {
                background-color: #0d6efd !important;
                border-color: #0d6efd !important;
                color: white !important;
            }
        </style>
    `);
})();

// 页面加载完成后的初始化
document.addEventListener('DOMContentLoaded', function() {
    // 确保排行榜相关的全局变量已经初始化
    if (!window.contestInfo) {
        // 从隐藏的数据元素中获取值
        const contestDataElem = document.getElementById('contest-data');
        if (contestDataElem) {
            window.contestInfo = {
                id: contestDataElem.getAttribute('data-contest-id') || '',
                startTime: parseInt(contestDataElem.getAttribute('data-start-time') || '0'),
                endTime: parseInt(contestDataElem.getAttribute('data-end-time') || '0'),
                currentStatus: contestDataElem.getAttribute('data-status') || ''
            };
        } else if (typeof contestInfo !== 'undefined') {
            // 如果只在全局作用域有contestInfo，将其赋值给window对象
            window.contestInfo = contestInfo;
        } else {
            console.warn('无法获取比赛信息，部分功能可能不可用');
        }
    }
    
    // 移除初始样式，切换到类控制
    const initialStyle = document.getElementById('initial-filter-style');
    if (initialStyle) {
        initialStyle.remove();
    }
    
    // 从URL中获取当前筛选条件和视图类型
    const url = new URL(window.location.href);
    const urlFilter = url.searchParams.get('filter');
    const urlView = url.searchParams.get('view');
    
    // 有效的筛选类型列表
    const validFilters = ['all', 'official', 'unofficial', 'girls', 'undergraduate', 'special'];
    // 验证并设置筛选类型
    const filterType = urlFilter && validFilters.includes(urlFilter) ? urlFilter : 'all';
    
    // 确保只有一个筛选按钮激活
    document.querySelectorAll('.filter-buttons .btn[data-filter]').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // 然后设置正确的筛选按钮为激活状态
    const activeFilterBtn = document.querySelector(`.filter-buttons .btn[data-filter="${filterType}"]`);
    if (activeFilterBtn) {
        activeFilterBtn.classList.add('active');
    }
    
    // 设置初始视图按钮状态
    const viewType = urlView || 'rank'; // 默认为排名视图
    document.querySelectorAll('.filter-buttons .btn[data-view]').forEach(btn => {
        btn.classList.remove('active');
    });
    const activeViewBtn = document.querySelector(`.filter-buttons .btn[data-view="${viewType}"]`);
    if (activeViewBtn) {
        activeViewBtn.classList.add('active');
    }
    
    // 设置筛选按钮点击事件
    document.querySelectorAll('.filter-buttons .btn[data-filter]').forEach(button => {
        button.addEventListener('click', function() {
            // 更新筛选按钮状态（只更新左侧的筛选按钮）
            document.querySelectorAll('.filter-buttons .btn[data-filter]').forEach(btn => {
                btn.classList.remove('active');
            });
            
            this.classList.add('active');
            
            // 获取筛选类型
            const filterType = this.getAttribute('data-filter');
            
            // 获取当前活动视图
            const isRankActive = document.getElementById('rankBtn')?.classList.contains('active');
            const isStatisticsActive = document.getElementById('statisticsBtn')?.classList.contains('active');
            const isSubmissionsActive = document.getElementById('submissionsBtn')?.classList.contains('active');
            
            let currentView = '';
            if (isStatisticsActive) {
                currentView = 'statistics';
            } else if (isSubmissionsActive) {
                currentView = 'submissions';
            } else {
                currentView = 'rank';
            }
            
            // 更新URL参数，保持当前视图不变
            updateURLWithFilter(filterType, currentView);
            
            // 根据当前视图刷新相应数据
            if (currentView === 'statistics' && typeof window.showStatistics === 'function') {
                window.showStatistics();
            } else if (currentView === 'submissions' && typeof window.showSubmissions === 'function') {
                window.showSubmissions();
            } else {
                // 默认筛选排行榜
                filterTeams(filterType);
            }
        });
    });
    
    // 设置视图按钮点击事件（排名、统计、提交）
    document.querySelectorAll('.filter-buttons .btn[data-view]').forEach(button => {
        button.addEventListener('click', function() {
            // 更新视图按钮状态（只更新右侧的视图按钮）
            document.querySelectorAll('.filter-buttons .btn[data-view]').forEach(btn => {
                btn.classList.remove('active');
            });
            
            this.classList.add('active');
            
            // 获取当前激活的筛选类型
            const activeFilter = document.querySelector('.filter-buttons .btn[data-filter].active');
            const filterType = activeFilter ? activeFilter.getAttribute('data-filter') : 'all';
            
            // 获取视图类型
            const viewType = this.getAttribute('data-view');
            
            // 更新URL参数
            updateURLWithFilter(filterType, viewType);
            
            // 根据视图类型显示相应内容
            if (viewType === 'statistics' && typeof window.showStatistics === 'function') {
                window.showStatistics();
            } else if (viewType === 'submissions' && typeof window.showSubmissions === 'function') {
                window.showSubmissions();
            } else {
                // 默认显示排行榜
                if (typeof window.showRankView === 'function') {
                    window.showRankView();
                }
            }
        });
    });
    
    // 检查是否应该显示统计页面
    if (urlView === 'statistics') {
        if (typeof window.showStatistics === 'function') {
            setTimeout(() => {
                window.showStatistics();
            }, 0);
        }
    } else {
        // 初始化排行榜数据
        // 使用URL中的筛选类型（或默认的all），从window.initialFilterType获取
        const initialFilter = window.initialFilterType || filterType || 'all';
        
        // 确保立即加载数据，不使用setTimeout
        if (typeof window.loadScoreboardData === 'function') {
            window.loadScoreboardData(initialFilter);
        } else {
            // 否则使用内联函数
            contestLoadScoreboardData(initialFilter);
        }
    }
});

document.addEventListener('DOMContentLoaded', function() {
    // 为所有热力条添加鼠标悬停事件
    document.addEventListener('mouseover', function(e) {
        if (e.target.classList.contains('heat-bar') && e.target.hasAttribute('title')) {
            // 设置定时器，延迟显示提示
            const element = e.target;
            element.tooltipTimer = setTimeout(function() {
                element.setAttribute('data-show-tooltip', 'true');
            }, 500); // 500毫秒延迟
        }
    }, true);
    
    // 鼠标移出时清除定时器和显示标记
    document.addEventListener('mouseout', function(e) {
        if (e.target.classList.contains('heat-bar') && e.target.hasAttribute('title')) {
            const element = e.target;
            clearTimeout(element.tooltipTimer);
            element.removeAttribute('data-show-tooltip');
        }
    }, true);
});

// 统一的表格初始化函数，用于页面初始化和统计视图切换回排行榜视图时
function initScoreboardTable(filterType = 'all') {
    // 获取表格容器
    const containerElement = document.querySelector('.card-body .table-responsive');
    if (!containerElement) return;
    
    // 保存原始的题目标识符，以便重建表格
    const problemIds = [];
    const existingHeaders = document.querySelectorAll('#scoreboard-table th.problem-column');
    existingHeaders.forEach(header => {
        problemIds.push(header.textContent.trim());
    });
    
    // 如果没有找到题目标识符，使用默认的A-J
    const defaultProblemIds = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    const finalProblemIds = problemIds.length > 0 ? problemIds : defaultProblemIds;
    
    // 生成题目列HTML
    let problemColumnsHtml = '';
    finalProblemIds.forEach(id => {
        problemColumnsHtml += `<th class="text-center problem-column" scope="col">${id}</th>`;
    });
    
    // 清空当前内容，创建表格结构
    containerElement.innerHTML = `
        <table class="table table-hover mb-0" id="scoreboard-table">
            <thead>
                <tr>
                    <th class="text-center" scope="col">Rank</th>
                    <th class="text-center" scope="col">School</th>
                    <th class="text-center" scope="col">Team</th>
                    <th class="text-center" scope="col">Solved</th>
                    <th class="text-center" scope="col">Penalty</th>
                    ${problemColumnsHtml}
                </tr>
            </thead>
            <tbody id="scoreboard-body">
                <tr>
                    <td colspan="${finalProblemIds.length + 5}" class="text-center py-5">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">加载中...</span>
                        </div>
                        <p class="mt-2">正在加载记分板数据...</p>
                    </td>
                </tr>
            </tbody>
        </table>
    `;
    
    // 加载排行榜数据
    contestLoadScoreboardData(filterType);
}

// 更新筛选队伍的逻辑
function filterTeams(filterType) {
    console.log(`正在筛选队伍: ${filterType}`);
    
    // 有效的筛选类型列表
    const validFilters = ['all', 'official', 'unofficial', 'girls', 'undergraduate', 'special'];
    
    // 如果筛选类型无效，使用默认值
    if (!validFilters.includes(filterType)) {
        console.warn(`无效的筛选类型: ${filterType}，使用默认值 'all'`);
        filterType = 'all';
    }
    
    // 检查当前视图是否为统计视图
    const statisticsView = document.querySelector('.statistics-container');
    const url = new URL(window.location.href);
    // 获取当前URL中是否有view=statistics参数
    const urlView = url.searchParams.get('view');
    const isStatisticsView = statisticsView || urlView === 'statistics';
    
    if (isStatisticsView) {
        // 在统计视图中更新URL参数
        updateURLWithFilter(filterType, 'statistics');
        
        // 在统计视图中，通过showStatistics重新加载统计数据
        if (typeof window.showStatistics === 'function') {
            // 先更新激活的筛选按钮
            document.querySelectorAll('.filter-buttons .btn[data-filter]').forEach(btn => {
                btn.classList.remove('active');
            });
            const activeBtn = document.querySelector(`.filter-buttons .btn[data-filter="${filterType}"]`);
            if (activeBtn) {
                activeBtn.classList.add('active');
            }
            
            // 然后重新加载统计数据
            window.showStatistics();
        }
        return;
    } else {
        // 在记分板视图中更新URL参数
        updateURLWithFilter(filterType);
    }
    
    // 在记分板视图中，执行原有逻辑
    // 显示加载状态
    const scoreboard = document.getElementById('scoreboard-body');
    if (scoreboard) {
        const columnCount = document.querySelectorAll('#scoreboard-table th').length;
        scoreboard.innerHTML = `
            <tr>
                <td colspan="${columnCount}" class="text-center py-5">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">加载中...</span>
                    </div>
                    <p class="mt-2">正在加载筛选数据...</p>
                </td>
            </tr>
        `;
    }
    
    // 调用统一的加载函数
    contestLoadScoreboardData(filterType);
}

// 更新URL中的筛选参数和视图参数
function updateURLWithFilter(filter, view) {
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
    
    console.log(`URL更新为: ${url.toString()}`);
}

// 加载排行榜数据的函数
function contestLoadScoreboardData(filterType) {
    // 从隐藏的数据元素中获取contestId
    const contestDataElem = document.getElementById('contest-data');
    const contestId = contestDataElem ? contestDataElem.getAttribute('data-contest-id') : 
                    (window.contestInfo ? window.contestInfo.id : 
                    (typeof contestInfo !== 'undefined' ? contestInfo.id : ''));
    
    if (!contestId) {
        console.error('无法获取比赛ID');
        showNotification('无法获取比赛ID', 'danger');
        return;
    }
    
    let apiUrl = `/api/scoreboard/${contestId}`;
    
    // 添加筛选参数
    const urlParams = new URLSearchParams();
    if (filterType && filterType !== 'all') {
        urlParams.append('filter', filterType);
    }
    if (urlParams.toString()) {
        apiUrl += '?' + urlParams.toString();
    }
    
    // 发送请求到后端
    fetch(apiUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error('网络请求失败');
            }
            return response.json();
        })
        .then(data => {
            // 使用API返回的数据更新记分板
            if (typeof window.renderScoreboard === 'function') {
                window.renderScoreboard(data);
            } else {
                console.error('renderScoreboard 函数未定义');
            }
        })
        .catch(error => {
            console.error('筛选请求失败:', error);
            const scoreboard = document.getElementById('scoreboard-body');
            if (scoreboard) {
                const columnCount = document.querySelectorAll('#scoreboard-table th').length;
                scoreboard.innerHTML = `
                    <tr>
                        <td colspan="${columnCount}" class="text-center py-5">
                            <div class="alert alert-danger">
                                <i class="bi bi-exclamation-triangle me-2"></i>
                                加载失败，请重试
                            </div>
                        </td>
                    </tr>
                `;
            }
            
            // 显示通知
            showNotification('加载数据失败: ' + error.message, 'danger');
        });
}

// 将函数赋值给window.loadScoreboardData使其可被全局访问
window.loadScoreboardData = contestLoadScoreboardData;

// 全局通知函数
function showNotification(message, type = 'info') {
    if (typeof window.showNotification === 'function') {
        window.showNotification(message, type);
    } else {
        // 简单备用实现
        const notification = document.createElement('div');
        notification.className = `alert alert-${type} alert-dismissible fade show fixed-top mx-auto mt-3`;
        notification.style.maxWidth = '500px';
        notification.style.zIndex = '9999';
        notification.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
        notification.role = 'alert';
        
        notification.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 150);
        }, 3000);
    }
}

// 显示排名视图
function showRankView() {
    console.log('显示排名视图');
    
    // 更新按钮状态
    updateViewButtons('rank');
    
    // 获取当前激活的筛选类型
    const activeFilter = document.querySelector('.filter-buttons .btn.active');
    const currentFilter = activeFilter ? activeFilter.getAttribute('data-filter') : 'all';
    
    // 使用当前筛选条件刷新数据
    if (typeof window.loadScoreboardData === 'function') {
        window.loadScoreboardData(currentFilter);
    }
}

// 更新全局函数
window.showRankView = showRankView;
window.updateURLWithFilter = updateURLWithFilter; 