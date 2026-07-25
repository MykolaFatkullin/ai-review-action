export function extractRightSideLinesFromPatch(patch: string): number[] {
  const lines = patch.split("\n");
  const result = new Set<number>();

  let newLine: number | null = null;

  for (const line of lines) {
    const hunkMatch = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);

    if (hunkMatch) {
      newLine = Number(hunkMatch[1]);
      continue;
    }

    if (newLine === null) {
      continue;
    }

    if (line.startsWith("+") && !line.startsWith("+++")) {
      result.add(newLine);
      newLine++;
      continue;
    }

    if (line.startsWith("-") && !line.startsWith("---")) {
      continue;
    }

    if (line.startsWith(" ")) {
      result.add(newLine);
      newLine++;
      continue;
    }

    if (line === "\\ No newline at end of file") {
      continue;
    }
  }

  return [...result].sort((a, b) => a - b);
}