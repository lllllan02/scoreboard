.PHONY: build run clean crawl

# 定义变量
BINARY_NAME=crawler
BUILD_DIR=./bin
CRAWLER_PATH=./cmd/crawler

# 获取所有命令行参数(第一个参数后面的所有内容)
URL_ARG=$(wordlist 2,$(words $(MAKECMDGOALS)),$(MAKECMDGOALS))
# 忽略不是目标的参数
%:
	@:

# 构建爬虫程序
build:
	@echo "构建爬虫程序..."
	@mkdir -p $(BUILD_DIR)
	@go build -o $(BUILD_DIR)/$(BINARY_NAME) $(CRAWLER_PATH)

# 运行爬虫程序（默认URL）
run:
	@go run $(CRAWLER_PATH)/main.go

# 使用自定义URL运行爬虫程序
crawl:
	@if [ -z "$(URL_ARG)" ]; then \
		echo "输入要爬取的URL (默认: https://board.xcpcio.com/icpc/50th/wuhan-invitational):"; \
		read -p "" url; \
		if [ -z "$$url" ]; then \
			go run $(CRAWLER_PATH)/main.go; \
		else \
			go run $(CRAWLER_PATH)/main.go -url=$$url; \
		fi; \
	else \
		go run $(CRAWLER_PATH)/main.go -url=$(URL_ARG); \
	fi

# 清理构建文件
clean:
	@echo "清理构建文件..."
	@rm -rf $(BUILD_DIR)

# 帮助信息
help:
	@echo "可用命令:"
	@echo "  make build       - 构建爬虫程序"
	@echo "  make run         - 运行爬虫程序(默认URL)"
	@echo "  make crawl       - 运行爬虫程序(交互式输入URL)"
	@echo "  make crawl URL   - 运行爬虫程序(直接指定URL)"
	@echo "  make clean       - 清理构建文件"
	@echo "  make help        - 显示帮助信息"
	@echo ""
	@echo "示例:"
	@echo "  make crawl https://board.xcpcio.com/icpc/your-contest"
