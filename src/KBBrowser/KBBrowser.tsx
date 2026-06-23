// src/news_ideas/components/KBBrowser.tsx
//
// Two-panel knowledge base browser:
//   Left:  collapsible file tree (directories + files)
//   Right: markdown file viewer with last-modified timestamp
//
// Features:
//   - Lazy-loads file content on click (not all at once)
//   - Auto-refreshes tree on mount
//   - Distinguishes file types: .md shown as rendered info, .json as raw
//   - Directory nodes expand/collapse
//   - Shows file size + last-modified in the viewer header
//   - Search/filter across file names in the tree
//   - Keyboard navigation: arrow keys to move, Enter to open

import {
  Box,
  CircularProgress,
  Divider,
  IconButton,
  InputAdornment,
  Paper,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import FolderIcon from "@mui/icons-material/Folder";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import DataObjectIcon from "@mui/icons-material/DataObject";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import { useCallback, useEffect, useState } from "react";
import { useTheme } from "@mui/material/styles";
import type { KBFile, KBFileContent } from "./types";
import { invoke } from "@tauri-apps/api/core";
import { TitleBox, VBox } from "../theme";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes === 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// function flattenFiles(nodes: KBFile[]): KBFile[] {
//   const result: KBFile[] = [];
//   const visit = (n: KBFile) => {
//     if (!n.is_dir) result.push(n);
//     n.children?.forEach(visit);
//   };
//   nodes.forEach(visit);
//   return result;
// }

// ── File tree node ─────────────────────────────────────────────────────────────

interface TreeNodeProps {
  node: KBFile;
  depth: number;
  selectedPath: string | null;
  filter: string;
  onSelect: (node: KBFile) => void;
}

function TreeNode({
  node,
  depth,
  selectedPath,
  filter,
  onSelect,
}: TreeNodeProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [open, setOpen] = useState(depth < 2); // Top 2 levels open by default

  const isSelected = selectedPath === node.path;
  const nameMatch = node.name.toLowerCase().includes(filter.toLowerCase());

  // When filtering, auto-expand dirs that have matching descendants
  const hasMatchingDescendant = (n: KBFile): boolean => {
    if (!filter) return false;
    if (!n.is_dir) return n.name.toLowerCase().includes(filter.toLowerCase());
    return n.children?.some(hasMatchingDescendant) ?? false;
  };

  // Don't render if filter active and nothing matches in this subtree
  if (filter && !nameMatch && !hasMatchingDescendant(node)) return null;

  const indent = depth * 14;

  if (node.is_dir) {
    const isOpenEffective = filter ? open || hasMatchingDescendant(node) : open;
    return (
      <>
        <Box
          onClick={() => setOpen((o) => !o)}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.75,
            px: 1,
            py: 0.4,
            pl: `${8 + indent}px`,
            cursor: "pointer",
            borderRadius: 1,
            userSelect: "none",
            "&:hover": {
              background: isDark
                ? "rgba(255,255,255,0.05)"
                : "rgba(0,0,0,0.04)",
            },
          }}
        >
          {isOpenEffective ? (
            <FolderOpenIcon
              sx={{ fontSize: 15, color: "#f59e0b", flexShrink: 0 }}
            />
          ) : (
            <FolderIcon
              sx={{ fontSize: 15, color: "#f59e0b", flexShrink: 0 }}
            />
          )}
          <Typography
            variant="caption"
            sx={{ fontWeight: 600, lineHeight: 1.4, wordBreak: "break-all" }}
          >
            {node.name}
          </Typography>
          {node.children && (
            <Typography
              variant="caption"
              sx={{ color: "text.disabled", ml: "auto", flexShrink: 0 }}
            >
              {node.children.length}
            </Typography>
          )}
        </Box>
        {isOpenEffective &&
          node.children?.map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              selectedPath={selectedPath}
              filter={filter}
              onSelect={onSelect}
            />
          ))}
      </>
    );
  }

  // File node
  const isJson = node.name.endsWith(".json");
  const FileIcon = isJson ? DataObjectIcon : DescriptionOutlinedIcon;
  const iconColor = isJson ? "#8b5cf6" : "#3b82f6";

  return (
    <Box
      onClick={() => onSelect(node)}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.75,
        px: 1,
        py: 0.4,
        pl: `${8 + indent}px`,
        cursor: "pointer",
        borderRadius: 1,
        background: isSelected
          ? isDark
            ? "rgba(59,130,246,0.15)"
            : "rgba(59,130,246,0.1)"
          : undefined,
        borderLeft: isSelected ? "2px solid #3b82f6" : "2px solid transparent",
        "&:hover": {
          background: isSelected
            ? undefined
            : isDark
              ? "rgba(255,255,255,0.05)"
              : "rgba(0,0,0,0.04)",
        },
      }}
    >
      <FileIcon sx={{ fontSize: 14, color: iconColor, flexShrink: 0 }} />
      <Typography
        variant="caption"
        sx={{
          flex: 1,
          lineHeight: 1.4,
          wordBreak: "break-all",
          fontWeight: isSelected ? 600 : 400,
          color: isSelected ? "primary.main" : "text.primary",
        }}
      >
        {node.name}
      </Typography>
      {node.size_bytes > 0 && (
        <Typography
          variant="caption"
          sx={{ color: "text.disabled", flexShrink: 0, fontSize: "0.6rem" }}
        >
          {formatBytes(node.size_bytes)}
        </Typography>
      )}
    </Box>
  );
}

// ── Markdown renderer ──────────────────────────────────────────────────────────
// Simple renderer — converts the key markdown constructs to styled elements
// without pulling in a heavy library. Handles: headings, bold, italic,
// bullet lists, numbered lists, code blocks, horizontal rules, and tables.

function renderMarkdown(text: string, isDark: boolean): React.ReactNode[] {
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];
  let i = 0;

  const codeBlockBg = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)";
  const tableBorder = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    if (line.startsWith("```")) {
      // const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      nodes.push(
        <Box
          key={i}
          component="pre"
          sx={{
            background: codeBlockBg,
            borderRadius: 1.5,
            p: 1.5,
            my: 1,
            overflowX: "auto",
            fontSize: "0.72rem",
            fontFamily: "monospace",
            lineHeight: 1.6,
            whiteSpace: "pre",
          }}
        >
          {codeLines.join("\n")}
        </Box>,
      );
      i++;
      continue;
    }

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      nodes.push(<Divider key={i} sx={{ my: 1.5 }} />);
      i++;
      continue;
    }

    // Headings
    const h3 = line.match(/^### (.+)/);
    const h2 = line.match(/^## (.+)/);
    const h1 = line.match(/^# (.+)/);
    if (h1) {
      nodes.push(
        <Typography
          key={i}
          variant="h5"
          sx={{ fontWeight: 800, mt: 2, mb: 0.75, lineHeight: 1.3 }}
        >
          {inlineFormat(h1[1])}
        </Typography>,
      );
      i++;
      continue;
    }
    if (h2) {
      nodes.push(
        <Typography
          key={i}
          variant="h6"
          sx={{ fontWeight: 700, mt: 1.75, mb: 0.5, lineHeight: 1.3 }}
        >
          {inlineFormat(h2[1])}
        </Typography>,
      );
      i++;
      continue;
    }
    if (h3) {
      nodes.push(
        <Typography
          key={i}
          variant="subtitle2"
          sx={{
            fontWeight: 700,
            mt: 1.25,
            mb: 0.25,
            color: "text.secondary",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            fontSize: "0.7rem",
          }}
        >
          {inlineFormat(h3[1])}
        </Typography>,
      );
      i++;
      continue;
    }

    // Table detection (line contains |)
    if (line.includes("|") && lines[i + 1]?.match(/^\|[-| :]+\|/)) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].includes("|")) {
        tableLines.push(lines[i]);
        i++;
      }
      nodes.push(
        <TableBlock key={i} lines={tableLines} border={tableBorder} />,
      );
      continue;
    }

    // Bullet list
    if (/^[-*] /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*] /.test(lines[i])) {
        items.push(lines[i].slice(2));
        i++;
      }
      nodes.push(
        <Box key={i} component="ul" sx={{ pl: 2.5, my: 0.5 }}>
          {items.map((item, j) => (
            <Typography
              key={j}
              component="li"
              variant="body2"
              sx={{ mb: 0.25, lineHeight: 1.6 }}
            >
              {inlineFormat(item)}
            </Typography>
          ))}
        </Box>,
      );
      continue;
    }

    // Numbered list
    if (/^\d+\. /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\. /, ""));
        i++;
      }
      nodes.push(
        <Box key={i} component="ol" sx={{ pl: 2.5, my: 0.5 }}>
          {items.map((item, j) => (
            <Typography
              key={j}
              component="li"
              variant="body2"
              sx={{ mb: 0.25, lineHeight: 1.6 }}
            >
              {inlineFormat(item)}
            </Typography>
          ))}
        </Box>,
      );
      continue;
    }

    // Blank line
    if (!line.trim()) {
      nodes.push(<Box key={i} sx={{ height: "0.5em" }} />);
      i++;
      continue;
    }

    // Paragraph
    nodes.push(
      <Typography key={i} variant="body2" sx={{ lineHeight: 1.7, mb: 0.25 }}>
        {inlineFormat(line)}
      </Typography>,
    );
    i++;
  }

  return nodes;
}

function TableBlock({ lines, border }: { lines: string[]; border: string }) {
  const rows = lines
    .filter((l) => !l.match(/^\|[-| :]+\|/))
    .map((l) =>
      l
        .split("|")
        .filter((_, i, a) => i > 0 && i < a.length - 1)
        .map((c) => c.trim()),
    );

  if (rows.length === 0) return null;
  const [header, ...body] = rows;

  return (
    <Box sx={{ overflowX: "auto", my: 1.5 }}>
      <Box
        component="table"
        sx={{ borderCollapse: "collapse", width: "100%", fontSize: "0.75rem" }}
      >
        <Box component="thead">
          <Box component="tr">
            {header.map((cell, i) => (
              <Box
                key={i}
                component="th"
                sx={{
                  border: `1px solid ${border}`,
                  px: 1.5,
                  py: 0.75,
                  textAlign: "left",
                  fontWeight: 700,
                  background: `${border}`,
                }}
              >
                {cell}
              </Box>
            ))}
          </Box>
        </Box>
        <Box component="tbody">
          {body.map((row, ri) => (
            <Box
              key={ri}
              component="tr"
              sx={{ "&:hover": { background: border } }}
            >
              {row.map((cell, ci) => (
                <Box
                  key={ci}
                  component="td"
                  sx={{ border: `1px solid ${border}`, px: 1.5, py: 0.6 }}
                >
                  {inlineFormat(cell)}
                </Box>
              ))}
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}

// Inline formatting: **bold**, *italic*, `code`
function inlineFormat(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**"))
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("*") && part.endsWith("*"))
      return <em key={i}>{part.slice(1, -1)}</em>;
    if (part.startsWith("`") && part.endsWith("`"))
      return (
        <Box
          key={i}
          component="code"
          sx={{
            fontSize: "0.78em",
            px: 0.5,
            py: 0.1,
            borderRadius: 0.5,
            background: "rgba(128,128,128,0.15)",
            fontFamily: "monospace",
          }}
        >
          {part.slice(1, -1)}
        </Box>
      );
    return part;
  });
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function KBBrowser() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const [tree, setTree] = useState<KBFile[]>([]);
  const [treeLoading, setTreeLoading] = useState(false);
  const [treeError, setTreeError] = useState<string | null>(null);

  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<KBFileContent | null>(null);
  const [fileLoading, setFileLoading] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const [filter, setFilter] = useState("");

  const loadTree = useCallback(async () => {
    setTreeLoading(true);
    setTreeError(null);
    try {
      const data = await invoke<KBFile[]>("kb_tree");
      setTree(data);
    } catch (e) {
      console.log(`Error: ${e}`);
      setTreeError(e instanceof Error ? e.message : "Failed to load tree");
    } finally {
      setTreeLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTree();
  }, [loadTree]);

  const handleSelect = async (node: KBFile) => {
    if (node.is_dir) return;
    setSelectedPath(node.path);
    setFileContent(null);
    setFileError(null);
    setFileLoading(true);
    try {
      const data = await invoke<KBFileContent>("kb_file", { path: node.path });
      setFileContent(data);
    } catch (e) {
      setFileError(e instanceof Error ? e.message : "Failed to load file");
    } finally {
      setFileLoading(false);
    }
  };

  const isJson = fileContent?.path.endsWith(".json");
  const bg = isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.015)";
  const border = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";

  return (
    <VBox sx={{ p: 2, gap: 2 }}>
      <TitleBox>
        <Box>
          <Typography variant="h1">Knowledge Base</Typography>
          <Typography variant="caption" color="text.secondary">
            AI Knowledge Base File Browser
          </Typography>
        </Box>
      </TitleBox>
      <Box
        sx={{
          display: "flex",
          gap: 1.5,
          height: "85vh",
          minHeight: 400,
        }}
      >
        {/* ── Left: file tree ── */}
        <Paper
          variant="outlined"
          sx={{
            width: 260,
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            borderRadius: 2,
            overflow: "hidden",
            background: bg,
            borderColor: border,
          }}
        >
          {/* Tree header */}
          <Box
            sx={{
              px: 1.5,
              py: 1,
              display: "flex",
              alignItems: "center",
              gap: 0.5,
              borderBottom: `1px solid ${border}`,
            }}
          >
            <Typography
              variant="caption"
              sx={{
                fontWeight: 700,
                flex: 1,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "text.secondary",
              }}
            >
              Knowledge Base
            </Typography>
            <Tooltip title="Refresh tree">
              <IconButton
                size="small"
                onClick={loadTree}
                disabled={treeLoading}
              >
                {treeLoading ? (
                  <CircularProgress size={14} />
                ) : (
                  <RefreshIcon sx={{ fontSize: 16 }} />
                )}
              </IconButton>
            </Tooltip>
          </Box>

          {/* Search */}
          <Box sx={{ px: 1, pt: 0.75, pb: 0.5 }}>
            <TextField
              size="small"
              fullWidth
              placeholder="Filter files…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon
                      sx={{ fontSize: 15, color: "text.secondary" }}
                    />
                  </InputAdornment>
                ),
                endAdornment: filter ? (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={() => setFilter("")}
                      edge="end"
                    >
                      <ClearIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </InputAdornment>
                ) : null,
                sx: { fontSize: "0.75rem" },
              }}
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: 1.5 } }}
            />
          </Box>

          {/* Tree */}
          <Box sx={{ flex: 1, overflow: "auto", py: 0.5 }}>
            {treeError ? (
              <Typography
                variant="caption"
                color="error"
                sx={{ px: 1.5, display: "block" }}
              >
                {treeError}
              </Typography>
            ) : tree.length === 0 && !treeLoading ? (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ px: 1.5, display: "block" }}
              >
                Knowledge base is empty. Run the pipeline first.
              </Typography>
            ) : (
              tree.map((node) => (
                <TreeNode
                  key={node.path}
                  node={node}
                  depth={0}
                  selectedPath={selectedPath}
                  filter={filter}
                  onSelect={handleSelect}
                />
              ))
            )}
          </Box>
        </Paper>

        {/* ── Right: file viewer ── */}
        <Paper
          variant="outlined"
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            borderRadius: 2,
            overflow: "hidden",
            background: bg,
            borderColor: border,
            minWidth: 0,
          }}
        >
          {!selectedPath ? (
            <Box
              sx={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "column",
                gap: 1,
                color: "text.disabled",
              }}
            >
              <DescriptionOutlinedIcon sx={{ fontSize: 40, opacity: 0.3 }} />
              <Typography variant="body2" color="text.disabled">
                Select a file to read
              </Typography>
            </Box>
          ) : (
            <>
              {/* File header */}
              <Box
                sx={{
                  px: 2,
                  py: 1,
                  borderBottom: `1px solid ${border}`,
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  flexWrap: "wrap",
                }}
              >
                {isJson ? (
                  <DataObjectIcon sx={{ fontSize: 16, color: "#8b5cf6" }} />
                ) : (
                  <DescriptionOutlinedIcon
                    sx={{ fontSize: 16, color: "#3b82f6" }}
                  />
                )}
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 700,
                    fontFamily: "monospace",
                    flex: 1,
                    wordBreak: "break-all",
                  }}
                >
                  {selectedPath}
                </Typography>
                {fileContent && (
                  <>
                    <Typography variant="caption" color="text.secondary">
                      {formatBytes(fileContent.size_bytes)}
                    </Typography>
                    <Box
                      sx={{ display: "flex", alignItems: "center", gap: 0.4 }}
                    >
                      <AccessTimeIcon
                        sx={{ fontSize: 12, color: "text.secondary" }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(fileContent.last_modified)}
                      </Typography>
                    </Box>
                  </>
                )}
              </Box>

              {/* Content */}
              <Box sx={{ flex: 1, overflow: "auto", p: 2.5 }}>
                {fileLoading && (
                  <Box
                    sx={{ display: "flex", justifyContent: "center", pt: 4 }}
                  >
                    <CircularProgress size={24} />
                  </Box>
                )}
                {fileError && (
                  <Typography variant="body2" color="error">
                    {fileError}
                  </Typography>
                )}
                {fileContent &&
                  !fileLoading &&
                  (isJson ? (
                    <Box
                      component="pre"
                      sx={{
                        fontSize: "0.72rem",
                        fontFamily: "monospace",
                        lineHeight: 1.7,
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        m: 0,
                      }}
                    >
                      {(() => {
                        try {
                          return JSON.stringify(
                            JSON.parse(fileContent.content),
                            null,
                            2,
                          );
                        } catch {
                          return fileContent.content;
                        }
                      })()}
                    </Box>
                  ) : (
                    <Box sx={{ maxWidth: 860 }}>
                      {renderMarkdown(fileContent.content, isDark)}
                    </Box>
                  ))}
              </Box>
            </>
          )}
        </Paper>
      </Box>
    </VBox>
  );
}
