#!/bin/bash
# Usage: ./new-version.sh 1.0.1
: '
Bash util to replace version string in .env.prod
then copy .env.prod to client/, worker/ dir as .env
'

NEW_VERSION=$1

if [ -z "$NEW_VERSION" ]; then
    echo "Please provide a version number"
    exit 1
fi

# Matches the entire `NEXT_PUBLIC_VERSION` line including its current value
sed -i "s/NEXT_PUBLIC_VERSION=\".*\"/NEXT_PUBLIC_VERSION=\"$NEW_VERSION\"/" .env.prod

cp .env.prod client/.env
cp .env.prod worker/.env