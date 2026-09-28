#!/usr/bin/env bash
# Regenerates the four Task A artifacts in docs/mcp/ with the exact commands of docs/walkthrough.md
# (Task A, step 4), stderr dropped, and refuses to leave a file that is not pure JSON.
# Why the check: in the very first run of this server, Inspector 2.8.0 wrote the server's stderr line after the JSON
# into stdout (docs/mcp/verification.md, Task A). Run from the repository root.
set -u
I=(npx -y @modelcontextprotocol/inspector@2.8.0 --cli node mcp/leaddesk-server/src/server.mjs)
cd "$(git rev-parse --show-toplevel)" || exit 2

"${I[@]}" --method tools/list > docs/mcp/tools-list.json 2>/dev/null
echo "tools-list.json exit=$?"
"${I[@]}" --method tools/call --tool-name leaddesk_set_lead_status \
  --tool-arg leadId=lead_0002 --tool-arg status=contacted --tool-arg "reason=перевірка в Inspector" > docs/mcp/set-status.json 2>/dev/null
echo "set-status.json exit=$?"
"${I[@]}" --method tools/call --tool-name leaddesk_set_lead_status \
  --tool-arg leadId=nope --tool-arg status=won --tool-arg reason=ok > docs/mcp/bad-input.json 2>/dev/null
echo "bad-input.json exit=$? (5 expected: the tool returned isError)"
"${I[@]}" --method resources/read --uri leaddesk://reference/statuses > docs/mcp/resource-read.json 2>/dev/null
echo "resource-read.json exit=$?"

bad=0
for f in tools-list set-status bad-input resource-read; do
  if node -e "JSON.parse(require('fs').readFileSync('docs/mcp/$f.json','utf8'))" 2>/dev/null; then
    echo "valid JSON: docs/mcp/$f.json"
  else
    echo "NOT JSON: docs/mcp/$f.json — run again"; bad=1
  fi
done
exit $bad
