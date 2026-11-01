#!/bin/sh
set -eu
review_dir="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
runtime_dir="$review_dir/runtime"
export SCAN_TO_MODEL_BLENDER_RUNTIME_ROOT="$runtime_dir"
export BLENDER_USER_CONFIG="$runtime_dir/blender-config"
export XDG_CONFIG_HOME="$runtime_dir/xdg-config"
export XDG_CACHE_HOME="$runtime_dir/xdg-cache"
export XDG_DATA_HOME="$runtime_dir/xdg-data"
export XDG_RUNTIME_DIR="$runtime_dir/xdg-runtime"
export TMPDIR="$runtime_dir/tmp"
exec /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup --disable-autoexec --python-exit-code 1 --python "$review_dir/blender_runtime.py" "$@"
