package service

import (
	"fmt"
	"sort"
	"time"

	"github.com/lllllan02/scoreboard/internal/model"
)

// ScoreboardService 提供记分板相关的服务
type ScoreboardService struct {
	// 不再需要缓存
}

// ContestInfo 比赛基本信息
type ContestInfo struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	StartTime time.Time `json:"start_time"`
	EndTime   time.Time `json:"end_time"`
	Type      string    `json:"type"`
}

// NewScoreboardService 创建一个新的记分板服务
func NewScoreboardService() *ScoreboardService {
	return &ScoreboardService{}
}

// GetAllContests 获取所有比赛信息
func (s *ScoreboardService) GetAllContests() ([]ContestInfo, error) {
	// 直接从目录文件读取
	contests, err := model.LoadAllContests()
	if err != nil {
		return nil, fmt.Errorf("failed to load contests: %w", err)
	}

	var contestInfos []ContestInfo
	for id, contest := range contests {
		info := ContestInfo{
			ID:        id,
			Name:      contest.Name,
			StartTime: time.Unix(contest.StartTime, 0),
			EndTime:   time.Unix(contest.EndTime, 0),
		}

		// 设置比赛类型（根据比赛ID的前缀确定）
		if len(id) >= 4 && id[:4] == "icpc" {
			info.Type = "ICPC"
		} else if len(id) >= 4 && id[:4] == "ccpc" {
			info.Type = "CCPC"
		} else if len(id) >= 10 && id[:10] == "provincial" {
			info.Type = "Provincial"
		} else {
			info.Type = "Other"
		}

		contestInfos = append(contestInfos, info)
	}

	// 按开始时间排序，最近的比赛排在前面
	sort.Slice(contestInfos, func(i, j int) bool {
		return contestInfos[i].StartTime.After(contestInfos[j].StartTime)
	})

	return contestInfos, nil
}

// GetContest 获取指定比赛
func (s *ScoreboardService) GetContest(contestID string) (*model.Contest, error) {
	contest, err := model.LoadContestConfig(contestID)
	if err != nil {
		return nil, fmt.Errorf("contest not found: %s", err)
	}

	return contest, nil
}

// GetContestStatus 获取比赛状态 - 使用模型层方法
func (s *ScoreboardService) GetContestStatus(contest *model.Contest) string {
	return contest.GetStatus()
}

// GetTimeInfo 获取比赛时间信息 - 使用模型层方法
func (s *ScoreboardService) GetTimeInfo(contest *model.Contest) map[string]interface{} {
	return contest.GetTimeInfo()
}

// GetScoreboardWithFilter 统一处理所有筛选参数获取记分板数据
func (s *ScoreboardService) GetScoreboardWithFilter(contestID string, filter string) ([]*model.Result, *model.Contest, error) {
	// 获取比赛信息
	contest, err := s.GetContest(contestID)
	if err != nil {
		return nil, nil, err
	}

	// 获取所有可见结果（原始数据，不包含排名）
	results, err := contest.GetVisibleResults()
	if err != nil {
		return nil, nil, fmt.Errorf("failed to get results: %w", err)
	}

	// 进行筛选（如果需要）
	if filter != "" && filter != "all" {
		results, err = FilterResults(results, filter)
		if err != nil {
			return nil, nil, fmt.Errorf("failed to filter results: %w", err)
		}
	}

	// 计算排名和首A
	RecalculateRanking(results)

	return results, contest, nil
}

// FilterResults 根据筛选条件过滤结果
func FilterResults(results []*model.Result, filter string) ([]*model.Result, error) {
	// 根据筛选条件过滤结果
	var filteredResults []*model.Result
	for _, result := range results {
		switch filter {
		case "official": // 正式队伍
			isOfficial := true
			for _, group := range result.Team.Groups {
				if group == "unofficial" {
					isOfficial = false
					break
				}
			}
			if isOfficial {
				filteredResults = append(filteredResults, result)
			}
		case "unofficial": // 打星队伍
			for _, group := range result.Team.Groups {
				if group == "unofficial" {
					filteredResults = append(filteredResults, result)
					break
				}
			}
		case "girls": // 女队
			if result.Team.IsGirl {
				filteredResults = append(filteredResults, result)
			}
		case "undergraduate": // 本科组
			if result.Team.IsUndergraduate {
				filteredResults = append(filteredResults, result)
			}
		case "special": // 专科组
			if result.Team.IsVocational {
				filteredResults = append(filteredResults, result)
			}
		default:
			// 其他自定义筛选条件（按组别筛选）
			for _, group := range result.Team.Groups {
				if group == filter {
					filteredResults = append(filteredResults, result)
					break
				}
			}
		}
	}

	return filteredResults, nil
}

// RecalculateRanking 重新计算筛选后的排名、学校排名和首A
func RecalculateRanking(results []*model.Result) {
	// 1. 排名计算
	// 按解题数和罚时排序
	sort.Slice(results, func(i, j int) bool {
		// 首先按解题数量排序（降序）
		if results[i].Score != results[j].Score {
			return results[i].Score > results[j].Score
		}
		// 如果解题数量相同，按罚时排序（升序）
		return results[i].TotalTime < results[j].TotalTime
	})

	// 设置队伍排名，处理并列排名
	for i, result := range results {
		result.Rank = i + 1
		if i > 0 {
			prev := results[i-1]
			if prev.Score == result.Score && prev.TotalTime == result.TotalTime {
				result.Rank = prev.Rank
			}
		}
	}

	// 2. 学校排名计算
	schoolRankMap := make(map[string]int)  // 学校名称 -> 排名
	schoolsRanked := make(map[string]bool) // 已经排名的学校

	for _, result := range results {
		school := result.Team.Organization
		if school == "" || schoolsRanked[school] {
			continue // 跳过没有学校信息或已经处理过的学校
		}

		// 为新学校分配排名（按照队伍出现顺序，即排名顺序）
		schoolRankMap[school] = len(schoolRankMap) + 1
		schoolsRanked[school] = true
	}

	// 更新每个队伍的学校排名
	for _, result := range results {
		school := result.Team.Organization
		if rank, exists := schoolRankMap[school]; exists {
			result.SchoolRank = rank
		}
	}

	// 3. 首A计算
	// 记录每个题目的最早解出时间和对应队伍
	firstSolveMap := make(map[string]struct {
		TeamID    string
		SolveTime int64
	})

	// 第一遍遍历，找出每道题目的最早解出时间
	for _, result := range results {
		for problemID, problem := range result.ProblemResults {
			if problem.Solved {
				// 如果是首次记录该题，或解题时间早于之前记录
				if firstSolve, exists := firstSolveMap[problemID]; !exists || problem.SolvedTime < firstSolve.SolveTime {
					firstSolveMap[problemID] = struct {
						TeamID    string
						SolveTime int64
					}{
						TeamID:    result.Team.ID,
						SolveTime: problem.SolvedTime,
					}
				}
			}
		}
	}

	// 第二遍遍历，标记首A
	for _, result := range results {
		for problemID, problem := range result.ProblemResults {
			if problem.Solved {
				// 重置首A标记
				problem.FirstToSolve = false

				// 检查是否是当前题目的首A
				if firstSolve, exists := firstSolveMap[problemID]; exists &&
					result.Team.ID == firstSolve.TeamID &&
					problem.SolvedTime == firstSolve.SolveTime {
					problem.FirstToSolve = true
				}

				result.ProblemResults[problemID] = problem
			}
		}
	}
}

// ContestStatistics 比赛统计信息
type ContestStatistics struct {
	ProblemCount    int                         `json:"problem_count"`     // 题目数
	TeamCount       int                         `json:"team_count"`        // 队伍数
	SubmissionCount int                         `json:"submission_count"`  // 提交数
	ProblemStats    map[string]ProblemStatistic `json:"problem_stats"`     // 每个题目的统计信息
	SubmissionTypes map[string]int              `json:"submission_types"`  // 提交类型统计
	TeamSolvedCount map[int]int                 `json:"team_solved_count"` // 队伍解题数统计
}

// ProblemStatistic 单个题目的统计信息
type ProblemStatistic struct {
	ProblemID     string `json:"problem_id"`
	Accepted      int    `json:"accepted"`       // 通过数
	Rejected      int    `json:"rejected"`       // 拒绝数
	Pending       int    `json:"pending"`        // 待定数
	TotalAttempts int    `json:"total_attempts"` // 总尝试次数
}

// GetContestStatistics 获取比赛的统计信息
func (s *ScoreboardService) GetContestStatistics(contestID string, filter string) (*ContestStatistics, error) {
	// 获取比赛信息
	contest, err := s.GetContest(contestID)
	if err != nil {
		return nil, err
	}

	// 获取所有结果（根据筛选条件）
	results, _, err := s.GetScoreboardWithFilter(contestID, filter)
	if err != nil {
		return nil, fmt.Errorf("failed to get results: %w", err)
	}

	// 获取原始提交记录
	runs, err := contest.LoadRuns()
	if err != nil {
		return nil, fmt.Errorf("failed to load runs: %w", err)
	}

	// 创建筛选的队伍ID集合
	filteredTeamIDs := make(map[string]bool)
	for _, result := range results {
		filteredTeamIDs[result.TeamID] = true
	}

	// 统计信息
	stats := &ContestStatistics{
		ProblemCount:    contest.ProblemCount,
		TeamCount:       len(results),
		ProblemStats:    make(map[string]ProblemStatistic),
		SubmissionTypes: make(map[string]int),
		TeamSolvedCount: make(map[int]int),
	}

	// 初始化题目统计
	for _, problemID := range contest.ProblemIDs {
		stats.ProblemStats[problemID] = ProblemStatistic{
			ProblemID: problemID,
		}
	}

	// 初始化队伍解题数统计
	for i := 0; i <= contest.ProblemCount; i++ {
		stats.TeamSolvedCount[i] = 0
	}

	// 统计队伍解题数
	for _, result := range results {
		stats.TeamSolvedCount[result.Score]++
	}

	// 计算提交总数和类型统计
	for _, run := range runs {
		// 如果有筛选，只统计筛选后队伍的提交
		if len(filteredTeamIDs) > 0 && !filteredTeamIDs[run.TeamID] {
			continue
		}

		stats.SubmissionCount++

		// 统计提交状态类型
		stats.SubmissionTypes[run.Status]++

		// 将数字题号转为字母ID
		if run.ProblemID >= 1 && run.ProblemID <= len(contest.ProblemIDs) {
			problemID := contest.ProblemIDs[run.ProblemID-1]
			problemStat := stats.ProblemStats[problemID]

			// 更新题目统计信息
			switch run.Status {
			case "accepted":
				problemStat.Accepted++
			case "frozen":
				problemStat.Pending++
			default:
				problemStat.Rejected++
			}

			problemStat.TotalAttempts++
			stats.ProblemStats[problemID] = problemStat
		}
	}

	return stats, nil
}
