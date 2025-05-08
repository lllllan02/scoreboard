// 调试辅助脚本
document.addEventListener('DOMContentLoaded', function() {
    console.log('DEBUG: 调试脚本已加载');
    
    // 查找统计按钮
    const statisticsBtn = document.getElementById('statisticsBtn');
    if (statisticsBtn) {
        console.log('DEBUG: 找到统计按钮元素');
        
        // 不再覆盖原有的点击事件，使用原生的showStatistics函数
        console.log('DEBUG: 使用scoreboard.js中的showStatistics函数');
    } else {
        console.error('DEBUG: 找不到统计按钮元素');
    }
});

// 调试版本的统计函数 - 不再使用这个函数，防止与scoreboard.js中的函数冲突
// function showStatisticsDebug() {
//     console.log('DEBUG: 正在显示统计信息');
//     
//     // 显示加载消息
//     const scoreboardContainer = document.querySelector('.card-body .table-responsive');
//     if (!scoreboardContainer) {
//         console.error('DEBUG: 找不到排行榜容器');
//         alert('找不到排行榜容器');
//         return;
//     }
//     
//     // 保存原有内容，以便出错时恢复
//     const originalContent = scoreboardContainer.innerHTML;
//     
//     // 显示加载中状态
//     scoreboardContainer.innerHTML = `
//         <div class="text-center py-5">
//             <div class="spinner-border text-primary mb-3" role="status">
//                 <span class="visually-hidden">加载中...</span>
//             </div>
//             <p class="mb-0">正在加载统计数据...</p>
//         </div>
//     `;
//     
//     try {
//         // 构建API请求URL
//         const contestId = contestInfo.id;
//         let apiUrl = `/api/statistics/${contestId}`;
//         console.log('DEBUG: API URL =', apiUrl);
//         
//         // 获取当前激活的筛选按钮
//         const activeFilter = document.querySelector('.filter-buttons .btn.active');
//         let filter = 'all';
//         if (activeFilter) {
//             filter = activeFilter.getAttribute('data-filter');
//         }
//         console.log('DEBUG: 当前筛选条件 =', filter);
//         
//         // 添加筛选参数
//         const urlParams = new URLSearchParams();
//         if (filter !== 'all') {
//             urlParams.append('filter', filter);
//         }
//         if (urlParams.toString()) {
//             apiUrl += '?' + urlParams.toString();
//         }
//         
//         // 发送请求到后端
//         console.log('DEBUG: 发送请求到', apiUrl);
//         fetch(apiUrl)
//             .then(response => {
//                 console.log('DEBUG: 收到响应', response.status);
//                 if (!response.ok) {
//                     throw new Error(`请求失败，状态码: ${response.status}`);
//                 }
//                 return response.json();
//             })
//             .then(data => {
//                 console.log('DEBUG: 数据接收成功', data);
//                 
//                 // 显示统计数据
//                 displayBasicStats(data, filter);
//             })
//             .catch(error => {
//                 console.error('DEBUG: 请求失败', error);
//                 
//                 // 恢复原始内容并显示错误信息
//                 scoreboardContainer.innerHTML = originalContent;
//                 showNotification('获取统计数据失败: ' + error.message, 'danger');
//             });
//             
//     } catch (error) {
//         console.error('DEBUG: 统计函数发生错误', error);
//         
//         // 恢复原始内容并显示错误信息
//         scoreboardContainer.innerHTML = originalContent;
//         showNotification('显示统计信息时发生错误: ' + error.message, 'danger');
//     }
// }

// 显示基本统计信息 - 不再使用这个函数，防止与scoreboard.js中的函数冲突
// function displayBasicStats(data, filter) {
//     console.log('DEBUG: 显示基本统计信息');
//     
//     // 获取排行榜表格容器
//     const scoreboardContainer = document.querySelector('.card-body .table-responsive');
//     if (!scoreboardContainer) {
//         console.error('DEBUG: 找不到排行榜容器');
//         alert('找不到排行榜容器');
//         return;
//     }
//     
//     // 保存原有内容，以便后续恢复
//     const originalContent = scoreboardContainer.innerHTML;
//     
//     // 创建统计内容
//     const statsContent = document.createElement('div');
//     statsContent.className = 'statistics-container';
//     statsContent.innerHTML = `
//         <div class="d-flex justify-content-between align-items-center mb-3">
//             <h4 class="mb-0">比赛统计</h4>
//             <button type="button" id="backToScoreboardBtn" class="btn btn-sm btn-outline-primary">
//                 <i class="bi bi-arrow-left"></i> 返回排行榜
//             </button>
//         </div>
//         
//         <!-- 基本统计数据 -->
//         <div class="row mb-4">
//             <div class="col-md-4">
//                 <div class="card text-center">
//                     <div class="card-body">
//                         <h2 class="card-title">${data.problem_count}</h2>
//                         <p class="card-text">题目数</p>
//                     </div>
//                 </div>
//             </div>
//             <div class="col-md-4">
//                 <div class="card text-center">
//                     <div class="card-body">
//                         <h2 class="card-title">${data.team_count}</h2>
//                         <p class="card-text">队伍数</p>
//                     </div>
//                 </div>
//             </div>
//             <div class="col-md-4">
//                 <div class="card text-center">
//                     <div class="card-body">
//                         <h2 class="card-title">${data.submission_count}</h2>
//                         <p class="card-text">提交数</p>
//                     </div>
//                 </div>
//             </div>
//         </div>
//         
//         <!-- 提交热力图 -->
//         <div class="card mb-4">
//             <div class="card-header">
//                 <h5 class="card-title mb-0">提交热力图</h5>
//             </div>
//             <div class="card-body">
//                 <div class="problem-heatmap">
//                     ${generateSimpleHeatmap(data.problem_stats)}
//                 </div>
//             </div>
//         </div>
//         
//         <!-- 题目提交统计 -->
//         <div class="card mb-4">
//             <div class="card-header">
//                 <h5 class="card-title mb-0">提交分类</h5>
//             </div>
//             <div class="card-body">
//                 <div class="row">
//                     ${generateSubmissionTypeStats(data.submission_types)}
//                 </div>
//             </div>
//         </div>
//         
//         <!-- 队伍过题数统计 -->
//         <div class="card">
//             <div class="card-header">
//                 <h5 class="card-title mb-0">队伍过题数统计</h5>
//             </div>
//             <div class="card-body">
//                 <div class="row">
//                     ${generateTeamSolvedStats(data.team_solved_count, data.problem_count)}
//                 </div>
//             </div>
//         </div>
//     `;
//     
//     // 替换排行榜内容为统计内容
//     scoreboardContainer.innerHTML = '';
//     scoreboardContainer.appendChild(statsContent);
//     
//     // 添加返回按钮事件
//     document.getElementById('backToScoreboardBtn').addEventListener('click', function() {
//         // 恢复原来的排行榜内容
//         scoreboardContainer.innerHTML = originalContent;
//         console.log('DEBUG: 已恢复排行榜');
//     });
//     
//     console.log('DEBUG: 统计数据显示成功');
// }

// 下面的函数不再使用，应该使用scoreboard.js中定义的版本
// function generateSimpleHeatmap(problemStats) {
//     // ...
// }
// 
// function generateSubmissionBlocks(count, type) {
//     // ...
// }

// 这些辅助函数在scoreboard.js中不存在，如果需要可以保留
function generateSubmissionTypeStats(submissionTypes) {
    let html = '';
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
    
    const colorMap = {
        'accepted': '#28a745', // 绿色
        'rejected': '#dc3545', // 红色
        'frozen': '#ffc107',   // 黄色
        'pending': '#6c757d',  // 灰色
        'wrong_answer': '#fd7e14', // 橙色
        'time_limit_exceeded': '#6610f2', // 紫色
        'memory_limit_exceeded': '#20c997', // 青色
        'runtime_error': '#e83e8c', // 粉色
        'compilation_error': '#17a2b8' // 蓝绿色
    };
    
    // 计算总提交数
    let totalSubmissions = 0;
    for (const count of Object.values(submissionTypes)) {
        totalSubmissions += count;
    }
    
    // 按提交数量排序
    const sortedTypes = Object.entries(submissionTypes).sort((a, b) => b[1] - a[1]);
    
    for (const [type, count] of sortedTypes) {
        const displayType = typeMap[type] || type;
        const color = colorMap[type] || '#007bff';
        const percentage = totalSubmissions > 0 ? (count / totalSubmissions * 100).toFixed(1) : 0;
        
        html += `
            <div class="col-md-6 col-lg-4 mb-3">
                <div class="d-flex align-items-center">
                    <div class="stats-color-box" style="width: 16px; height: 16px; background-color: ${color}; margin-right: 8px;"></div>
                    <div class="flex-grow-1">
                        <div class="d-flex justify-content-between">
                            <span>${displayType}</span>
                            <small class="text-muted">${count} (${percentage}%)</small>
                        </div>
                        <div class="progress" style="height: 6px;">
                            <div class="progress-bar" role="progressbar" style="width: ${percentage}%; background-color: ${color}" aria-valuenow="${percentage}" aria-valuemin="0" aria-valuemax="100"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    return html;
}

// 生成队伍过题数统计
function generateTeamSolvedStats(teamSolvedCount, problemCount) {
    let html = '';
    
    // 计算总队伍数
    let totalTeams = 0;
    for (const count of Object.values(teamSolvedCount)) {
        totalTeams += count;
    }
    
    for (let i = 0; i <= problemCount; i++) {
        const count = teamSolvedCount[i] || 0;
        const percentage = totalTeams > 0 ? (count / totalTeams * 100).toFixed(1) : 0;
        
        html += `
            <div class="col-md-6 col-lg-4 mb-3">
                <div class="d-flex align-items-center">
                    <span style="width: 40px; text-align: center;">${i}</span>
                    <div class="flex-grow-1">
                        <div class="d-flex justify-content-between">
                            <span>题</span>
                            <small class="text-muted">${count}队 (${percentage}%)</small>
                        </div>
                        <div class="progress" style="height: 8px;">
                            <div class="progress-bar bg-info" role="progressbar" style="width: ${percentage}%" aria-valuenow="${percentage}" aria-valuemin="0" aria-valuemax="100"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    return html;
}

// 使用一个简单的通知函数，当scoreboard.js中的函数不可用时使用
function showNotification(message, type = 'info') {
    if (window.showNotification) {
        // 如果存在全局通知函数，优先使用
        window.showNotification(message, type);
        return;
    }
    
    // 否则使用自己的实现
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