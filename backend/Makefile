.PHONY: lint test vet build

lint:
	go tool golangci-lint run ./...

test:
	go test ./...

vet:
	go vet ./...

build:
	go build ./cmd/server
