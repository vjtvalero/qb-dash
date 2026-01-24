# --- build stage ---
FROM golang:1.25-alpine AS build
WORKDIR /app

COPY go.mod ./
COPY go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o qb-dash .

# --- run stage ---
FROM alpine:3.20
WORKDIR /app

COPY --from=build /app/qb-dash /app/qb-dash

EXPOSE 8079
ENTRYPOINT ["/app/qb-dash"]
