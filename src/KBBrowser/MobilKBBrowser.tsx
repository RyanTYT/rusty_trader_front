// src/news_ideas/components/MobileKBBrowser.tsx

import {
  Box,
  CircularProgress,
  IconButton,
  InputAdornment,
  TextField,
  Typography,
  AppBar,
  Toolbar,
  Slide,
  Divider,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import FolderIcon from "@mui/icons-material/Folder";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import DataObjectIcon from "@mui/icons-material/DataObject";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import { useCallback, useEffect, useState } from "react";
import type { KBFile, KBFileContent } from "./types";
import { invoke } from "@tauri-apps/api/core";

// ── Helpers (Kept from original) ───────────────────────────────────────────
const formatBytes = (b: number) =>
  b === 0 ? "" : b < 1024 ? `${b} B` : `${(b / 1024).toFixed(1)} KB`;
const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

// ── Mobile Tree Node ───────────────────────────────────────────────────────
// Increased padding and font size for touch
function MobileTreeNode({ node, depth, filter, onSelect }: any) {
  const [open, setOpen] = useState(depth < 1);
  const indent = depth * 16;

  if (node.is_dir) {
    return (
      <>
        <Box
          onClick={() => setOpen(!open)}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            px: 2,
            py: 1.5, // Taller touch target
            pl: `${16 + indent}px`,
            borderBottom: "1px solid rgba(0,0,0,0.03)",
          }}
        >
          {open ? (
            <FolderOpenIcon sx={{ fontSize: 20, color: "#f59e0b" }} />
          ) : (
            <FolderIcon sx={{ fontSize: 20, color: "#f59e0b" }} />
          )}
          <Typography variant="body1" sx={{ fontWeight: 600, flex: 1 }}>
            {node.name}
          </Typography>
          <Typography variant="caption" color="text.disabled">
            {node.children?.length}
          </Typography>
        </Box>
        {open &&
          node.children?.map((child: any) => (
            <MobileTreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              filter={filter}
              onSelect={onSelect}
            />
          ))}
      </>
    );
  }

  return (
    <Box
      onClick={() => onSelect(node)}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        px: 2,
        py: 1.5,
        pl: `${16 + indent}px`,
        borderBottom: "1px solid rgba(0,0,0,0.03)",
        "&:active": { bgcolor: "action.selected" },
      }}
    >
      {node.name.endsWith(".json") ? (
        <DataObjectIcon sx={{ fontSize: 20, color: "#8b5cf6" }} />
      ) : (
        <DescriptionOutlinedIcon sx={{ fontSize: 20, color: "#3b82f6" }} />
      )}
      <Typography variant="body1" sx={{ flex: 1 }}>
        {node.name}
      </Typography>
      <Typography variant="caption" color="text.disabled">
        {formatBytes(node.size_bytes)}
      </Typography>
    </Box>
  );
}

// ── Main Mobile Component ──────────────────────────────────────────────────

export default function MobileKBBrowser() {
  const [view, setView] = useState<"tree" | "viewer">("tree");
  const [tree, setTree] = useState<KBFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<KBFileContent | null>(null);
  const [filter, setFilter] = useState("");

  const loadTree = useCallback(async () => {
    setLoading(true);
    try {
      const data = await invoke<KBFile[]>("kb_tree");
      setTree(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTree();
  }, [loadTree]);

  const handleFileSelect = async (node: KBFile) => {
    if (node.is_dir) return;
    setLoading(true);
    try {
      const data = await invoke<KBFileContent>("kb_file", { path: node.path });
      setSelectedFile(data);
      setView("viewer"); // Switch to viewer on mobile
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        bgcolor: "background.default",
        mx: "auto",
      }}
    >
      {/* ── View 1: The File List ── */}
      {view === "tree" && (
        <Slide
          direction="right"
          in={view === "tree"}
          mountOnEnter
          unmountOnExit
        >
          <Box
            sx={{ display: "flex", flexDirection: "column", height: "100%" }}
          >
            <AppBar
              position="static"
              color="transparent"
              elevation={0}
              sx={{ borderColor: "divider" }}
            >
              <Toolbar>
                <Typography variant="h1" sx={{ flex: 1, fontWeight: 800 }}>
                  Knowledge Base
                </Typography>
                <IconButton onClick={loadTree} disabled={loading}>
                  {loading ? <CircularProgress size={20} /> : <RefreshIcon />}
                </IconButton>
              </Toolbar>
            </AppBar>

            <Box sx={{ p: 2 }}>
              <TextField
                fullWidth
                size="medium"
                placeholder="Search files..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                  endAdornment: filter && (
                    <IconButton size="small" onClick={() => setFilter("")}>
                      <ClearIcon />
                    </IconButton>
                  ),
                }}
              />
            </Box>

            <Box sx={{ flex: 1, overflowY: "auto" }}>
              {tree.map((node) => (
                <MobileTreeNode
                  key={node.path}
                  node={node}
                  depth={0}
                  filter={filter}
                  onSelect={handleFileSelect}
                />
              ))}
            </Box>
          </Box>
        </Slide>
      )}

      {/* ── View 2: The File Viewer ── */}
      {view === "viewer" && (
        <Slide
          direction="left"
          in={view === "viewer"}
          mountOnEnter
          unmountOnExit
        >
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              height: "100%",
              bgcolor: "background.paper",
              width: "100vw"
            }}
          >
            <AppBar position="static" color="inherit" elevation={0}>
              <Toolbar>
                <IconButton
                  edge="start"
                  onClick={() => setView("tree")}
                  sx={{ mr: 1 }}
                >
                  <ArrowBackIcon />
                </IconButton>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="subtitle2" noWrap>
                    {selectedFile?.path.split("/").pop()}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {selectedFile && formatDate(selectedFile.last_modified)}
                  </Typography>
                </Box>
              </Toolbar>
            </AppBar>
            <Divider />

            <Box sx={{ flex: 1, overflowY: "auto", p: 2 }}>
              {/* Content Rendering logic (Markdown or JSON) remains same as desktop */}
              <Typography
                variant="body2"
                component="pre"
                sx={{ whiteSpace: "pre-wrap", fontSize: "0.85rem" }}
              >
                {selectedFile?.content}
              </Typography>
            </Box>
          </Box>
        </Slide>
      )}
    </Box>
  );
}
