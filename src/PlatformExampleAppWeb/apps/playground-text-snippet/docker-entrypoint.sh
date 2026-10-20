#!/bin/sh
echo "Configuring container..."

echo "Environment variables"
echo "__TEXT_SNIPPET_API_HOST__ => $__TEXT_SNIPPET_API_HOST__"

echo "Environment variables replacement"
# Config tokens are injected in ONE envsubst pass per file instead of one pass per
# token. The previous loop rewrote every bundle once per token, so a lost write left
# only the EARLIEST tokens unsubstituted and the app shipped a literal '$__TOKEN__'
# as a real config value, which every health check happily reported as healthy.

REPLACE_TOKENS='${__TEXT_SNIPPET_API_HOST__}'
for i in `find /usr/share/nginx/html -name "*.js"`; do envsubst "$REPLACE_TOKENS" < $i | sponge $i;done

echo "Done environment variables replacement"

# Verification gate. A surviving $__TOKEN__ means the browser would receive the literal
# token as a real config value (e.g. the OIDC issuer), which breaks the app silently and
# is invisible to every health check. Fail the container instead: readiness never passes,
# the rollout is blocked, and the previously deployed version keeps serving.
UNREPLACED_TOKENS=$(find /usr/share/nginx/html -name "*.js" -exec grep -oE '[$]__[A-Z0-9_]+__' {} \; | sort -u)
if [ -n "$UNREPLACED_TOKENS" ]; then
    echo "FATAL: config token replacement incomplete. Unreplaced tokens:"
    echo "$UNREPLACED_TOKENS"
    exit 1
fi
echo "Config token verification passed"

ngsw-config /usr/share/nginx/html /usr/share/nginx/html/ngsw-config.json

echo "done" > healthz

nginx -g "daemon off;"
