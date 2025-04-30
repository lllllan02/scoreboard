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

		contests := svc.GetAllContests()
		data := map[string]interface{}{
			"Title":    "XCPC记分板",
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
			http.NotFound(w, r)
			return
		}

		// 获取分组信息
		groups, err := svc.GetContestGroups(contestID)
		if err != nil {
			http.Error(w, "Internal Server Error", http.StatusInternalServerError)
			return
		}

		// 获取比赛状态
		status, err := svc.GetContestStatus(contestID)
		if err != nil {
			http.Error(w, "Internal Server Error", http.StatusInternalServerError)
			return
		}

		// 获取时间信息
		timeInfo, err := svc.GetTimeInfo(contestID)
		if err != nil {
			http.Error(w, "Internal Server Error", http.StatusInternalServerError)
			return
		}

		// 准备模板数据
		data := map[string]interface{}{
			"Title":        contest.Name,
			"Contest":      contest,
			"ContestID":    contestID,
			"Groups":       groups,
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

		// 获取分组过滤参数
		group := r.URL.Query().Get("group")
		log.Printf("过滤组别: %s", group)

		// 获取记分板数据和比赛对象（一次性获取，避免重复调用）
		results, contest, err := svc.GetScoreboard(contestID, group)
		if err != nil {
			log.Printf("获取记分板数据失败: %v", err)
			if strings.Contains(err.Error(), "not found") {
				http.NotFound(w, r)
			} else {
				http.Error(w, "Internal Server Error", http.StatusInternalServerError)
			}
			return
		}

		log.Printf("获取到 %d 条结果记录", len(results))

		// 直接返回完整的contest对象和结果
		response := map[string]interface{}{
			"contest": contest,
			"results": results,
		}

		log.Printf("返回记分板数据成功")
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
