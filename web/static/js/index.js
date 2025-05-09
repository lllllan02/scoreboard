// 简单搜索功能
document.addEventListener('DOMContentLoaded', function() {
    document.querySelector('.search-box').addEventListener('input', function(e) {
        const query = e.target.value.toLowerCase();
        document.querySelectorAll('.contest-card').forEach(card => {
            const title = card.querySelector('.contest-title').textContent.toLowerCase();
            card.style.display = title.includes(query) ? 'block' : 'none';
        });
    });

    // 计算比赛进度
    document.querySelectorAll('.contest-card').forEach(card => {
        const progressBar = card.querySelector('.progress-bar.bg-primary');
        if (progressBar) {
            // 获取开始和结束时间
            const timeInfo = card.querySelector('.contest-time').textContent;
            const startTimeMatch = timeInfo.match(/开始: (\d{4}-\d{2}-\d{2} \d{2}:\d{2})/);
            const endTimeMatch = timeInfo.match(/结束: (\d{4}-\d{2}-\d{2} \d{2}:\d{2})/);
            
            if (startTimeMatch && endTimeMatch) {
                const startTime = new Date(startTimeMatch[1].replace(/-/g, '/'));
                const endTime = new Date(endTimeMatch[1].replace(/-/g, '/'));
                const now = new Date();
                
                if (now >= startTime && now <= endTime) {
                    const totalDuration = endTime - startTime;
                    const elapsed = now - startTime;
                    const percent = Math.min(Math.round((elapsed / totalDuration) * 100), 100);
                    
                    progressBar.style.width = percent + '%';
                    progressBar.setAttribute('aria-valuenow', percent);
                }
            }
        }
    });
}); 