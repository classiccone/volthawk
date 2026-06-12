// Simulated transmission corridor in rural SE Missouri
// Follows flat farmland between Sikeston and New Madrid — classic
// delta terrain with long straight ROWs typical of 230kV lines

export const CORRIDOR = [
  [36.8765, -89.5870],  // south of Sikeston, MO
  [36.8620, -89.5720],
  [36.8470, -89.5585],
  [36.8310, -89.5460],
  [36.8150, -89.5350],
  [36.7985, -89.5260],
  [36.7820, -89.5165],
  [36.7660, -89.5075],
  [36.7500, -89.4980],  // approaching New Madrid, MO
]

const VIDEO_DURATION = 1210 // seconds

function segmentLengths(corridor) {
  const lengths = []
  for (let i = 1; i < corridor.length; i++) {
    const dlat = corridor[i][0] - corridor[i - 1][0]
    const dlng = corridor[i][1] - corridor[i - 1][1]
    lengths.push(Math.sqrt(dlat * dlat + dlng * dlng))
  }
  return lengths
}

export function findingToCoords(finding, videoDuration = VIDEO_DURATION) {
  const t = Math.min(Math.max(finding.start_time / videoDuration, 0), 1)
  const lengths = segmentLengths(CORRIDOR)
  const total = lengths.reduce((a, b) => a + b, 0)

  let target = t * total
  for (let i = 0; i < lengths.length; i++) {
    if (target <= lengths[i]) {
      const ratio = target / lengths[i]
      const lat = CORRIDOR[i][0] + ratio * (CORRIDOR[i + 1][0] - CORRIDOR[i][0])
      const lng = CORRIDOR[i][1] + ratio * (CORRIDOR[i + 1][1] - CORRIDOR[i][1])
      return [lat, lng]
    }
    target -= lengths[i]
  }
  return CORRIDOR[CORRIDOR.length - 1]
}
