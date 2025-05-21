import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
  TooltipProps,
} from "recharts";
import { Box, useTheme } from "@mui/material";
import {
  ValueType,
  NameType,
} from "recharts/types/component/DefaultTooltipContent";

export default function PortfolioPieChart({
  data,
}: {
  data: {
    name: string;
    value: number;
    color: string;
  }[];
}) {
  const theme = useTheme();

  // Custom tooltip to match your design language
  const CustomTooltip = ({
    active,
    payload,
  }: TooltipProps<ValueType, NameType>) => {
    if (active && payload && payload.length) {
      return (
        <Box
          sx={{
            bgcolor: "background.paper",
            p: 1.5,
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: 1,
            boxShadow: theme.shadows[2],
          }}
        >
          <div style={{ color: payload[0].payload.color, fontWeight: 500 }}>
            {payload[0].name}
          </div>
          <div>{payload[0].value}% of portfolio</div>
        </Box>
      );
    }
    return null;
  };

  // Custom legend renderer
  const renderLegend = (props: any) => {
    const { payload } = props;

    return (
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: 2,
          mt: 2,
        }}
      >
        {payload.map(
          (entry: { color: string; value: number }, index: number) => (
            <Box
              key={`legend-${index}`}
              sx={{
                display: "flex",
                alignItems: "center",
                fontSize: "0.875rem",
              }}
            >
              <div
                style={{
                  width: 12,
                  height: 12,
                  backgroundColor: entry.color,
                  marginRight: 8,
                  borderRadius: "50%",
                }}
              />
              <span>
                {entry.value} ({data[index].value}%)
              </span>
            </Box>
          ),
        )}
      </Box>
    );
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          outerRadius={100}
          innerRadius={60}
          dataKey="value"
        >
          {data.map((entry: { color: string }, index: number) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        {<Tooltip content={<CustomTooltip />} />}
        <Legend content={renderLegend} />
      </PieChart>
    </ResponsiveContainer>
  );
}
