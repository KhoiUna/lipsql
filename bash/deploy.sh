#!/usr/bin/bash

docker compose up --build -d --remove-orphans

docker system prune --all --volumes --force