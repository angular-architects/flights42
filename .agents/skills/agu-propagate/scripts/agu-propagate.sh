#!/usr/bin/env bash
set -eo pipefail

SOLUTION="AGU-solution"

usage() {
  cat <<'USAGE'
usage: agu-propagate.sh <plan|run|verify> <topic>

  plan    print the branch topology and dry-run every rebase (no refs are touched)
  run     back up every ref as backup/<branch>-pre-<topic>, then rebase in dependency
          order; stops at the first conflict and can be re-run after `git rebase --continue`
  verify  diff every branch against its backup, scan the whole tree for conflict markers,
          compare TODO and commit counts
USAGE
  exit 2
}

[ $# -eq 2 ] || usage
CMD="$1"
TOPIC="$2"

cd "$(git rev-parse --show-toplevel)"
git rev-parse --verify -q "refs/heads/$SOLUTION" >/dev/null || {
  echo "branch $SOLUTION not found; run this inside the flights42 repo" >&2
  exit 1
}

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
mkdir -p "$WORK/oldtip" "$WORK/sim" "$WORK/kind" "$WORK/parent" "$WORK/done"

backup_of() { echo "backup/$1-pre-$TOPIC"; }
has_ref() { git rev-parse --verify -q "refs/heads/$1" >/dev/null; }
short() { echo "${1:0:8}"; }

old_tip() {
  local bk
  bk="$(backup_of "$1")"
  if has_ref "$bk"; then git rev-parse "$bk"; else git rev-parse "$1"; fi
}

STARTERS=( $(git for-each-ref --format='%(refname:short)' 'refs/heads/AGU-*-starter' | sort) )
LAB_SOLUTIONS=( $(git for-each-ref --format='%(refname:short)' 'refs/heads/AGU-*-solution' | grep -v "^$SOLUTION\$" | sort || true) )
[ "${#STARTERS[@]}" -gt 0 ] || { echo "no AGU-*-starter branches found" >&2; exit 1; }

starter_of_solution() { echo "${1%-solution}-starter"; }

classify() {
  local a b ta tb kind parent depth parent_depth
  for a in "${STARTERS[@]}"; do old_tip "$a" >"$WORK/oldtip/$a"; done
  for a in "${STARTERS[@]}"; do
    ta="$(cat "$WORK/oldtip/$a")"
    kind="direct"
    parent=""
    for b in "${STARTERS[@]}"; do
      [ "$a" = "$b" ] && continue
      tb="$(cat "$WORK/oldtip/$b")"
      if [ "$ta" = "$tb" ] && [[ "$b" < "$a" ]]; then
        kind="alias"
        parent="$b"
        break
      fi
    done
    echo "$kind" >"$WORK/kind/$a"
    echo "$parent" >"$WORK/parent/$a"
  done
  for a in "${STARTERS[@]}"; do
    [ "$(cat "$WORK/kind/$a")" = "alias" ] && continue
    ta="$(cat "$WORK/oldtip/$a")"
    parent=""
    parent_depth=-1
    for b in "${STARTERS[@]}"; do
      [ "$a" = "$b" ] && continue
      [ "$(cat "$WORK/kind/$b")" = "alias" ] && continue
      tb="$(cat "$WORK/oldtip/$b")"
      [ "$ta" = "$tb" ] && continue
      if git merge-base --is-ancestor "$tb" "$ta"; then
        depth="$(git rev-list --count "$tb")"
        if [ "$depth" -gt "$parent_depth" ]; then
          parent="$b"
          parent_depth="$depth"
        fi
      fi
    done
    if [ -n "$parent" ]; then
      echo "dependent" >"$WORK/kind/$a"
      echo "$parent" >"$WORK/parent/$a"
    fi
  done
}

kind_of() { cat "$WORK/kind/$1"; }
parent_of() { cat "$WORK/parent/$1"; }
oldtip_of() { cat "$WORK/oldtip/$1"; }
old_base_of() { git merge-base "$SOLUTION" "$(oldtip_of "$1")"; }

print_topology() {
  local a s
  echo "== topology (old tips)"
  echo "  $SOLUTION @ $(short "$(git rev-parse "$SOLUTION")")"
  for a in "${STARTERS[@]}"; do
    case "$(kind_of "$a")" in
      direct)    echo "  $a @ $(short "$(oldtip_of "$a")")  sits on $SOLUTION @ $(short "$(old_base_of "$a")")  ($(git rev-list --count "$(old_base_of "$a")..$(oldtip_of "$a")") commits)" ;;
      dependent) echo "  $a @ $(short "$(oldtip_of "$a")")  sits on $(parent_of "$a")  ($(git rev-list --count "$(oldtip_of "$(parent_of "$a")")..$(oldtip_of "$a")") commits)" ;;
      alias)     echo "  $a @ $(short "$(oldtip_of "$a")")  == $(parent_of "$a")" ;;
    esac
  done
  for s in "${LAB_SOLUTIONS[@]}"; do
    echo "  $s @ $(short "$(old_tip "$s")")  sits on $(starter_of_solution "$s")  ($(git rev-list --count "$(oldtip_of "$(starter_of_solution "$s")")..$(old_tip "$s")") commits)"
  done
}

ordered_starters() {
  local a p
  for a in "${STARTERS[@]}"; do
    [ "$(kind_of "$a")" = "direct" ] && echo "$a"
  done
  local remaining=1 progress
  while [ "$remaining" -gt 0 ]; do
    remaining=0
    progress=0
    for a in "${STARTERS[@]}"; do
      [ "$(kind_of "$a")" = "dependent" ] || continue
      [ -e "$WORK/done/$a" ] && continue
      p="$(parent_of "$a")"
      if [ "$(kind_of "$p")" = "direct" ] || [ -e "$WORK/done/$p" ]; then
        echo "$a"
        touch "$WORK/done/$a"
        progress=1
      else
        remaining=1
      fi
    done
    [ "$remaining" -eq 1 ] && [ "$progress" -eq 0 ] && { echo "cyclic starter topology" >&2; exit 1; }
  done
  for a in "${STARTERS[@]}"; do
    [ "$(kind_of "$a")" = "alias" ] && echo "$a"
  done
  rm -f "$WORK"/done/*
}

dry_run_merge() {
  local base="$1" ours="$2" theirs="$3" label="$4" out tree files
  if out="$(git merge-tree --write-tree --name-only --merge-base "$base" "$ours" "$theirs" 2>&1)"; then
    tree="$(echo "$out" | head -1)"
    echo "  $label: clean"
  else
    tree="$(echo "$out" | head -1)"
    files="$(echo "$out" | sed -n '2,$p' | sed '/^$/,$d')"
    echo "  $label: CONFLICTS in"
    echo "$files" | sed 's/^/      /'
  fi
  git commit-tree "$tree" -p "$ours" -m "sim $label" </dev/null
}

cmd_plan() {
  classify
  print_topology
  echo
  echo "== dry run (merge-tree, refs untouched)"
  local a s p sim
  for a in $(ordered_starters); do
    case "$(kind_of "$a")" in
      direct)
        if git merge-base --is-ancestor "$SOLUTION" "$(oldtip_of "$a")"; then
          echo "  $a: already on $SOLUTION tip, nothing to do"
          git rev-parse "$(oldtip_of "$a")" >"$WORK/sim/$a"
        else
          dry_run_merge "$(old_base_of "$a")" "$SOLUTION" "$(oldtip_of "$a")" "$a -> $SOLUTION" | tee "$WORK/out" | sed '$d'
          tail -1 "$WORK/out" >"$WORK/sim/$a"
        fi
        ;;
      dependent)
        p="$(parent_of "$a")"
        sim="$(cat "$WORK/sim/$p")"
        if git merge-base --is-ancestor "$sim" "$(oldtip_of "$a")"; then
          echo "  $a: already on $p tip, nothing to do"
          git rev-parse "$(oldtip_of "$a")" >"$WORK/sim/$a"
        else
          dry_run_merge "$(oldtip_of "$p")" "$sim" "$(oldtip_of "$a")" "$a -> $p" | tee "$WORK/out" | sed '$d'
          tail -1 "$WORK/out" >"$WORK/sim/$a"
        fi
        ;;
      alias)
        echo "  $a: will be re-pointed to $(parent_of "$a")"
        cp "$WORK/sim/$(parent_of "$a")" "$WORK/sim/$a"
        ;;
    esac
  done
  for s in "${LAB_SOLUTIONS[@]}"; do
    a="$(starter_of_solution "$s")"
    [ -e "$WORK/sim/$a" ] || { echo "  $s: no starter $a, skipped"; continue; }
    sim="$(cat "$WORK/sim/$a")"
    if git merge-base --is-ancestor "$sim" "$(old_tip "$s")"; then
      echo "  $s: already on $a tip, nothing to do"
    else
      dry_run_merge "$(oldtip_of "$a")" "$sim" "$(old_tip "$s")" "$s -> $a" | sed '$d'
    fi
  done
}

rebase_branch() {
  local onto="$1" upstream="$2" branch="$3"
  if git merge-base --is-ancestor "$onto" "$branch"; then
    echo "  $branch: already on $onto, skipped"
    return 0
  fi
  echo "  rebase --onto $onto $(short "$upstream") $branch"
  if ! git -c rerere.enabled=false rebase --onto "$onto" "$upstream" "$branch" >"$WORK/rebase.log" 2>&1; then
    echo
    echo "CONFLICT while rebasing $branch onto $onto. Unmerged files:"
    git ls-files -u | awk '{print $4}' | sort -u | sed 's/^/  /'
    echo
    echo "Resolve them one by one, 'git add' each, 'git rebase --continue', then re-run:"
    echo "  $0 run $TOPIC"
    exit 1
  fi
}

cmd_run() {
  local git_dir
  git_dir="$(git rev-parse --git-dir)"
  if [ -d "$git_dir/rebase-merge" ] || [ -d "$git_dir/rebase-apply" ]; then
    echo "a rebase is in progress; finish it with 'git rebase --continue' (or --abort) first" >&2
    exit 1
  fi
  if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
    echo "working tree has uncommitted changes; commit or stash them first" >&2
    exit 1
  fi
  local orig a s p b
  orig="$(git branch --show-current)"
  echo "== backups (backup/<branch>-pre-$TOPIC)"
  for b in "${STARTERS[@]}" "${LAB_SOLUTIONS[@]}"; do
    if has_ref "$(backup_of "$b")"; then
      echo "  $(backup_of "$b") exists, kept"
    else
      git branch "$(backup_of "$b")" "$b"
      echo "  $(backup_of "$b") created"
    fi
  done
  classify
  echo
  echo "== rebase"
  for a in $(ordered_starters); do
    case "$(kind_of "$a")" in
      direct)    rebase_branch "$SOLUTION" "$(old_base_of "$a")" "$a" ;;
      dependent) p="$(parent_of "$a")"; rebase_branch "$p" "$(oldtip_of "$p")" "$a" ;;
      alias)
        p="$(parent_of "$a")"
        if [ "$(git rev-parse "$a")" = "$(git rev-parse "$p")" ]; then
          echo "  $a: already == $p, skipped"
        else
          [ "$(git branch --show-current)" = "$a" ] && git checkout -q --detach
          git branch -f "$a" "$p"
          echo "  $a: re-pointed to $p"
        fi
        ;;
    esac
  done
  for s in "${LAB_SOLUTIONS[@]}"; do
    a="$(starter_of_solution "$s")"
    has_ref "$a" || { echo "  $s: no starter $a, skipped"; continue; }
    rebase_branch "$a" "$(oldtip_of "$a")" "$s"
  done
  if [ -n "$orig" ]; then
    git checkout -q "$orig"
  fi
  echo
  echo "done; now run: $0 verify $TOPIC"
}

count_todos() { { git grep -c 'TODO' "$1" 2>/dev/null || true; } | awk -F: '{s+=$NF} END {print s+0}'; }
count_markers() { { git grep -l '^<<<<<<< ' "$1" 2>/dev/null || true; } | wc -l | tr -d ' '; }

cmd_verify() {
  classify
  local a s b bk old_solution="" expected new_base old_base status
  for a in "${STARTERS[@]}"; do
    if [ "$(kind_of "$a")" = "direct" ] && has_ref "$(backup_of "$a")"; then
      old_solution="$(old_base_of "$a")"
      break
    fi
  done
  [ -n "$old_solution" ] || { echo "no backups for topic '$TOPIC' found" >&2; exit 1; }
  echo "== propagated commits: $(short "$old_solution")..$SOLUTION"
  git log --oneline "$old_solution..$SOLUTION" | sed 's/^/  /'
  git diff --name-only "$old_solution" "$SOLUTION" | sort >"$WORK/expected"
  echo "== files changed by them"
  sed 's/^/  /' "$WORK/expected"
  echo
  echo "== per branch: diff vs backup / conflict markers / TODOs / commits above base"
  for b in "${STARTERS[@]}" "${LAB_SOLUTIONS[@]}"; do
    bk="$(backup_of "$b")"
    has_ref "$bk" || { echo "  $b: no backup, skipped"; continue; }
    git diff --name-only "$bk" "$b" | sort >"$WORK/actual"
    if cmp -s "$WORK/expected" "$WORK/actual"; then
      status="OK (only the propagated files differ)"
    else
      status="CHECK: unexpected=[$(comm -13 "$WORK/expected" "$WORK/actual" | tr '\n' ' ')] missing=[$(comm -23 "$WORK/expected" "$WORK/actual" | tr '\n' ' ')]"
    fi
    case "$b" in
      *-starter)
        case "$(kind_of "$b")" in
          direct)    old_base="$old_solution"; new_base="$(git rev-parse "$SOLUTION")" ;;
          dependent|alias) old_base="$(oldtip_of "$(parent_of "$b")")"; new_base="$(git rev-parse "$(parent_of "$b")")" ;;
        esac
        ;;
      *) a="$(starter_of_solution "$b")"; old_base="$(oldtip_of "$a")"; new_base="$(git rev-parse "$a")" ;;
    esac
    echo "  $b"
    echo "    diff vs backup: $status"
    echo "    conflict markers: $(count_markers "$b")"
    echo "    TODOs: $(count_todos "$bk") -> $(count_todos "$b")"
    echo "    commits above base: $(git rev-list --count "$old_base..$bk") -> $(git rev-list --count "$new_base..$b")"
    if git rev-parse --verify -q "$b@{upstream}" >/dev/null 2>&1; then
      echo "    upstream: $(git rev-parse --abbrev-ref "$b@{upstream}") (push needs --force-with-lease, only when asked)"
    fi
  done
  echo
  echo "== topology (new tips)"
  for a in "${STARTERS[@]}"; do
    case "$(kind_of "$a")" in
      direct)    echo "  $a: base $(short "$(git merge-base "$SOLUTION" "$a")") $([ "$(git merge-base "$SOLUTION" "$a")" = "$(git rev-parse "$SOLUTION")" ] && echo "== $SOLUTION tip" || echo "!= $SOLUTION tip")" ;;
      dependent) echo "  $a: contains $(parent_of "$a") tip: $(git merge-base --is-ancestor "$(parent_of "$a")" "$a" && echo yes || echo NO)" ;;
      alias)     echo "  $a: == $(parent_of "$a"): $([ "$(git rev-parse "$a")" = "$(git rev-parse "$(parent_of "$a")")" ] && echo yes || echo NO)" ;;
    esac
  done
  for s in "${LAB_SOLUTIONS[@]}"; do
    a="$(starter_of_solution "$s")"
    has_ref "$a" || continue
    echo "  $s: contains $a tip: $(git merge-base --is-ancestor "$a" "$s" && echo yes || echo NO)"
  done
}

case "$CMD" in
  plan)   cmd_plan ;;
  run)    cmd_run ;;
  verify) cmd_verify ;;
  *)      usage ;;
esac
