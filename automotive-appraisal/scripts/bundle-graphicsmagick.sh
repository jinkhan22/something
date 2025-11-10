#!/usr/bin/env bash

set -euo pipefail

export LANG=C

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
PROJECT_ROOT=$(cd "$SCRIPT_DIR/.." && pwd)
BUNDLE_DIR="$PROJECT_ROOT/graphicsmagick-bundle"
CONFIG_DIR="$BUNDLE_DIR/config"
BIN_DIR="$BUNDLE_DIR/bin"
LIB_DIR="$BUNDLE_DIR/lib"

HOMEBREW_PREFIX="$(brew --prefix 2>/dev/null || true)"
HOMEBREW_CELLAR="$(brew --cellar 2>/dev/null || true)"

log() {
  printf '%b\n' "$1"
}

fatal() {
  printf '❌ %s\n' "$1" >&2
  exit 1
}

resolve_placeholder_path() {
  local raw_path="$1"
  local origin_path="$2"

  if [[ -z "$raw_path" ]]; then
    printf ''
    return
  fi

  local resolved="$raw_path"

  if [[ "$resolved" == @@HOMEBREW_PREFIX@@* && -n "$HOMEBREW_PREFIX" ]]; then
    resolved="${resolved/@@HOMEBREW_PREFIX@@/$HOMEBREW_PREFIX}"
  fi

  if [[ "$resolved" == @@HOMEBREW_CELLAR@@* && -n "$HOMEBREW_CELLAR" ]]; then
    resolved="${resolved/@@HOMEBREW_CELLAR@@/$HOMEBREW_CELLAR}"
  fi

  if [[ "$resolved" == @rpath/* && -n "$origin_path" ]]; then
    local dep_name="${resolved#@rpath/}"
    local origin_dir="$(dirname "$origin_path")"

    if [[ -f "$origin_dir/$dep_name" ]]; then
      python3 - <<'PY' "$origin_dir/$dep_name"
import os, sys
print(os.path.realpath(sys.argv[1]))
PY
      return
    fi

    while IFS= read -r rpath_line; do
      local rpath="$rpath_line"
      if [[ "$rpath" == @loader_path* ]]; then
        local loader_dir="$origin_dir"
        rpath="${rpath/@loader_path/$loader_dir}"
      elif [[ "$rpath" == @executable_path* ]]; then
        local exec_dir="$origin_dir"
        rpath="${rpath/@executable_path/$exec_dir}"
      fi

      if [[ -z "$rpath" ]]; then
        continue
      fi

      local candidate="$rpath/$dep_name"
      if [[ -f "$candidate" ]]; then
        python3 - <<'PY' "$candidate"
import os, sys
print(os.path.realpath(sys.argv[1]))
PY
        return
      fi
    done < <(otool -l "$origin_path" | awk '/LC_RPATH/{getline; getline; print $2}')
  fi

  python3 - <<'PY' "$resolved"
import os, sys
candidate = sys.argv[1]
if not candidate:
    sys.exit(0)
print(os.path.realpath(candidate))
PY
}

ensure_executable() {
  local binary_path="$1"

  if [[ ! -e "$binary_path" ]]; then
    fatal "Binary not found: $binary_path"
  fi

  if [[ ! -x "$binary_path" ]]; then
    fatal "GraphicsMagick binary is not executable: $binary_path"
  fi
}

copy_binary() {
  local source="$1"
  local destination="$2"

  mkdir -p "$(dirname "$destination")"
  cp -p "$source" "$destination"
  chmod 755 "$destination"
}

declare -a COPIED_LIBS=()

lib_already_copied() {
  local needle="$1"
  local lib
  if [[ ${#COPIED_LIBS[@]} -eq 0 ]]; then
    return 1
  fi
  for lib in "${COPIED_LIBS[@]}"; do
    if [[ "$lib" == "$needle" ]]; then
      return 0
    fi
  done
  return 1
}

register_copied_lib() {
  COPIED_LIBS+=("$1")
}

patch_dependency_paths() {
  local target="$1"
  local prefix="$2"
  local origin_reference="$3"

  while IFS= read -r raw_dep; do
    local dep="${raw_dep%%(*}"
    dep="${dep%% }"

    if [[ -z "$dep" ]]; then
      continue
    fi

    if [[ "$dep" == @loader_path* ]]; then
      continue
    fi

    if [[ "$dep" == /usr/lib/* || "$dep" == /System/* ]]; then
      continue
    fi

    local base_name="$(basename "$dep")"
    local resolved_path="$(resolve_placeholder_path "$dep" "$origin_reference")"

    if [[ -z "$resolved_path" || ! -f "$resolved_path" ]]; then
      log "⚠️  Skipping missing dependency: $dep"
      continue
    fi

    copy_dependency_recursive "$resolved_path" "$resolved_path"

    local replacement="@loader_path"
    if [[ -n "$prefix" ]]; then
      replacement+="/$prefix/$base_name"
    else
      replacement+="/$base_name"
    fi

    install_name_tool -change "$dep" "$replacement" "$target"
  done < <(otool -L "$target" | tail -n +2 | awk '{print $1}')
}

copy_dependency_recursive() {
  local absolute_path="$1"
  local origin_reference="$2"
  local base_name="$(basename "$absolute_path")"
  local destination="$LIB_DIR/$base_name"

  if lib_already_copied "$base_name"; then
    return
  fi

  if [[ ! -f "$absolute_path" ]]; then
    log "⚠️  Dependency not found on disk: $absolute_path"
    return
  fi

  cp -p "$absolute_path" "$destination"
  chmod 755 "$destination"
  register_copied_lib "$base_name"

  install_name_tool -id "@loader_path/$base_name" "$destination"

  while IFS= read -r raw_dep; do
    local dep="${raw_dep%%(*}"
    dep="${dep%% }"

    if [[ -z "$dep" ]]; then
      continue
    fi

    if [[ "$dep" == @loader_path* ]]; then
      continue
    fi

    if [[ "$dep" == /usr/lib/* || "$dep" == /System/* ]]; then
      continue
    fi

    local dep_base="$(basename "$dep")"
    local resolved_dep="$(resolve_placeholder_path "$dep" "$origin_reference")"

    if [[ -z "$resolved_dep" || ! -f "$resolved_dep" ]]; then
      log "⚠️  Skipping missing transitive dependency: $dep"
      continue
    fi

    copy_dependency_recursive "$resolved_dep" "$resolved_dep"
    install_name_tool -change "$dep" "@loader_path/$dep_base" "$destination"
  done < <(otool -L "$destination" | tail -n +2 | awk '{print $1}')
}

create_delegates_template() {
  mkdir -p "$CONFIG_DIR"
  cat > "$CONFIG_DIR/delegates.mgk.template" <<'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<delegatemap>
  <delegate decode="ps:alpha" command="@GS_BIN_PATH@ -q -dQUIET -dSAFER -dBATCH -dNOPAUSE -dNOPROMPT -dMaxBitmap=500000000 -dAlignToPixels=0 -dGridFitTT=2 -sDEVICE=pngalpha -dTextAlphaBits=4 -dGraphicsAlphaBits=4 -r%s %s -sOutputFile=%s %s"/>
  <delegate decode="ps:color" command="@GS_BIN_PATH@ -q -dQUIET -dSAFER -dBATCH -dNOPAUSE -dNOPROMPT -dMaxBitmap=500000000 -dAlignToPixels=0 -dGridFitTT=2 -sDEVICE=pnmraw -dTextAlphaBits=4 -dGraphicsAlphaBits=4 -r%s %s -sOutputFile=%s %s"/>
  <delegate decode="pdf" command="@GS_BIN_PATH@ -q -dQUIET -dSAFER -dBATCH -dNOPAUSE -dNOPROMPT -dMaxBitmap=500000000 -dAlignToPixels=0 -dGridFitTT=2 -sDEVICE=pnmraw -dTextAlphaBits=4 -dGraphicsAlphaBits=4 -r%s %s -sOutputFile=%s %s"/>
  <delegate decode="eps" command="@GS_BIN_PATH@ -q -dQUIET -dSAFER -dBATCH -dNOPAUSE -dNOPROMPT -dMaxBitmap=500000000 -dAlignToPixels=0 -dGridFitTT=2 -sDEVICE=pnmraw -dTextAlphaBits=4 -dGraphicsAlphaBits=4 -r%s %s -sOutputFile=%s %s"/>
</delegatemap>

EOF
}

main() {
  local architecture
  architecture="$(uname -m)"
  log "📱 Detected architecture: $architecture"

  local gm_path
  if [[ -n "${GM_PATH_OVERRIDE:-}" ]]; then
    gm_path="$GM_PATH_OVERRIDE"
  else
    gm_path="$(command -v gm 2>/dev/null || true)"
  fi

  if [[ -z "$gm_path" ]]; then
    fatal "GraphicsMagick not found. Install it with 'brew install graphicsmagick' or set GM_PATH_OVERRIDE."
  fi

  ensure_executable "$gm_path"

  local gs_path=""
  if [[ -n "${GS_PATH_OVERRIDE:-}" ]]; then
    gs_path="$GS_PATH_OVERRIDE"
  else
    gs_path="$(command -v gs 2>/dev/null || true)"
  fi

  log "🔧 Creating GraphicsMagick bundle at $BUNDLE_DIR"
  rm -rf "$BUNDLE_DIR"
  mkdir -p "$BIN_DIR" "$LIB_DIR" "$CONFIG_DIR"

  log "📦 Copying GraphicsMagick binary: $gm_path"
  copy_binary "$gm_path" "$BIN_DIR/gm"

  log "🔗 Resolving GraphicsMagick dependencies"
  patch_dependency_paths "$BIN_DIR/gm" "../lib" "$gm_path"

  if [[ -n "$gs_path" ]]; then
    if [[ -x "$gs_path" ]]; then
      log "📦 Copying Ghostscript binary: $gs_path"
      copy_binary "$gs_path" "$BIN_DIR/gs"
      log "🔗 Resolving Ghostscript dependencies"
      patch_dependency_paths "$BIN_DIR/gs" "../lib" "$gs_path"
    else
      log "⚠️  Ghostscript binary is not executable, skipping: $gs_path"
    fi
  else
    log "⚠️  Ghostscript not found. PDF conversion may fail."
  fi

  create_delegates_template

  log "🧪 Verifying bundle structure"
  if [[ ! -x "$BIN_DIR/gm" ]]; then
    fatal "GraphicsMagick binary missing or not executable after bundling."
  fi

  if [[ -n "$gs_path" && -x "$gs_path" && ! -x "$BIN_DIR/gs" ]]; then
    fatal "Ghostscript binary missing or not executable after bundling."
  fi

  log "✅ GraphicsMagick bundle created successfully!"
  log "📂 Bundle path: $BUNDLE_DIR"
}

main "$@"