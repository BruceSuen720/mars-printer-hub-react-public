#!/bin/sh
set -eu

to_bool() {
  raw_value="${1:-false}"
  case "$(printf '%s' "$raw_value" | tr '[:upper:]' '[:lower:]')" in
    1|true|yes|on)
      printf '%s' "true"
      ;;
    *)
      printf '%s' "false"
      ;;
  esac
}

{
cat <<'EOF'
window.__APP_CONFIG__ = Object.assign({}, window.__APP_CONFIG__, {
EOF

env | grep '^ENABLE_' | sort | while IFS='=' read -r key value; do
  normalized="$(to_bool "$value")"
  printf '  %s: %s,\n' "$key" "$normalized"
done

cat <<'EOF'
})
EOF
} > /usr/share/nginx/html/config.js
