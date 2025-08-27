import { createTheme } from "@mui/material/styles";
import "@fontsource-variable/inter";
import Box from "@mui/material/Box";
import { styled } from "@mui/material/styles";

// Define styled variants

export const TitleBox = styled(Box)(({ }) => ({
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
}));

export const VBox = styled(Box)(({ theme }) => ({
    display: "flex",
    flexDirection: "column",
    width: "100%",
    gap: theme.spacing(2),
}));

export const HBox = styled(Box)(({ theme }) => ({
    display: "flex",
    flexDirection: "row",
    width: "100%",
    gap: theme.spacing(2),
}));

export const GridBox = styled(Box)(({ theme }) => ({
    display: "grid",
    // Responsive breakpoints
    [theme.breakpoints.up("xs")]: {
        gridTemplateColumns: "repeat(2, 1fr)",
    },
    [theme.breakpoints.up("sm")]: {
        gridTemplateColumns: "repeat(2, 1fr)",
    },
    [theme.breakpoints.up("lg")]: {
        gridTemplateColumns: "repeat(4, 1fr)",
    },
    gap: theme.spacing(2),
}));

const theme = createTheme({
    transitions: {
        duration: {
            enteringScreen: 225,
        },
        easing: {
            sharp: "cubic-bezier(0.4, 0, 0.6, 1)",
        },
    },

    palette: {
        mode: "light",
        primary: {
            main: "#1976D2", // Professional Blue
            light: "#63a4ff", // Hover or active state
            dark: "#004ba0", // Pressed or selected state
            contrastText: "#fff", // Text on primary buttons
        },
        secondary: {
            main: "#388E3C",
            light: "#66BB6A", // Hover
            dark: "#2E7D32", // Pressed
            contrastText: "#fff",
        },
        background: {
            default: "#F5F7FA",
            paper: "#FFFFFF",
        },
        text: {
            primary: "#212121",
            secondary: "#757575",
        },
        success: {
            main: "#4CAF50",
            light: "#81C784",
            dark: "#388E3C",
            contrastText: "#fff",
        },
        error: {
            main: "#E53935",
            light: "#EF5350",
            dark: "#B71C1C",
            contrastText: "#fff",
        },
        warning: {
            main: "#F9A825",
            light: "#FFEE58",
            dark: "#F57F17",
            contrastText: "#000",
        },
    },

    typography: {
        fontFamily: "Inter, sans-serif",
        fontSize: 14, // base font size
        h1: {
            fontSize: "2.25rem",
            fontWeight: 600,
        },
        h2: {
            fontSize: "1.75rem",
            fontWeight: 600,
        },
        h3: {
            fontSize: "1.5rem",
            fontWeight: 600,
        },
        h4: {
            fontSize: "1.25rem",
            fontWeight: 600,
        },
        h5: {
            fontSize: "1rem",
            fontWeight: 500,
        },
        h6: {
            fontSize: "0.875rem",
            fontWeight: 500,
        },
        subtitle1: {
            fontSize: "0.9rem",
            fontWeight: 400,
            color: "#666",
        },
        body1: {
            fontSize: "0.95rem",
        },
        body2: {
            fontSize: "0.85rem",
            color: "#555",
        },
        button: {
            fontWeight: 500,
            textTransform: "none",
            fontSize: "0.875rem",
        },
        caption: {
            fontSize: "0.75rem",
            color: "#999",
        },
        overline: {
            fontSize: "0.7rem",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: "#999",
        },
    },

    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                },
            },
        },
        MuiPaper: {
            styleOverrides: {
                root: {
                    borderRadius: 12,
                    variants: [
                        {
                            props: { variant: "normal" },
                            style: {
                                backgroundColor: "#FFFFFF",
                                padding: 16,
                                borderRadius: 12,
                                boxShadow: 0,
                                display: "flex",
                                flexDirection: "column",
                                gap: 16,
                            },
                        },
                    ],
                },
            },
        },
    },
});

declare module "@mui/material/Paper" {
    interface PaperPropsVariantOverrides {
        normal: true;
    }
}

export default theme;
