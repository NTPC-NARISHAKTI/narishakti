FROM golang:1.26-alpine AS builder

WORKDIR /app

# Step 1: cache dependencies
COPY go.mod go.sum ./
RUN go mod download

# Step 2: copy source code
COPY . .

# Step 3: build binary
RUN go build -o app ./cmd/api


# ---- Runtime image ----
FROM alpine:latest

WORKDIR /app

# Copy binary
COPY --from=builder /app/app .

# Copy static files
COPY --from=builder /app/uploads ./uploads
COPY --from=builder /app/*.html ./
COPY --from=builder /app/css ./css
COPY --from=builder /app/js ./js

EXPOSE 8080

CMD ["./app"]