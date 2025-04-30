package main

import (
	"log"
	"net/http"
	"os"

	"github.com/lllllan02/scoreboard/internal/handler"
	"github.com/lllllan02/scoreboard/internal/model"
	"github.com/lllllan02/scoreboard/internal/service"
)

func main() {
	// 初始化数据
	dataDir := "data"
	contestsMap, err := model.LoadAllContests(dataDir)
	if err != nil {
		log.Fatalf("Failed to load contests: %v", err)
	}

	// 初始化服务层
	scoreSvc := service.NewScoreboardService(contestsMap)

	// 设置静态文件服务
	staticDir := http.FileServer(http.Dir("web/static"))
	http.Handle("/static/", http.StripPrefix("/static/", staticDir))

	// 注册路由处理器
	http.HandleFunc("/", handler.IndexHandler(scoreSvc))
	http.HandleFunc("/contest/", handler.ContestHandler(scoreSvc))
	http.HandleFunc("/api/scoreboard/", handler.ScoreboardHandler(scoreSvc))

	// 启动服务器
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	log.Printf("Server starting on :%s", port)
	if err := http.ListenAndServe(":"+port, nil); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}
