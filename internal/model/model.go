package model

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"
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
	Type           string                    `json:"type,omitempty"`
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
	SchoolRank     int                       `json:"school_rank"`
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

// ContestDirectory 比赛目录结构
type ContestDirectory struct {
	Contests map[string]ContestInfo `json:"contests"`
}

// ContestInfo 目录中存储的比赛基本信息（仅首页需要的字段）
type ContestInfo struct {
	ID           string `json:"id"`
	Name         string `json:"contest_name"`
	StartTime    int64  `json:"start_time"`
	EndTime      int64  `json:"end_time"`
	Organization string `json:"organization"`
	Type         string `json:"type,omitempty"`
}

const dataDir = "data"

// LoadContestConfig 只加载比赛的基本配置信息
func LoadContestConfig(contestID string) (*Contest, error) {
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
func LoadAllContests() (map[string]*Contest, error) {
	contestsMap := make(map[string]*Contest)

	// 尝试从目录文件加载比赛列表
	dirPath := filepath.Join(dataDir, "directory.json")
	dirData, err := os.ReadFile(dirPath)

	// 如果目录文件存在，直接从目录加载基本信息，然后按需加载详细配置
	if err == nil {
		var directory ContestDirectory
		if err := json.Unmarshal(dirData, &directory); err != nil {
			return nil, fmt.Errorf("failed to parse directory.json: %w", err)
		}

		// 直接使用目录中的基本信息创建Contest对象
		for contestID, contestInfo := range directory.Contests {
			contest := &Contest{
				ID:           contestID,
				Name:         contestInfo.Name,
				StartTime:    contestInfo.StartTime,
				EndTime:      contestInfo.EndTime,
				Organization: contestInfo.Organization,
				Type:         contestInfo.Type,
				dataDir:      dataDir,
			}
			contestsMap[contestID] = contest
		}

		return contestsMap, nil
	}

	// 如果目录文件不存在，回退到旧方法:递归扫描数据目录
	contestInfoMap := make(map[string]ContestInfo)
	err = filepath.Walk(dataDir, func(path string, info os.FileInfo, err error) error {
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

			// 加载比赛基本配置
			contest, err := LoadContestConfig(contestID)
			if err != nil {
				return err
			}

			// 保存到结果map
			contestsMap[contestID] = contest

			// 为目录文件只准备首页所需的数据
			contestType := "Other" // 默认类型
			if strings.Contains(strings.ToLower(contest.Name), "provincial") {
				contestType = "Provincial"
			}

			contestInfoMap[contestID] = ContestInfo{
				ID:           contest.ID,
				Name:         contest.Name,
				StartTime:    contest.StartTime,
				EndTime:      contest.EndTime,
				Organization: contest.Organization,
				Type:         contestType,
			}
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	// 创建目录文件以便将来使用
	if len(contestInfoMap) > 0 {
		if err := UpdateContestDirectory(contestInfoMap); err != nil {
			// 只记录错误，不影响返回结果
			fmt.Printf("Warning: failed to create contest directory: %v\n", err)
		}
	}

	return contestsMap, nil
}

// UpdateContestDirectory 更新比赛目录文件
func UpdateContestDirectory(contestInfoMap map[string]ContestInfo) error {
	directory := ContestDirectory{
		Contests: contestInfoMap,
	}

	dirData, err := json.MarshalIndent(directory, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal directory data: %w", err)
	}

	dirPath := filepath.Join(dataDir, "directory.json")
	if err := os.WriteFile(dirPath, dirData, 0644); err != nil {
		return fmt.Errorf("failed to write directory.json: %w", err)
	}

	return nil
}

// AddContestToDirectory 向目录添加新比赛
func AddContestToDirectory(contest *Contest) error {
	// 尝试加载现有的目录
	dirPath := "data/directory.json"
	var directory ContestDirectory

	dirData, err := os.ReadFile(dirPath)
	if err == nil {
		// 目录文件存在，解析现有数据
		if err := json.Unmarshal(dirData, &directory); err != nil {
			return fmt.Errorf("failed to parse directory.json: %w", err)
		}
	} else {
		// 目录不存在，创建新的
		directory = ContestDirectory{
			Contests: make(map[string]ContestInfo),
		}
	}

	// 确定比赛类型
	contestType := "Other" // 默认类型
	if strings.Contains(strings.ToLower(contest.Name), "provincial") {
		contestType = "Provincial"
	}

	// 添加或更新比赛信息
	directory.Contests[contest.ID] = ContestInfo{
		ID:           contest.ID,
		Name:         contest.Name,
		StartTime:    contest.StartTime,
		EndTime:      contest.EndTime,
		Organization: contest.Organization,
		Type:         contestType,
	}

	// 写回目录文件
	newDirData, err := json.MarshalIndent(directory, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal directory data: %w", err)
	}

	if err := os.WriteFile(dirPath, newDirData, 0644); err != nil {
		return fmt.Errorf("failed to write directory.json: %w", err)
	}

	return nil
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
		// 结合当前时间是否在封榜时间内
		var isFrozen bool
		if now := time.Now().Unix(); now >= c.EndTime-c.FrozenTime && now <= c.EndTime {
			// 比赛总时长减去提交的相对时间戳（毫秒转换为秒），如果小于等于封榜时间，则在封榜范围内
			isFrozen = (c.EndTime-c.StartTime)-run.Timestamp/1000 <= c.FrozenTime
		}

		// 根据状态处理
		switch run.Status {
		case "ACCEPTED":
			if isFrozen {
				problemResult.IsFrozen = true
				problemResult.PendingAttempts++
			} else {
				problemResult.Solved = true
				// run.Timestamp 是毫秒级的相对时间戳，需要转换为秒，再转换为分钟
				problemResult.SolvedTime = (run.Timestamp / 1000) / 60
				// 计算罚时：解题时间(分钟)加上之前错误尝试的罚时(分钟)
				problemResult.PenaltyTime = problemResult.SolvedTime + int64(problemResult.Attempts)*(c.Penalty/60)

				// 更新总分和时间（以分钟为单位）
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

	// 计算学校排名
	schoolRankMap := make(map[string]int) // 学校名称 -> 排名
	currentRank := 0                      // 当前学校排名

	// 按照队伍排名顺序遍历，为每个不同的学校分配排名
	for _, result := range resultsList {
		school := result.Team.Organization
		if school == "" {
			continue // 跳过没有学校信息的队伍
		}

		// 如果这个学校已经有排名了，就跳过
		if _, exists := schoolRankMap[school]; exists {
			continue
		}

		// 为新学校分配排名
		currentRank++
		schoolRankMap[school] = currentRank
	}

	// 将学校排名保存到队伍结果中
	for _, result := range resultsList {
		school := result.Team.Organization
		if rank, exists := schoolRankMap[school]; exists {
			result.SchoolRank = rank
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
