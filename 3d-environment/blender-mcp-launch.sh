#!/bin/sh
# Start the workspace's Blender MCP environment without a stale venv script path.
set -eu
project_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
cd "$project_dir/blender_mcp/mcp"
export PYTHONDONTWRITEBYTECODE=1
exec .venv/bin/python -c 'from blmcp import main; raise SystemExit(main())'
