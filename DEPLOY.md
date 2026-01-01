# Deployment Guide

This guide explains how to deploy the `lcal` application on a staging server using Docker.

## Prerequisites

- **Docker** and **Docker Compose** installed on the server.
- Access to the source code (via git clone or file transfer).

## Deployment Steps

1.  **Clone the repository** (or copy files to the server):
    ```bash
    git clone <your-repo-url>
    cd lcal
    ```

2.  **Configure Environment Variables**:
    - Copy the example environment file:
        ```bash
        cp .env.example .env
        ```
    - Edit `.env` and fill in the required values:
        ```bash
        nano .env
        ```
    - **Important**:
        - Set `NEXTAUTH_URL` to your server's URL (e.g., `http://staging.yourdomain.com` or `http://<server-ip>:3000`).
        - Set a secure `NEXTAUTH_SECRET` (generate one with `openssl rand -base64 32`).
        - Add your Google OAuth credentials (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`).

3.  **Build and Run**:
    - Start the application using Docker Compose:
        ```bash
        docker-compose up -d --build
        ```
    - This command will:
        - Build the Docker image.
        - Start the container in detached mode (`-d`).
        - Restart automatically if the server reboots (`restart: always` in `docker-compose.yml`).

4.  **Verify Deployment**:
    - Access the application in your browser at the configured URL.
    - Check logs if needed:
        ```bash
        docker-compose logs -f
        ```

## Updating the Application

To deploy a new version:

1.  Pull the latest code:
    ```bash
    git pull
    ```
2.  Rebuild and restart the container:
    ```bash
    docker-compose up -d --build
    ```
