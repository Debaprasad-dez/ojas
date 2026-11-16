// The brand heat ramp, coolest to hottest. heat(0) is yellow, heat(1) red.
const HEAT = ['#F9BB1F', '#F89F09', '#F88108', '#F96101', '#F83E01', '#DE1B01']

export function heat(t) {
  const x = Math.max(0, Math.min(1, t)) * (HEAT.length - 1)
  const i = Math.min(Math.floor(x), HEAT.length - 2)
  const f = x - i
  const a = HEAT[i]
  const b = HEAT[i + 1]
  const ch = (k) => Math.round(parseInt(a.slice(k, k + 2), 16) * (1 - f) + parseInt(b.slice(k, k + 2), 16) * f)
  return `rgb(${ch(1)},${ch(3)},${ch(5)})`
}
