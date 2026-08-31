// Pure rank/bar/delta math for the N-city comparison table. No Vue or API imports — operates
// only on the CompareCell/CompareRow shapes defined in compare.ts.

export type MetricDirection = "higher" | "lower";

export type CompareCell = {
  value: number | null;
  display: string;
  // Explains why a cell has no value (e.g. only lower-fidelity data was available), shown as a
  // tooltip on the "—" placeholder. Null when the cell simply has no explanation to offer.
  note: string | null;
};

// Fraction below which a delta-vs-first is treated as "no real difference" rather than a
// good/bad swing — avoids painting green/red pills over noise-level gaps.
const FLAT_THRESHOLD = 0.02;

/**
 * Ranks cells 1..N by value according to direction ("higher" = rank 1 is the largest value).
 * Null-valued cells get rank null (unranked, excluded from best/worst). Tied values share a rank.
 */
export function rankCells(cells: CompareCell[], direction: MetricDirection): (number | null)[] {
  const indexed = cells.map((c, i) => ({ i, v: c.value }));
  const ranked = indexed
    .filter((c) => c.v != null)
    .sort((a, b) => (direction === "higher" ? b.v! - a.v! : a.v! - b.v!));

  const ranks = new Array<number | null>(cells.length).fill(null);
  let rank = 0;
  let prevValue: number | null = null;
  ranked.forEach(({ i, v }, pos) => {
    if (v !== prevValue) {
      rank = pos + 1;
      prevValue = v;
    }
    ranks[i] = rank;
  });
  return ranks;
}

export function bestIndex(cells: CompareCell[], direction: MetricDirection): number | null {
  const ranks = rankCells(cells, direction);
  const best = ranks.findIndex((r) => r === 1);
  return best === -1 ? null : best;
}

export function worstIndex(cells: CompareCell[], direction: MetricDirection): number | null {
  const ranks = rankCells(cells, direction);
  const validRanks = ranks.filter((r): r is number => r != null);
  if (!validRanks.length) return null;
  const maxRank = Math.max(...validRanks);
  const worst = ranks.findIndex((r) => r === maxRank);
  return worst === -1 || worst === bestIndex(cells, direction) ? null : worst;
}

/**
 * Proportional bar width (0–1) for a cell relative to the rest of the row. For "higher" metrics
 * this is value/max; for "lower" metrics it's inverted (min/value) so the best (lowest) value
 * still draws the fullest bar.
 */
export function barWidth(cell: CompareCell, cells: CompareCell[], direction: MetricDirection): number {
  const values = cells.map((c) => c.value).filter((v): v is number => v != null);
  if (!values.length || cell.value == null) return 0;

  if (direction === "higher") {
    const max = Math.max(...values);
    return max === 0 ? 0 : cell.value / max;
  }

  const min = Math.min(...values);
  return cell.value === 0 ? (min === 0 ? 1 : 0) : min / cell.value;
}

export type DeltaClass = "good" | "bad" | "flat";

export type Delta = {
  fraction: number;
  klass: DeltaClass;
};

/**
 * Delta of a cell vs. the first active slot's cell, classified good/bad/flat by direction.
 * Returns null when either value is missing or the first cell has a zero/absent value.
 */
export function deltaVsFirst(cell: CompareCell, firstCell: CompareCell, direction: MetricDirection): Delta | null {
  if (cell.value == null || firstCell.value == null || firstCell.value === 0) return null;

  const fraction = (cell.value - firstCell.value) / firstCell.value;
  if (Math.abs(fraction) < FLAT_THRESHOLD) return { fraction, klass: "flat" };

  const improved = direction === "higher" ? fraction > 0 : fraction < 0;
  return { fraction, klass: improved ? "good" : "bad" };
}

/**
 * Counts, per slot index, how many ranked rows that slot won (rank 1) across the given rows.
 */
export function leaderTally(rows: Array<{ direction: MetricDirection; cells: CompareCell[] }>, slotCount: number): number[] {
  const tally = new Array(slotCount).fill(0);
  for (const row of rows) {
    const best = bestIndex(row.cells, row.direction);
    if (best != null) tally[best] += 1;
  }
  return tally;
}
