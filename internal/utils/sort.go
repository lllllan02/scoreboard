package utils

import (
	"sort"
)

// SortByScore 按分数排序（降序）
func SortByScore[T any](items []T, scoreFunc func(T) int) {
	sort.Slice(items, func(i, j int) bool {
		return scoreFunc(items[i]) > scoreFunc(items[j])
	})
}

// SortByPenalty 按罚时排序（升序）
func SortByPenalty[T any](items []T, penaltyFunc func(T) int64) {
	sort.Slice(items, func(i, j int) bool {
		return penaltyFunc(items[i]) < penaltyFunc(items[j])
	})
}

// SortByScoreAndPenalty 按分数和罚时排序（先按分数降序，分数相同时按罚时升序）
func SortByScoreAndPenalty[T any](items []T, scoreFunc func(T) int, penaltyFunc func(T) int64) {
	sort.Slice(items, func(i, j int) bool {
		scoreI := scoreFunc(items[i])
		scoreJ := scoreFunc(items[j])
		if scoreI != scoreJ {
			return scoreI > scoreJ
		}
		return penaltyFunc(items[i]) < penaltyFunc(items[j])
	})
}

// SortBySubmissionTime 按提交时间排序（升序）
func SortBySubmissionTime[T any](items []T, timeFunc func(T) int64) {
	sort.Slice(items, func(i, j int) bool {
		return timeFunc(items[i]) < timeFunc(items[j])
	})
}
