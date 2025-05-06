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

// GetScoreboard 获取比赛记分板
func (s *ScoreboardService) GetScoreboard(contestID, group string) ([]*model.Result, *model.Contest, error) {
	contest, err := s.GetContest(contestID)
	if err != nil {
		return nil, nil, err
	}

	var results []*model.Result
	if group == "" {
		results, err = contest.GetVisibleResults()
	} else {
		results, err = contest.GetFilteredResults(group)
	}

	if err != nil {
		return nil, nil, fmt.Errorf("failed to get results: %w", err)
	}

	return results, contest, nil
}

// GetContestGroups 获取比赛的所有分组
func (s *ScoreboardService) GetContestGroups(contestID string) (map[string]string, error) {
	contest, err := s.GetContest(contestID)
	if err != nil {
		return nil, err
	}

	return contest.Groups, nil
}

// GetContestStatus 获取比赛状态
func (s *ScoreboardService) GetContestStatus(contestID string) (string, error) {
	contest, err := s.GetContest(contestID)
	if err != nil {
		return "", err
	}

	now := time.Now().Unix()

	if now < contest.StartTime {
		return "PENDING", nil
	} else if now <= contest.EndTime {
		return "RUNNING", nil
	} else {
		return "FINISHED", nil
	}
}

// GetTimeInfo 获取比赛时间信息
func (s *ScoreboardService) GetTimeInfo(contestID string) (map[string]interface{}, error) {
	contest, err := s.GetContest(contestID)
	if err != nil {
		return nil, err
	}

	now := time.Now().Unix()

	timeInfo := map[string]interface{}{
		"start_time":     contest.StartTime,
		"end_time":       contest.EndTime,
		"frozen_time":    contest.FrozenTime,
		"current_time":   now,
		"remaining_time": contest.EndTime - now,
		"elapsed_time":   now - contest.StartTime,
		"total_time":     contest.EndTime - contest.StartTime,
	}

	if now < contest.StartTime {
		timeInfo["status"] = "PENDING"
	} else if now <= contest.EndTime {
		timeInfo["status"] = "RUNNING"
	} else {
		timeInfo["status"] = "FINISHED"
	}

	return timeInfo, nil
}
