/** "Nice number" rounding for axis ticks (Heckbert's algorithm), used so a linear Y axis shows
 * ~4–5 round, readable values rather than raw fractional endpoints. */
function niceNumber(value: number, round: boolean): number {
  const exponent = Math.floor(Math.log10(value));
  const fraction = value / 10 ** exponent;
  let niceFraction: number;
  if (round) {
    if (fraction < 1.5) niceFraction = 1;
    else if (fraction < 3) niceFraction = 2;
    else if (fraction < 7) niceFraction = 5;
    else niceFraction = 10;
  } else if (fraction <= 1) niceFraction = 1;
  else if (fraction <= 2) niceFraction = 2;
  else if (fraction <= 5) niceFraction = 5;
  else niceFraction = 10;
  return niceFraction * 10 ** exponent;
}

/** Produces ~`targetCount` evenly spaced, human-readable tick values covering `[0, max]` (a runtime
 * metric chart always starts its linear axis at 0, per the existing chart baseline). Returns at
 * least two ticks (`0` and `max`) even for a degenerate zero-span input. */
export function linearAxisTicks(max: number, targetCount = 5): number[] {
  if (!Number.isFinite(max) || max <= 0) return [0, 1];
  const step = niceNumber(max / Math.max(targetCount - 1, 1), true);
  const niceMax = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let tick = 0; tick <= niceMax + step / 2; tick += step) ticks.push(Number(tick.toFixed(10)));
  return ticks;
}

/** Produces log10-decade ticks (…0.1, 1, 10, 100…) covering `[min, max]`, both required strictly
 * positive. Falls back to the two endpoints if the span covers less than one decade. */
export function logAxisTicks(min: number, max: number): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max) || min <= 0 || max <= 0 || min >= max) return [min, max];
  const startExp = Math.floor(Math.log10(min));
  const endExp = Math.ceil(Math.log10(max));
  const ticks: number[] = [];
  for (let exp = startExp; exp <= endExp; exp += 1) ticks.push(10 ** exp);
  return ticks.length >= 2 ? ticks : [min, max];
}
