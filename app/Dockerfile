FROM golang:1.26-alpine AS builder

WORKDIR /app
ENV CGO_ENABLED=0

# Step 1: cache dependencies
COPY go.mod go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod \
    go mod download

# Step 2: copy only Go source needed to build API
COPY cmd ./cmd
COPY internal ./internal

# Step 3: build binary
RUN --mount=type=cache,target=/root/.cache/go-build \
    go build -o app ./cmd/api


# ---- Runtime image ----
FROM alpine:latest

WORKDIR /app

# Copy binary
COPY --from=builder /app/app .

# Copy static files from build context (the builder stage above only has
# cmd/ and internal/, so these must come from the build context, not builder)
COPY uploads ./uploads
COPY *.html ./
COPY css ./css
COPY js ./js
COPY assets ./assets

EXPOSE 8080

CMD ["./app"]
