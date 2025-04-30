/**
 * 通用JavaScript功能
 */

// 格式化时间为分钟数
function formatDuration(milliseconds) {
    if (milliseconds < 0) {
        return "0";
    }
    
    // 将毫秒转换为分钟，四舍五入到整数
    const totalMinutes = Math.round((milliseconds / 1000) / 60);
    return totalMinutes.toString();
}

// 格式化日期
function formatDateTime(timestamp) {
    const date = new Date(timestamp * 1000);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// 获取当前时间戳（秒）
function getCurrentTimestamp() {
    return Math.floor(Date.now() / 1000);
}

// 显示通知
function showNotification(message, type = 'info') {
    // 创建通知元素
    const notification = document.createElement('div');
    notification.className = `alert alert-${type} alert-dismissible fade show notification`;
    notification.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    // 添加到页面
    const container = document.createElement('div');
    container.className = 'notification-container';
    container.style.position = 'fixed';
    container.style.top = '1rem';
    container.style.right = '1rem';
    container.style.zIndex = '9999';
    container.appendChild(notification);
    document.body.appendChild(container);
    
    // 自动关闭
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(container);
        }, 300);
    }, 3000);
}

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
    // 初始化引导工具提示
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function(tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
}); 