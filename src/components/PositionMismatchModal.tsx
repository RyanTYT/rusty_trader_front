import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import SendIcon from "@mui/icons-material/Send";
import { load } from "@tauri-apps/plugin-store";
import { invoke } from "@tauri-apps/api/core";

type MismatchedPosition = {
  strategy: string;
  broker: number;
  local: number;
  fix: number;
};

export default function PositionsMismatchModal({
  close,
}: {
  close: () => void;
}) {
  const [positions_mismatch, set_positions_mismatch] = useState(
    {} as { [stock: string]: MismatchedPosition[] },
  );
  async function loadData() {
    const store = await load("store.json", { autoSave: false });
    const mismatched_positions =
      (await store.get<{
        [stock: string]: MismatchedPosition[];
      }>("mismatched_positions")) || {};
    // set_positions_mismatch(mismatched_positions);
    set_positions_mismatch({
      AAPL: [
        {
          strategy: "LOL",
          local: 13.0,
          broker: 50,
          fix: 13.0,
        },
        {
          strategy: "LOL2",
          local: 10.0,
          broker: 50,
          fix: 10.0,
        },
      ],
      NVIDIA: [
        {
          strategy: "FK",
          local: 5.0,
          broker: 23,
          fix: 5.0,
        },
      ],
    });
  }
  useEffect(() => {
    loadData();
  }, []);

  // Confirmation modal state
  const [openConfirmation, setOpenConfirmation] = useState(false);

  const handleAllocationChange = (
    stock_supplied: string,
    strategy_supplied: string,
    value: number,
  ) => {
    const index = positions_mismatch[stock_supplied].findIndex(
      (strat) => strat.strategy === strategy_supplied,
    );
    positions_mismatch[stock_supplied][index].fix = value;
    set_positions_mismatch({ ...positions_mismatch });
  };

  const handleSubmit = () => {
    setOpenConfirmation(true);
  };

  const handleConfirmSubmit = () => {
    // Here you would handle the actual submission logic
    setOpenConfirmation(false);
    invoke<[number, string]>("submit_position_mismatches", {
      fixed_positions: positions_mismatch,
    }).then(([status, msg]) => {
      if (status === 200) {
        console.log("ok");
      } else {
        console.log(`error: ${msg}`);
      }
    });

    close();
  };

  return (
    <Box sx={{ width: "100%" }}>
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
        Position Mismatches
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Adjust strategy allocations for the following stocks to resolve position
        mismatches.
      </Typography>

      {/* Stock sections */}
      {Object.entries(positions_mismatch).map(
        ([stock, position_mismatch], index) => (
          <Accordion
            key={stock}
            defaultExpanded={index === 0}
            sx={{
              boxShadow: "none",
              p: 0,
              "& .MuiDivider-root": {
                borderBottomWidth: 0,
              },
            }}
          >
            <AccordionSummary
              sx={{ boxShadow: "none", p: 1 }}
              expandIcon={<ExpandMoreIcon />}
              aria-controls={`panel-${stock}-content`}
              id={`panel-${stock}-header`}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  width: "100%",
                  justifyContent: "space-between",
                }}
              >
                <Typography sx={{ fontWeight: 600 }}>{stock}</Typography>
                <Typography
                  variant="body2"
                  color={`${
                    position_mismatch
                      .map((strat) => strat.fix)
                      .filter((num) => !Number.isNaN(num))
                      .reduce((l, r) => l + r) !== position_mismatch[0].broker
                      ? ""
                      : "theme.secondary"
                  }`}
                >
                  {`${position_mismatch
                    .map((strat) => strat.fix)
                    .filter((num) => !Number.isNaN(num))
                    .reduce((l, r) => l + r)
                    .toFixed(2)}`}{" "}
                  / {position_mismatch[0].broker}
                </Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ pl: 0 }}>
                {position_mismatch.map((strategy) => (
                  <Box key={strategy.strategy} sx={{ mb: 2 }}>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      {strategy.strategy}
                    </Typography>
                    <TextField
                      fullWidth
                      sx={{
                        boxShadow: "none",
                        "& input": {
                          borderBottomWidth: 0,
                        },
                      }}
                      size="small"
                      placeholder={`${strategy.local}`}
                      value={Number.isNaN(strategy.fix) ? "" : strategy.fix}
                      onChange={(e) =>
                        handleAllocationChange(
                          stock,
                          strategy.strategy,
                          parseFloat(e.target.value),
                        )
                      }
                    />
                  </Box>
                ))}
              </Box>
            </AccordionDetails>
            {index < Object.keys(positions_mismatch).length - 1 && <Divider />}
          </Accordion>
        ),
      )}

      {/* Submit button */}
      <Box sx={{ mt: 3 }}>
        <Button
          fullWidth
          variant="outlined"
          color="success"
          onClick={handleSubmit}
          endIcon={<SendIcon />}
          sx={{
            py: 1.5,
            fontWeight: 500,
            textAlign: "left",
            boxShadow: 0,
          }}
        >
          Update Allocations
        </Button>
      </Box>

      {/* Confirmation Modal */}
      <Dialog
        open={openConfirmation}
        onClose={() => setOpenConfirmation(false)}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          {"Confirm Allocation Updates"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Are you sure you want to update the strategy allocations for these
            positions? This will adjust your portfolio's target allocations.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenConfirmation(false)} color="primary">
            Cancel
          </Button>
          <Button
            onClick={handleConfirmSubmit}
            color="primary"
            variant="contained"
            autoFocus
          >
            Confirm Updates
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
