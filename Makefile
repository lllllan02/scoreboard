# 定义变量
CRAWLER_PATH=./cmd/crawler

# 获取所有命令行参数(第一个参数后面的所有内容)
URL_ARG=$(wordlist 2,$(words $(MAKECMDGOALS)),$(MAKECMDGOALS))
# 忽略不是目标的参数
%:
	@:

.PHONY: run
run:
	@go run .

# 使用自定义URL运行爬虫程序
.PHONY: crawl
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
.PHONY: clean
clean:
	@echo "清理构建文件..."
	@rm -rf $(BUILD_DIR)
