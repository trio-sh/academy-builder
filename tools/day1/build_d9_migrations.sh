#!/bin/bash
# Regenerates the four generated D9 migrations from the D9 handover folder (the build package, the Execution Edition .md and the Session Archive content package).
#   bash tools/day1/build_d9_migrations.sh /path/to/T3A-D9-Handover
# The values passed to the seeds generator are the ones the Execution Edition states: Section 3.2 and 5.7 (the eleven words that belong to other dimensions), Section 5.7 (no recurrence blocker),
# Section 5.15 (every element is carried at Stage 1, so no question is barred at Stage 1), and Section 6.1 (checklist items 24 and 25 are the D9 specific items; item numbers 34 and 35 follow D4's 28 and 29).
set -eu
H="${1:?path to the T3A-D9-Handover folder}"
B="$H/01_Hans_Build_Folder_TRIAL/01_D9_Observation_Pathway"
HERE="$(cd "$(dirname "$0")" && pwd)"; REPO="$(cd "$HERE/../.." && pwd)"; M="$REPO/supabase/migrations"
python3 "$HERE/build_dimension_content_migration.py" D9 "$B/T3A-D9-Observation-Pathway-Build-Package-v1_1.json" "$M/20270222000000_d9_content_registry.sql"
python3 "$HERE/build_d2_demo_fixtures_migration.py" "$B/T3A-D9-Observation-Pathway-Execution-Edition-v1_1-DEVELOPER-HANDOFF-CANDIDATE.md" "$M/20270223000000_d9_demonstration_fixtures.sql" D9
python3 "$HERE/build_dimension_seeds_migration.py" D9 "$B/T3A-D9-Observation-Pathway-Build-Package-v1_1.json" "$M/20270224000000_d9_seeds.sql" --item-base 34 --blockers "" \
  --cross "owned,caused,blamed,prioritized,verified,proposed,agreed,disclosed,recovered,resumed,persuaded" --stage1-barred "" \
  --req24 "D9 specific: no rendered D9 entry describes the participant's capacity to learn, their knowledge or their speed, or the absence of any of these, and no element of the report presents a stated change as preferred to a kept approach. The check runs against the list at Section 5.7a on rendered output." \
  --req25 "D9 specific: no element of the report is computed across dimensions, no rendered D9 entry names a third party, and practice_origin is not rendered."
python3 "$HERE/build_d9_session_archive_migration.py" "$B/T3A-D9-Observation-Pathway-Session-Archive-Content.json" "$M/20270225000000_d9_session_archive_content.sql"
