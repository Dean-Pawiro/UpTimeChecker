export const build24hBars = (monitorId) => {
  const bars = [];
  for (let i = 0; i < 48; i += 1) {
    bars.push({
      id: i,
      up: (i + Number(monitorId || 0)) % 11 !== 0,
    });
  }
  return bars;
};

export const summarize24h = (bars) => {
  const total = bars.length;
  const upCount = bars.filter((bar) => bar.up).length;
  const downCount = total - upCount;
  const availability = total ? Math.round((upCount / total) * 10000) / 100 : 0;
  return { total, upCount, downCount, availability };
};
