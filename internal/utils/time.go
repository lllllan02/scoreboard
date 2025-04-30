package utils

import (
	"fmt"
	"time"
)

// FormatUnixTime 将Unix时间戳格式化为可读时间
func FormatUnixTime(timestamp int64) string {
	t := time.Unix(timestamp, 0)
	return t.Format("2006-01-02 15:04:05")
}

// FormatDuration 将持续时间格式化为可读字符串
func FormatDuration(seconds int64) string {
	if seconds < 0 {
		return "0:00:00"
	}

	hours := seconds / 3600
	minutes := (seconds % 3600) / 60
	secs := seconds % 60

	return fmt.Sprintf("%d:%02d:%02d", hours, minutes, secs)
}

// GetTimeRemaining 获取到截止时间的剩余时间（秒）
func GetTimeRemaining(endTime int64) int64 {
	now := time.Now().Unix()
	remaining := endTime - now
	if remaining < 0 {
		return 0
	}
	return remaining
}

// GetTimeElapsed 获取从开始时间已经经过的时间（秒）
func GetTimeElapsed(startTime int64) int64 {
	now := time.Now().Unix()
	elapsed := now - startTime
	if elapsed < 0 {
		return 0
	}
	return elapsed
}

// GetTotalDuration 获取比赛总持续时间（秒）
func GetTotalDuration(startTime, endTime int64) int64 {
	return endTime - startTime
}

// GetNowUnix 获取当前Unix时间戳
func GetNowUnix() int64 {
	return time.Now().Unix()
}
