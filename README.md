# qb-dash

`qb-dash` is a lightweight web dashboard for monitoring home server downloads. It provides real-time updates on download progress, speeds, and other relevant metrics.

## Features

- Displays active downloads with progress, speed, and ETA.
- Shows total download speed and active download count.
- Lightweight and easy to deploy.

## Prerequisites

- Go 1.22 or higher
- Docker (optional, for containerized deployment)

## Installation

### Clone the Repository

```bash
git clone <repository-url>
cd qb-dash
```

### Build and Run

1. Install dependencies:
    ```bash
    go mod download
    ```
2. Build the application:
    ```bash
    go build -o qb-dash
    ```
3. Run the application:
    ```bash
    ./qb-dash
    ```

### Environment Variables

You can configure the application using the following environment variables:

- `PORT`: The port on which the application runs (default: `8079`).
- `QB_URL`: The URL of the Web API (default: `http://localhost:8080`).
- `QB_USER`: The username for authentication (default: `admin`).
- `QB_PASS`: The password for authentication (default: `adminadmin`).
- `REFRESH_SECONDS`: The interval (in seconds) for refreshing the dashboard (default: `3`).

### Using Docker

1. Build the Docker image:
    ```bash
    docker build -t qb-dash .
    ```
2. Run the container:
    ```bash
    docker run -p 8079:8079 --env-file .env qb-dash
    ```

## Usage

Visit the dashboard in your browser at `http://localhost:8079` (or the port you configured).

## License

This project is licensed under the MIT License. See the `LICENSE` file for details.
