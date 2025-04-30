package model

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

// Contest 表示一个比赛
type Contest struct {
	ID             string                    `json:"id"`
	Name           string                    `json:"contest_name"`
	StartTime      int64                     `json:"start_time"`
	EndTime        int64                     `json:"end_time"`
	FrozenTime     int64                     `json:"frozen_time"`
	Penalty        int64                     `json:"penalty"`
	ProblemCount   int                       `json:"problem_quantity"`
	ProblemIDs     []string                  `json:"problem_id"`
	Groups         map[string]string         `json:"group"`
	Organization   string                    `json:"organization"`
	StatusTimeShow map[string]bool           `json:"status_time_display"`
	MedalRanks     map[string]map[string]int `json:"medal"`
	BalloonColors  []BalloonColor            `json:"balloon_color"`
	Logo           Logo                      `json:"logo"`
	Banner         Banner                    `json:"banner"`
	Options        ContestOptions            `json:"options"`

	// 存储数据目录，用于按需加载
	dataDir string `json:"-"`
}

// BalloonColor 表示气球颜色
type BalloonColor struct {
	Color           string `json:"color"`
	BackgroundColor string `json:"background_color"`
}

// Logo 表示比赛logo
type Logo struct {
	Preset string `json:"preset"`
}

// Banner 表示比赛banner
type Banner struct {
	URL string `json:"url"`
}

// ContestOptions 比赛选项
type ContestOptions struct {
	SubmissionTimestampUnit string `json:"submission_timestamp_unit"`
}

// Team 表示一个参赛队伍
type Team struct {
	ID           string   `json:"team_id"`
	Name         string   `json:"name"`
	Organization string   `json:"organization"`
	Coach        string   `json:"coach,omitempty"`
	Members      []string `json:"members,omitempty"`
	Groups       []string `json:"group"`

	// 额外属性
	IsUndergraduate bool `json:"undergraduate,omitempty"`
	IsGirl          bool `json:"girl,omitempty"`
	IsVocational    bool `json:"vocational,omitempty"`
}

// Run 表示一次提交记录
type Run struct {
	ID        string `json:"submission_id"`
	Status    string `json:"status"`
	TeamID    string `json:"team_id"`
	ProblemID int    `json:"problem_id"`
	Timestamp int64  `json:"timestamp"`
	Language  string `json:"language"`
}

// Result 表示队伍的比赛结果
type Result struct {
	TeamID         string                    `json:"team_id"`
	Team           *Team                     `json:"team"`
	Rank           int                       `json:"rank"`
	Score          int                       `json:"score"`
	TotalTime      int64                     `json:"total_time"`
	ProblemResults map[string]*ProblemResult `json:"problem_results"`
}

// ProblemResult 表示一个题目的结果
type ProblemResult struct {
	ProblemID       string `json:"problem_id"`
	Attempts        int    `json:"attempts"`
	Solved          bool   `json:"solved"`
	SolvedTime      int64  `json:"solved_time,omitempty"`
	PenaltyTime     int64  `json:"penalty_time,omitempty"`
	FirstToSolve    bool   `json:"first_to_solve,omitempty"`
	IsFrozen        bool   `json:"is_frozen,omitempty"`
	PendingAttempts int    `json:"pending_attempts,omitempty"`
}

// LoadContestConfig 只加载比赛的基本配置信息
func LoadContestConfig(dataDir, contestID string) (*Contest, error) {
	contestDir := filepath.Join(dataDir, filepath.FromSlash(contestID))

	// 加载配置
	configPath := filepath.Join(contestDir, "config.json")
	configData, err := os.ReadFile(configPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read config.json: %w", err)
	}

	var contest Contest
	if err := json.Unmarshal(configData, &contest); err != nil {
		return nil, fmt.Errorf("failed to parse config.json: %w", err)
	}

	contest.ID = contestID
	// 保存数据目录路径，用于后续按需加载
	contest.dataDir = dataDir

	return &contest, nil
}

// LoadAllContests 加载所有比赛的基本配置
func LoadAllContests(dataDir string) (map[string]*Contest, error) {
	contestsMap := make(map[string]*Contest)

	// 递归扫描数据目录
	err := filepath.Walk(dataDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		// 检查是否是config.json文件
		if !info.IsDir() && info.Name() == "config.json" {
			// 获取比赛ID (基于目录路径)
			relPath, err := filepath.Rel(dataDir, filepath.Dir(path))
			if err != nil {
				return err
			}

			contestID := strings.Replace(relPath, string(filepath.Separator), "/", -1)

			// 只加载比赛基本配置
			contest, err := LoadContestConfig(dataDir, contestID)
			if err != nil {
				return err
			}

			contestsMap[contestID] = contest
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	return contestsMap, nil
}

// LoadTeams 按需加载队伍数据
func (c *Contest) LoadTeams() (map[string]*Team, error) {
	if c.dataDir == "" {
		return nil, fmt.Errorf("dataDir not set, cannot load teams")
	}

	contestDir := filepath.Join(c.dataDir, filepath.FromSlash(c.ID))

	// 加载队伍数据
	teamPath := filepath.Join(contestDir, "team.json")
	teamData, err := os.ReadFile(teamPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read team.json: %w", err)
	}

	var teamsMap map[string]*Team
	if err := json.Unmarshal(teamData, &teamsMap); err != nil {
		return nil, fmt.Errorf("failed to parse team.json: %w", err)
	}

	return teamsMap, nil
}

// LoadRuns 按需加载提交记录
func (c *Contest) LoadRuns() ([]*Run, error) {
	if c.dataDir == "" {
		return nil, fmt.Errorf("dataDir not set, cannot load runs")
	}

	contestDir := filepath.Join(c.dataDir, filepath.FromSlash(c.ID))

	// 加载提交记录
	runPath := filepath.Join(contestDir, "run.json")
	runData, err := os.ReadFile(runPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read run.json: %w", err)
	}

	var runs []*Run
	if err := json.Unmarshal(runData, &runs); err != nil {
		return nil, fmt.Errorf("failed to parse run.json: %w", err)
	}

	return runs, nil
}

// LoadContest 加载单个比赛的基本数据(但不加载Teams和Runs)
func LoadContest(dataDir, contestID string) (*Contest, error) {
	// 使用LoadContestConfig加载基本配置
	contest, err := LoadContestConfig(dataDir, contestID)
	if err != nil {
		return nil, err
	}

	// 设置数据目录
	contest.dataDir = dataDir

	return contest, nil
}

// CalculateResults 计算比赛结果
func (c *Contest) CalculateResults() ([]*Result, error) {
	// 按需加载队伍数据
	teams, err := c.LoadTeams()
	if err != nil {
		return nil, fmt.Errorf("failed to load teams: %w", err)
	}

	// 按需加载提交记录
	runs, err := c.LoadRuns()
	if err != nil {
		return nil, fmt.Errorf("failed to load runs: %w", err)
	}

	// 创建结果映射
	resultsMap := make(map[string]*Result)

	// 初始化结果
	for teamID, team := range teams {
		result := &Result{
			TeamID:         teamID,
			Team:           team,
			ProblemResults: make(map[string]*ProblemResult),
		}

		// 初始化每个题目的结果
		for _, problemID := range c.ProblemIDs {
			result.ProblemResults[problemID] = &ProblemResult{
				ProblemID: problemID,
			}
		}

		resultsMap[teamID] = result
	}

	// 处理提交记录
	for _, run := range runs {
		// 跳过jury提交
		if run.TeamID == "jury" {
			continue
		}

		// 获取队伍结果
		result, ok := resultsMap[run.TeamID]
		if !ok {
			continue
		}

		// 查找对应题目ID
		if run.ProblemID >= len(c.ProblemIDs) {
			continue
		}
		problemID := c.ProblemIDs[run.ProblemID]

		// 获取题目结果
		problemResult, ok := result.ProblemResults[problemID]
		if !ok {
			continue
		}

		// 如果题目已解决，跳过后续提交
		if problemResult.Solved {
			continue
		}

		// 检查是否在封榜时间内
		isFrozen := c.EndTime-run.Timestamp <= c.FrozenTime

		// 根据状态处理
		switch run.Status {
		case "ACCEPTED":
			if isFrozen {
				problemResult.IsFrozen = true
				problemResult.PendingAttempts++
			} else {
				problemResult.Solved = true
				problemResult.SolvedTime = run.Timestamp - c.StartTime
				problemResult.PenaltyTime = problemResult.SolvedTime + int64(problemResult.Attempts)*c.Penalty

				// 更新总分和时间
				result.Score++
				result.TotalTime += problemResult.PenaltyTime
			}
		case "WRONG_ANSWER", "TIME_LIMIT_EXCEEDED", "RUNTIME_ERROR", "COMPILATION_ERROR":
			if isFrozen {
				problemResult.IsFrozen = true
				problemResult.PendingAttempts++
			} else {
				problemResult.Attempts++
			}
		}
	}

	// 标记第一个解出的队伍
	firstSolved := make(map[string]int64)
	for _, result := range resultsMap {
		for problemID, pr := range result.ProblemResults {
			if pr.Solved && (!pr.IsFrozen) {
				if firstTime, ok := firstSolved[problemID]; !ok || pr.SolvedTime < firstTime {
					firstSolved[problemID] = pr.SolvedTime
				}
			}
		}
	}

	// 设置first to solve标记
	for _, result := range resultsMap {
		for problemID, pr := range result.ProblemResults {
			if pr.Solved && pr.SolvedTime == firstSolved[problemID] {
				pr.FirstToSolve = true
			}
		}
	}

	// 按分数和罚时进行排序
	var resultsList []*Result
	for _, result := range resultsMap {
		resultsList = append(resultsList, result)
	}

	sort.Slice(resultsList, func(i, j int) bool {
		// 首先按解题数量排序（降序）
		if resultsList[i].Score != resultsList[j].Score {
			return resultsList[i].Score > resultsList[j].Score
		}

		// 如果解题数量相同，按罚时排序（升序）
		return resultsList[i].TotalTime < resultsList[j].TotalTime
	})

	// 设置排名
	for i, result := range resultsList {
		result.Rank = i + 1

		// 处理并列排名
		if i > 0 {
			prev := resultsList[i-1]
			if prev.Score == result.Score && prev.TotalTime == result.TotalTime {
				result.Rank = prev.Rank
			}
		}
	}

	return resultsList, nil
}

// GetVisibleResults 获取当前可见的结果（考虑封榜）
func (c *Contest) GetVisibleResults() ([]*Result, error) {
	// 计算结果
	results, err := c.CalculateResults()
	if err != nil {
		return nil, err
	}

	// 按排名排序
	sort.Slice(results, func(i, j int) bool {
		return results[i].Rank < results[j].Rank
	})

	return results, nil
}

// GetFilteredResults 获取过滤后的结果
func (c *Contest) GetFilteredResults(group string) ([]*Result, error) {
	// 计算结果
	allResults, err := c.CalculateResults()
	if err != nil {
		return nil, err
	}

	var results []*Result

	for _, result := range allResults {
		// 如果指定了组别，则过滤
		if group != "" {
			found := false
			for _, g := range result.Team.Groups {
				if g == group {
					found = true
					break
				}
			}

			if !found {
				continue
			}
		}

		results = append(results, result)
	}

	// 按排名排序
	sort.Slice(results, func(i, j int) bool {
		return results[i].Rank < results[j].Rank
	})

	return results, nil
}
