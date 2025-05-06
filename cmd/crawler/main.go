package main

import (
	"flag"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"

	"github.com/lllllan02/scoreboard/internal/model"
)

func main() {
	url := flag.String("url", "https://board.xcpcio.com/icpc/50th/wuhan-invitational", "url to crawl")
	flag.Parse()

	//
	contestId := strings.TrimPrefix(*url, "https://board.xcpcio.com/")

	//
	path := fmt.Sprintf("data/%v", contestId)
	if err := os.MkdirAll(path, 0755); err != nil {
		fmt.Println()
		return
	}

	crawlAndSave(fmt.Sprintf("%s/config.json", path))

	crawlAndSave(fmt.Sprintf("%s/team.json", path))

	crawlAndSave(fmt.Sprintf("%s/run.json", path))

	contest, err := model.LoadContestConfig(contestId)
	if err == nil {
		if err := model.AddContestToDirectory(contest); err != nil {
			fmt.Println(err)
		}
	}
}

func crawlAndSave(path string) (string, error) {
	url := fmt.Sprintf("https://board.xcpcio.com/%s", path)

	resp, err := http.Get(url)
	if err != nil {
		fmt.Println()
		return "", err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		fmt.Println()
		return "", err
	}

	// 保存到文件
	if err := os.WriteFile(path, body, 0644); err != nil {
		fmt.Println()
		return "", err
	}

	return string(body), nil
}
