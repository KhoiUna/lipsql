#!/bin/bash

usage() {
    echo "Usage: $0 [-h] -d DATABASE -p PATH"
    echo "  -h: Show this help message"
    echo "  -d: Database name to backup"
    echo "  -p: Path to save backup file"
    exit 1
}

while getopts "hd:p:" opt; do
    case $opt in
        h) usage ;;
        d) DB_NAME=$OPTARG ;;
        p) BACKUP_PATH=$OPTARG ;;
        *) usage ;;
    esac
done

if [ -z "$DB_NAME" ] || [ -z "$BACKUP_PATH" ]; then
    usage
fi

pg_dump "$DB_NAME" > "$BACKUP_PATH"