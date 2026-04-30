import { useEffect, useRef } from 'react'
import { Chart, registerables } from 'chart.js'

// Register all Chart.js components
Chart.register(...registerables)

export function FraudTrendChart({ data }) {
  const chartRef = useRef(null)
  const chartInstance = useRef(null)

  useEffect(() => {
    if (!chartRef.current) return

    const ctx = chartRef.current.getContext('2d')

    if (chartInstance.current) {
      chartInstance.current.destroy()
    }

    chartInstance.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data?.labels || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [
          {
            label: 'Total Scans',
            data: data?.total || [12, 19, 15, 25, 22, 30, 28],
            borderColor: '#22c55e',
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            fill: true,
            tension: 0.4,
            pointBackgroundColor: '#22c55e',
            pointBorderColor: '#0f172a',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
          },
          {
            label: 'Fraud Detected',
            data: data?.fraud || [3, 5, 2, 8, 4, 12, 6],
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            fill: true,
            tension: 0.4,
            pointBackgroundColor: '#ef4444',
            pointBorderColor: '#0f172a',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: '#94a3b8',
              usePointStyle: true,
              padding: 20,
            },
          },
        },
        scales: {
          x: {
            grid: {
              color: 'rgba(148, 163, 184, 0.1)',
            },
            ticks: {
              color: '#94a3b8',
            },
          },
          y: {
            grid: {
              color: 'rgba(148, 163, 184, 0.1)',
            },
            ticks: {
              color: '#94a3b8',
            },
            beginAtZero: true,
          },
        },
        interaction: {
          intersect: false,
          mode: 'index',
        },
      },
    })

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy()
      }
    }
  }, [data])

  return (
    <div className="w-full h-64">
      <canvas ref={chartRef} />
    </div>
  )
}

export function DetectionPieChart({ data }) {
  const chartRef = useRef(null)
  const chartInstance = useRef(null)

  useEffect(() => {
    if (!chartRef.current) return

    const ctx = chartRef.current.getContext('2d')

    if (chartInstance.current) {
      chartInstance.current.destroy()
    }

    chartInstance.current = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Safe', 'Suspicious', 'Fraud', 'Threat'],
        datasets: [
          {
            data: data || [65, 20, 10, 5],
            backgroundColor: [
              '#22c55e', // Green - Safe
              '#facc15', // Yellow - Suspicious
              '#f97316', // Orange - High Risk
              '#ef4444', // Red - Threat
            ],
            borderColor: '#0f172a',
            borderWidth: 3,
            hoverOffset: 10,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: {
          legend: {
            position: 'right',
            labels: {
              color: '#94a3b8',
              usePointStyle: true,
              padding: 15,
            },
          },
        },
      },
    })

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy()
      }
    }
  }, [data])

  return (
    <div className="w-full h-64">
      <canvas ref={chartRef} />
    </div>
  )
}

export function ActivityBarChart({ data }) {
  const chartRef = useRef(null)
  const chartInstance = useRef(null)

  useEffect(() => {
    if (!chartRef.current) return

    const ctx = chartRef.current.getContext('2d')

    if (chartInstance.current) {
      chartInstance.current.destroy()
    }

    chartInstance.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data?.labels || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [
          {
            label: 'Scans',
            data: data?.scans || [15, 25, 18, 30, 22, 35, 28],
            backgroundColor: 'rgba(34, 197, 94, 0.7)',
            borderColor: '#22c55e',
            borderWidth: 1,
            borderRadius: 6,
            hoverBackgroundColor: '#22c55e',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
        },
        scales: {
          x: {
            grid: {
              display: false,
            },
            ticks: {
              color: '#94a3b8',
            },
          },
          y: {
            grid: {
              color: 'rgba(148, 163, 184, 0.1)',
            },
            ticks: {
              color: '#94a3b8',
            },
            beginAtZero: true,
          },
        },
      },
    })

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy()
      }
    }
  }, [data])

  return (
    <div className="w-full h-64">
      <canvas ref={chartRef} />
    </div>
  )
}

export function RiskScoreGauge({ score }) {
  const chartRef = useRef(null)
  const chartInstance = useRef(null)

  useEffect(() => {
    if (!chartRef.current) return

    const ctx = chartRef.current.getContext('2d')

    if (chartInstance.current) {
      chartInstance.current.destroy()
    }

    // Calculate color based on score
    const getColor = (score) => {
      if (score < 30) return '#22c55e'
      if (score < 60) return '#facc15'
      if (score < 80) return '#f97316'
      return '#ef4444'
    }

    chartInstance.current = new Chart(ctx, {
      type: 'doughnut',
      data: {
        datasets: [
          {
            data: [score, 100 - score],
            backgroundColor: [getColor(score), 'rgba(148, 163, 184, 0.2)'],
            borderWidth: 0,
            circumference: 180,
            rotation: 270,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '80%',
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            enabled: false,
          },
        },
      },
    })

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy()
      }
    }
  }, [score])

  return (
    <div className="relative w-full h-32">
      <canvas ref={chartRef} />
      <div className="absolute inset-0 flex items-end justify-center pb-2">
        <span className="text-3xl font-bold">{score}</span>
      </div>
    </div>
  )
}
