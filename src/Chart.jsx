import { useEffect, useRef } from 'react'
import Highcharts from 'highcharts'
import 'highcharts/css/highcharts.css' // styledMode: colours come from CSS variables (index.css)

// Highcharts is free for non-commercial use only; commercial use needs a license.
export default function Chart({ options }) {
  const ref = useRef(null)

  useEffect(() => {
    const chart = Highcharts.chart(ref.current, options)
    return () => chart.destroy()
  }, [options])

  return <div ref={ref} className="chart" />
}
