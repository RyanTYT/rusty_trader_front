import { useState } from "react";
import {
  Paper,
  Typography,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";
import CodeIcon from "@mui/icons-material/Code";
import SendIcon from "@mui/icons-material/Send";
import { TitleBox, VBox } from "../theme";

// Simple code editor component
const CodeEditor = ({
  code,
  setCode,
}: {
  code: string;
  setCode: (code: string) => void;
}) => {
  return (
    <Box
      component="textarea"
      sx={{
        width: "100%",
        height: "400px",
        fontFamily: "monospace",
        fontSize: "14px",
        padding: 2,
        borderRadius: 1,
        border: "1px solid #ccc",
        backgroundColor: "#f5f5f5",
        resize: "vertical",
        outline: "none",
        "&:focus": {
          border: "1px solid #1976D2",
        },
      }}
      value={code}
      onChange={(e) => setCode(e.target.value)}
      placeholder="# Write your Python code here"
    />
  );
};

export default function PythonCodeEditor() {
  const [code, setCode] = useState(
    '# Example Python code\n\ndef calculate_fibonacci(n):\n    if n <= 1:\n        return n\n    else:\n        return calculate_fibonacci(n-1) + calculate_fibonacci(n-2)\n\n# Calculate first 10 Fibonacci numbers\nfor i in range(10):\n    print(f"Fibonacci({i}) = {calculate_fibonacci(i)}")\n',
  );

  const [openModal, setOpenModal] = useState(false);

  const handleSubmit = () => {
    setOpenModal(true);
  };

  const handleCloseModal = () => {
    setOpenModal(false);
  };

  const handleConfirmSubmit = () => {
    // In a real app, this would submit the code to a backend
    setOpenModal(false);
  };

  return (
    <VBox
      sx={{
        p: 2,
        mx: "auto",
      }}
    >
      <TitleBox>
        <Typography variant="h1">Python Code Editor</Typography>
      </TitleBox>

      {/* Code Editor Panel */}
      <Paper variant="normal">
        <TitleBox sx={{ mb: 2, justifyContent: "space-between" }}>
          <Typography variant="h3">
            <CodeIcon sx={{ mr: 1, verticalAlign: "middle" }} />
            Editor
          </Typography>
        </TitleBox>

        <CodeEditor code={code} setCode={setCode} />
      </Paper>

      {/* Submit Button */}
      <Button
        fullWidth
        variant="outlined"
        color="success"
        onClick={handleSubmit}
        endIcon={<SendIcon />} // Changed from startIcon to endIcon
        sx={{
          py: 1,
          fontWeight: 500,
          textAlign: "left",
          // bgcolor: "error.main"
          boxShadow: 0,
        }}
      >
        Submit Strategy
      </Button>

      {/* Confirmation Modal */}
      <Dialog
        open={openModal}
        onClose={handleCloseModal}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          {"Submit Python Code"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Are you sure you want to submit this code? Once submitted, it cannot
            be edited.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseModal} color="primary">
            Cancel
          </Button>
          <Button
            onClick={handleConfirmSubmit}
            color="primary"
            variant="contained"
            autoFocus
          >
            Confirm Submission
          </Button>
        </DialogActions>
      </Dialog>
    </VBox>
  );
}
