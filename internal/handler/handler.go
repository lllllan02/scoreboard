package handler

import (
	"encoding/json"
	"html/template"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/lllllan02/scoreboard/internal/service"
)

var (
	// 添加自定义模板函数
	funcMap = template.FuncMap{
		"now": time.Now,
		"add": func(a, b int) int {
			return a + b
		},
	}

	templates = template.Must(template.New("").Funcs(funcMap).ParseGlob("web/templates/*.html"))
)

// IndexHandler 处理首页请求
func IndexHandler(svc *service.ScoreboardService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/" {
			http.NotFound(w, r)
			return
		}

		contests, err := svc.GetAllContests()
		if err != nil {
			log.Printf("Error getting contests: %v", err)
			http.Error(w, "Internal Server Error", http.StatusInternalServerError)
			return
		}

		data := map[string]interface{}{
			"Title":    "Scoreboard",
			"Contests": contests,
		}

		if err := templates.ExecuteTemplate(w, "index.html", data); err != nil {
			log.Printf("Error rendering template: %v", err)
			http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		}
	}
}

// ContestHandler 处理比赛页面请求
func ContestHandler(svc *service.ScoreboardService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// 从URL中获取比赛ID
		contestID := strings.TrimPrefix(r.URL.Path, "/contest/")

		// 获取比赛信息
		contest, err := svc.GetContest(contestID)
		if err != nil {
			log.Printf("获取比赛信息失败: %v", err)
			http.NotFound(w, r)
			return
		}

		// 直接使用contest对象的方法获取状态和时间信息
		status := contest.GetStatus()
		timeInfo := contest.GetTimeInfo()

		// 准备模板数据
		data := map[string]interface{}{
			"Title":        contest.Name,
			"Contest":      contest,
			"ContestID":    contestID,
			"Groups":       contest.Groups, // 直接从contest中获取
			"Status":       status,
			"TimeInfo":     timeInfo,
			"ProblemIDs":   contest.ProblemIDs,
			"ProblemCount": contest.ProblemCount,
		}

		if err := templates.ExecuteTemplate(w, "contest.html", data); err != nil {
			log.Printf("Error rendering template: %v", err)
			http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		}
	}
}

// ScoreboardHandler 处理获取记分板数据的API请求
func ScoreboardHandler(svc *service.ScoreboardService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// 从URL中获取比赛ID
		parts := strings.Split(r.URL.Path, "/")
		if len(parts) < 4 {
			log.Printf("无效的URL路径: %s", r.URL.Path)
			http.NotFound(w, r)
			return
		}

		contestID := strings.TrimPrefix(r.URL.Path, "/api/scoreboard/")
		log.Printf("获取比赛ID: %s", contestID)

		// 获取筛选参数
		filter := r.URL.Query().Get("filter")

		// 使用统一的筛选方法获取数据
		results, contest, err := svc.GetScoreboardWithFilter(contestID, filter)
		if err != nil {
			log.Printf("获取记分板数据失败: %v", err)
			if strings.Contains(err.Error(), "not found") {
				http.NotFound(w, r)
			} else {
				http.Error(w, "Internal Server Error", http.StatusInternalServerError)
			}
			return
		}

		log.Printf("获取到结果记录，共 %d 条", len(results))

		// 返回完整的contest对象和结果
		response := map[string]interface{}{
			"contest": contest,
			"results": results,
		}

		respondJSON(w, http.StatusOK, response)
	}
}

// respondJSON 发送JSON响应
func respondJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)

	if err := json.NewEncoder(w).Encode(data); err != nil {
		log.Printf("Error encoding JSON: %v", err)
	}
}

// StatisticsHandler 处理获取比赛统计信息的API请求
func StatisticsHandler(svc *service.ScoreboardService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// 从URL中获取比赛ID
		parts := strings.Split(r.URL.Path, "/")
		if len(parts) < 4 {
			log.Printf("无效的URL路径: %s", r.URL.Path)
			http.NotFound(w, r)
			return
		}

		contestID := strings.TrimPrefix(r.URL.Path, "/api/statistics/")
		log.Printf("获取比赛统计信息: %s", contestID)

		// 获取筛选参数
		filter := r.URL.Query().Get("filter")

		// 使用服务层获取统计数据
		stats, err := svc.GetContestStatistics(contestID, filter)
		if err != nil {
			log.Printf("获取统计数据失败: %v", err)
			if strings.Contains(err.Error(), "not found") {
				http.NotFound(w, r)
			} else {
				http.Error(w, "Internal Server Error", http.StatusInternalServerError)
			}
			return
		}

		log.Printf("成功获取统计数据")
		respondJSON(w, http.StatusOK, stats)
	}
}

// SubmissionsHandler 处理获取提交记录的API请求
func SubmissionsHandler(svc *service.ScoreboardService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// 从URL中获取比赛ID
		parts := strings.Split(r.URL.Path, "/")
		if len(parts) < 4 {
			log.Printf("无效的URL路径: %s", r.URL.Path)
			http.NotFound(w, r)
			return
		}

		contestID := strings.TrimPrefix(r.URL.Path, "/api/submissions/")
		log.Printf("获取比赛提交记录: %s", contestID)

		// 获取筛选参数
		filter := r.URL.Query().Get("filter")

		// 使用服务层获取提交记录
		submissions, err := svc.GetSubmissions(contestID, filter)
		if err != nil {
			log.Printf("获取提交记录失败: %v", err)
			if strings.Contains(err.Error(), "not found") {
				http.NotFound(w, r)
			} else {
				http.Error(w, "Internal Server Error", http.StatusInternalServerError)
			}
			return
		}

		// 返回提交记录
		log.Printf("成功获取提交记录，共 %d 条", len(submissions))
		respondJSON(w, http.StatusOK, submissions)
	}
}
