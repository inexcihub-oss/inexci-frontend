#!/bin/sh
set -e

echo "Installing dependencies..."
yarn install --frozen-lockfile --prefer-offline --non-interactive

echo "Starting application..."
exec yarn dev
