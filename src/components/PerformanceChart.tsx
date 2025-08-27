import { useRef, useEffect, useState } from "react";
import {
  AreaSeries,
  createChart,
  IChartApi,
  ISeriesApi,
} from "lightweight-charts";
import { useTheme, Box } from "@mui/material";

// Alpha function for transparency
function alpha(color: string, value: number): string {
  return (
    color +
    Math.round(value * 255)
      .toString(16)
      .padStart(2, "0")
  );
}

// Lightweight Charts Component
export default function PerformanceChart({
  data,
  timestep,
}: {
  data: any;
  timestep: string;
}) {
  const theme = useTheme();
  const chartContainerRef = useRef(null as unknown as HTMLDivElement);
  const [chart, setChart] = useState(null as unknown as IChartApi);
  const [series, setSeries] = useState(null as unknown as ISeriesApi<any>);

  // Create chart on component mount
  useEffect(() => {
    if (chartContainerRef.current) {
      const newChart = createChart(chartContainerRef.current, {
        width: chartContainerRef.current.clientWidth,
        height: 300,
        layout: {
          background: { color: theme.palette.background.paper },
          textColor: theme.palette.text.primary,
        },
        grid: {
          vertLines: { color: theme.palette.divider },
          horzLines: { color: theme.palette.divider },
        },
        rightPriceScale: {
          borderColor: theme.palette.divider,
        },
        timeScale: {
          borderColor: theme.palette.divider,
          timeVisible: true,
          secondsVisible: false,
          fixLeftEdge: true,
          fixRightEdge: true,
        },
        crosshair: {
          mode: 0,
        },
        localization: {
          priceFormatter: (price: string) =>
            `$${parseFloat(price).toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
        },
      });

      const newSeries = newChart.addSeries(AreaSeries, {
        topColor: alpha(theme.palette.primary.main, 0.4),
        bottomColor: alpha(theme.palette.primary.main, 0.0),
        lineColor: theme.palette.primary.main,
        lineWidth: 2,
      });

      newChart.timeScale().applyOptions({
        barSpacing: 50000000, // default is 6
      });
      requestAnimationFrame(() => {
        const visibleLogicalRange = newChart
          .timeScale()
          .getVisibleLogicalRange()!;
        if (visibleLogicalRange == null) return;
        newChart.timeScale().setVisibleLogicalRange({
          from: visibleLogicalRange.to - 500,
          to: visibleLogicalRange.to,
        });
      });

      // Filter data based on timeframe
      let filteredData = [...data];

      newSeries.setData(filteredData);
      newChart.timeScale().fitContent();

      setChart(newChart);
      setSeries(newSeries);

      // Handle resize
      const handleResize = () => {
        if (newChart && chartContainerRef.current) {
          newChart.applyOptions({
            width: chartContainerRef.current.clientWidth,
          });
        }
        // const vr = chart.timeScale().getVisibleLogicalRange()!;
        // newChart.timeScale().setVisibleLogicalRange({
        //   from: vr.to - 21600,
        //   to: vr.to,
        // });
      };

      window.addEventListener("resize", handleResize);
      return () => {
        window.removeEventListener("resize", handleResize);
        if (newChart) {
          newChart.remove();
        }
      };
    }
  }, [chartContainerRef, timestep, theme]);

  // Update data when timeframe changes
  useEffect(() => {
    if (series) {
      let filteredData = [...data];

      series.setData(filteredData);
      if (
        chart &&
        chart.timeScale() &&
        chart.timeScale().getVisibleLogicalRange()
      ) {
        const visibleLogicalRange = chart.timeScale().getVisibleLogicalRange()!;
        const visibleRange: { [timestep: string]: number } = {
          "5 min": 7,
          "30 min": 340,
          "1 day": 900,
          "1 week": 2000,
        };

        console.log(timestep);
        chart.timeScale().setVisibleLogicalRange({
          from: visibleLogicalRange.to - (visibleRange[timestep] as number),
          to: visibleLogicalRange.to,
        });
      }
    }
  }, [timestep, data, series, chart]);

  return <Box ref={chartContainerRef} sx={{ width: "100%", height: "100%" }} />;
}
