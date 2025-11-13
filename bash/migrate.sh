#!/bin/bash
# WARNING: This bash only works for Postgres database

show_help() {
    echo "USAGE:  ./migrate.sh [OPTIONS] COMMAND [ARG...]"
    echo ""
    echo "OPTIONS"
    echo "  -h  Show help"
    echo ""
    echo "COMMANDS"
    echo "  new <migration title>   Create new migration file"
    echo "  up <DB_NAME> <DB_USER>  Run migration file"
    exit 0
}


# Create new migration .sql file
new_migration() {
  local TITLE=$@
  if [ -z "$TITLE" ]; then
      echo "USAGE: ./migrate.sh new <migration title>"
      exit 1
  fi

  local TITLEF=$(echo $TITLE | tr " " "_")

  local YEAR=$(date +"%Y")
  local MONTH=$(date +"%m")
  local DATE=$(date +"%d")

  local FILENAME="migrations/$(date '+%Y%m%d')_${TITLEF,,}.sql"

  cat <<EOF > $FILENAME
  -- Created on: $(date '+%Y-%m-%d')

EOF

  echo "Created new .sql migration at $FILENAME"
}


# Run .sql files
run_migrations() {
    local DB_NAME=$2
    local DB_USER=${3:-$USER}
    if [ -z "$DB_NAME" ]; then
        echo "USAGE: ./migrate.sh up <DB_NAME> [DB_USER]"
        exit 1
    fi

    if [ -z "$(ls migrations/*.sql 2>/dev/null)" ]; then
        echo "No migration files found in the 'migration' directory."
        exit 1
    fi
    
    for file in migrations/*.sql; do
        echo "Running migration: $file"
        psql -U "$DB_USER" -d "$DB_NAME" -f "$file"
    done
}


# Main script logic
main() {
    if [ "$1" = "-h" ] || [ $# -eq 0 ]; then
      show_help
    fi

    case "$1" in
        "new")
            shift
            new_migration "$@"
            ;;
        "up")
            run_migrations "$@"
            ;;
        *)
            echo "Error: Unknown command. Use -h for help"
            exit 1
            ;;
    esac
}

# Execute main function
main "$@"