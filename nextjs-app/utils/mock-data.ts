export function generateMockData(type: string) {
  // Normalize chart type to handle both kebab-case and camelCase
  const normalizeChartType = (chartType: string) => {
    // Convert camelCase to kebab-case if needed
    if (chartType === "barChart") return "bar-chart"
    if (chartType === "lineChart") return "line-chart"
    if (chartType === "pieChart") return "pie-chart"
    if (chartType === "areaChart") return "area-chart"
    if (chartType === "scatterChart") return "scatter-chart"
    if (chartType === "radarChart") return "radar-chart"
    if (chartType === "radialBarChart") return "radial-bar-chart"
    return chartType
  }

  const normalizedType = normalizeChartType(type)

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"]

  if (normalizedType === "bar-chart" || normalizedType === "line-chart" || normalizedType === "area-chart") {
    return months.map((month) => ({
      name: month,
      value: Math.floor(Math.random() * 1000),
    }))
  } else if (normalizedType === "pie-chart") {
    return [
      { name: "Group A", value: 400 },
      { name: "Group B", value: 300 },
      { name: "Group C", value: 300 },
      { name: "Group D", value: 200 },
    ]
  } else if (normalizedType === "scatter-chart") {
    return Array.from({ length: 20 }, (_, i) => ({
      name: `Point ${i + 1}`,
      x: Math.random() * 100,
      y: Math.random() * 100,
      z: Math.random() * 50 + 50,
    }))
  } else if (normalizedType === "radar-chart") {
    // For radar charts, we need multiple metrics for each category
    return [
      { name: "Product A", sales: 80, marketing: 120, development: 70, support: 50, research: 90 },
      { name: "Product B", sales: 100, marketing: 80, development: 60, support: 90, research: 70 },
      { name: "Product C", sales: 60, marketing: 70, development: 90, support: 60, research: 110 },
      { name: "Product D", sales: 90, marketing: 110, development: 80, support: 70, research: 60 },
    ]
  } else if (normalizedType === "radial-bar-chart") {
    return [
      { name: "18-24", value: 31.47 },
      { name: "25-29", value: 26.69 },
      { name: "30-34", value: 15.69 },
      { name: "35-39", value: 9.22 },
      { name: "40-49", value: 13.63 },
      { name: "50+", value: 7.3 },
    ]
  } else {
    return []
  }
}
