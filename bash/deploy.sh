#!/usr/bin/bash

docker compose up --build -d --remove-orphans

docker system prune --all --volumes --force

curl -X POST -H "Content-Type: application/json" -d '{"content": "LipSQL: Docker build done!"}' https://discord.com/api/webhooks/1311081117553655950/dhPOwv8W-_ZXdZNoRkfdhGKcSvE0NjMZkcQbDYrfXxuOGyjlNbiUJmTeANW65rjZcAcg