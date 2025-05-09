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
	TimeLabels      []string                    `json:"time_labels"`       // 热力图比赛时间标记信息
	ProblemHeatmap  map[string]map[string][]int `json:"problem_heatmap"`   // 题目热力图数据 {题目ID: {accepted: [], rejected: []}}
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

	// 计算比赛总时长（分钟）
	contestDurationMinutes := (contest.EndTime - contest.StartTime) / 60
	// 每5分钟为一个时间段
	timeSlotCount := int(contestDurationMinutes/5) + 1

	// 统计信息
	stats := &ContestStatistics{
		ProblemCount:    contest.ProblemCount,
		TeamCount:       len(results),
		ProblemStats:    make(map[string]ProblemStatistic),
		SubmissionTypes: make(map[string]int),
		TeamSolvedCount: make(map[int]int),
		TimeLabels:      []string{},
		ProblemHeatmap:  make(map[string]map[string][]int),
	}

	// 初始化题目统计和热力图数据
	for _, problemID := range contest.ProblemIDs {
		stats.ProblemStats[problemID] = ProblemStatistic{
			ProblemID: problemID,
		}

		// 初始化题目热力图数据
		stats.ProblemHeatmap[problemID] = map[string][]int{
			"accepted": make([]int, timeSlotCount),
			"rejected": make([]int, timeSlotCount),
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

	// 处理提交记录，填充热力图数据
	for _, run := range runs {
		// 如果有筛选，只统计筛选后队伍的提交
		if len(filteredTeamIDs) > 0 && !filteredTeamIDs[run.TeamID] {
			continue
		}

		stats.SubmissionCount++
		stats.SubmissionTypes[run.Status]++

		// 确保题目ID在有效范围内
		if run.ProblemID >= 0 && run.ProblemID < len(contest.ProblemIDs) {
			// 从数字索引获取字母ID
			problemID := contest.ProblemIDs[run.ProblemID]
			problemStat := stats.ProblemStats[problemID]

			// 计算该提交所在的时间段
			relativeMinutes := run.Timestamp / 1000 / 60 // 转换为分钟
			position := int(relativeMinutes / 5)         // 每5分钟一个时间段

			// 确保时间段索引在有效范围内
			if position >= 0 && position < timeSlotCount {
				// 更新题目热力图数据
				switch run.Status {
				case "ACCEPTED":
					stats.ProblemHeatmap[problemID]["accepted"][position]++
				default:
					stats.ProblemHeatmap[problemID]["rejected"][position]++
				}
			}

			// 更新题目统计信息
			switch run.Status {
			case "ACCEPTED":
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

	// 生成热力图比赛时间标记信息
	stats.TimeLabels = make([]string, timeSlotCount)
	for i := 0; i < timeSlotCount; i++ {
		// 将时间点转换为更友好的显示格式（分钟数）
		minutesMark := i * 5
		stats.TimeLabels[i] = fmt.Sprintf("%d", minutesMark)
	}

	return stats, nil
}

// SubmissionRecord 定义提交记录的返回格式
type SubmissionRecord struct {
	ID         string `json:"id"`
	Status     string `json:"status"`
	TeamID     string `json:"team_id"`
	TeamName   string `json:"team_name"`
	School     string `json:"school"`
	ProblemID  string `json:"problem_id"`
	Timestamp  int64  `json:"timestamp"`
	Language   string `json:"language"`
	IsFiltered bool   `json:"is_filtered,omitempty"`
}

// GetSubmissions 获取比赛的提交记录
func (s *ScoreboardService) GetSubmissions(contestID string, filter string, page int, pageSize int) ([]*SubmissionRecord, int, error) {
	// 获取比赛信息
	contest, err := s.GetContest(contestID)
	if err != nil {
		return nil, 0, err
	}

	// 加载原始提交记录
	runs, err := contest.LoadRuns()
	if err != nil {
		return nil, 0, fmt.Errorf("failed to load runs: %w", err)
	}

	// 加载队伍信息
	teams, err := contest.LoadTeams()
	if err != nil {
		return nil, 0, fmt.Errorf("failed to load teams: %w", err)
	}

	// 处理筛选
	var filteredTeamIDs map[string]bool
	if filter != "" && filter != "all" {
		// 获取符合筛选条件的队伍列表
		results, _, err := s.GetScoreboardWithFilter(contestID, filter)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to filter teams: %w", err)
		}

		filteredTeamIDs = make(map[string]bool)
		for _, result := range results {
			filteredTeamIDs[result.TeamID] = true
		}
	}

	// 转换为查询结果格式
	var submissionRecords []*SubmissionRecord
	for _, run := range runs {
		// 确保题目ID在有效范围内
		if run.ProblemID < 0 || run.ProblemID >= len(contest.ProblemIDs) {
			continue
		}

		// 从数字索引获取字母ID
		problemID := contest.ProblemIDs[run.ProblemID]

		// 获取队伍信息 - 添加检查以避免空指针
		team, exists := teams[run.TeamID]
		if !exists {
			// 如果找不到队伍信息，使用默认值
			team = &model.Team{
				ID:           run.TeamID,
				Name:         "未知队伍",
				Organization: "未知学校",
			}
		}

		// 检查是否被筛选
		isFiltered := false
		if filteredTeamIDs != nil && !filteredTeamIDs[run.TeamID] {
			isFiltered = true
		}

		// 创建提交记录
		record := &SubmissionRecord{
			ID:         run.ID,
			Status:     run.Status,
			TeamID:     run.TeamID,
			TeamName:   team.Name,
			School:     team.Organization,
			ProblemID:  problemID,
			Timestamp:  run.Timestamp,
			Language:   run.Language,
			IsFiltered: isFiltered,
		}

		submissionRecords = append(submissionRecords, record)
	}

	// 按提交时间排序
	sort.Slice(submissionRecords, func(i, j int) bool {
		// 降序排列（最新的在前）
		return submissionRecords[i].Timestamp > submissionRecords[j].Timestamp
	})

	// 计算总记录数（未被过滤的）
	totalCount := 0
	for _, record := range submissionRecords {
		if !record.IsFiltered {
			totalCount++
		}
	}

	// 如果未指定分页参数，使用默认值
	if page <= 0 {
		page = 1
	}
	if pageSize <= 0 {
		pageSize = 15 // 默认每页15条记录
	}

	// 应用分页（只返回符合筛选条件的记录）
	var pagedRecords []*SubmissionRecord
	count := 0
	startIndex := (page - 1) * pageSize
	endIndex := startIndex + pageSize

	for _, record := range submissionRecords {
		if record.IsFiltered {
			continue
		}

		if count >= startIndex && count < endIndex {
			pagedRecords = append(pagedRecords, record)
		}
		count++

		// 如果已收集足够的记录且已超过请求的页码范围，可以提前退出循环
		if count >= endIndex {
			break
		}
	}

	return pagedRecords, totalCount, nil
}
