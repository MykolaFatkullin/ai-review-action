export interface RightSideLine {
  line: number;
  content: string;
  isAdded: boolean;
}

export function extractRightSideLinesFromPatch(patch: string): number[] {
  return extractRightSideLineDetailsFromPatch(patch).map(line => line.line);
}

export function extractRightSideLineDetailsFromPatch(patch: string): RightSideLine[] {
  const lines = patch.split("\n");
  const result: RightSideLine[] = [];

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
      result.push({
        line: newLine,
        content: line.slice(1),
        isAdded: true,
      });

      newLine++;
      continue;
    }

    if (line.startsWith("-") && !line.startsWith("---")) {
      continue;
    }

    if (line.startsWith(" ")) {
      result.push({
        line: newLine,
        content: line.slice(1),
        isAdded: false,
      });

      newLine++;
      continue;
    }

    if (line === "\\ No newline at end of file") {
      continue;
    }
  }

  return result;
}