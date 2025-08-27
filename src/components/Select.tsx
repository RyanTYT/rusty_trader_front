import MenuItem from "@mui/material/MenuItem";
import { menuClasses } from "@mui/material/Menu";
import Select, { selectClasses } from "@mui/material/Select";
import { useTheme } from "@mui/material";

export default function SelectField({
  val,
  setVal,
  options,
}: {
  val: string;
  setVal: (arg: string) => void;
  options: string[];
}) {
  const theme = useTheme();

  return (
    <Select
      disableUnderline
      variant="standard"
      MenuProps={{
        anchorOrigin: {
          vertical: "bottom",
          horizontal: "left",
        },
        transformOrigin: {
          vertical: "top",
          horizontal: "left",
        },
        sx: {
          marginBlock: "0.5rem",
          [`& .${menuClasses.paper}`]: {
            borderRadius: "12px",
          },
          [`& .${menuClasses.list}`]: {
            paddingTop: 0,
            paddingBottom: 0,
            background: theme.palette.background.default,
            "& li": {
              paddingTop: "12px",
              paddingBottom: "12px",
            },
            "& li:hover": {
              background: theme.palette.primary.light,
            },
            "& li.Mui-selected": {
              color: "white",
              background: theme.palette.primary.dark,
            },
            "& li.Mui-selected:hover": {
              background: theme.palette.primary.light,
            },
          },
        },
      }}
      IconComponent={() => null}
      value={val}
      onChange={(event) => setVal(event.target.value as string)}
      sx={{
        flexGrow: 1,
        width: "100%",
        [`& .${selectClasses.select}`]: {
          background: theme.palette.background.default,
          border: `solid ${"0.1rem"} ${theme.palette.divider}`,
          color: theme.palette.primary.main,
          borderRadius: "12px",
          paddingLeft: "24px",
          paddingRight: "24px",
          paddingTop: "14px",
          paddingBottom: "15px",
          // boxShadow: "0px 5px 8px -3px rgba(0,0,0,0.14)",
          "&:focus": {
            borderRadius: "12px",
            background: theme.palette.background.default,
            borderColor: theme.palette.primary.main,
          },
        },
        [`& .${selectClasses.icon}`]: {
          right: "12px",
        },
      }}
    >
      {options.map((option) => (
        <MenuItem key={option} value={option}>
          {option}
        </MenuItem>
      ))}
    </Select>
  );
}
