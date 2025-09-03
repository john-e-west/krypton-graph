import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Button,
  ButtonGroup,
  Divider,
  Chip,
  Box,
  Menu,
  MenuItem,
  Tooltip,
  Badge,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Input,
} from '@mui/material';
import {
  Save,
  Undo,
  Redo,
  ZoomIn,
  ZoomOut,
  Fullscreen,
  FullscreenExit,
  Download,
  Upload,
  Share,
  Settings,
  ViewList,
  GridView,
  Tune,
  AutoFixHigh,
  History,
  CloudSync,
  CheckCircle,
  Error,
  Warning,
} from '@mui/icons-material';

interface EditorToolbarProps {
  ontologyName: string;
  onSave: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onExport: () => void;
  onImport: () => void;
  onToggleProperties: () => void;
  saveStatus?: 'saved' | 'saving' | 'error' | 'unsaved';
  lastSaved?: Date;
  validationErrors?: number;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

const EditorToolbar: React.FC<EditorToolbarProps> = ({
  ontologyName,
  onSave,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onExport,
  onImport,
  onToggleProperties,
  saveStatus = 'saved',
  lastSaved,
  validationErrors = 0,
  isFullscreen = false,
  onToggleFullscreen,
}) => {
  const [viewMenuAnchor, setViewMenuAnchor] = useState<null | HTMLElement>(null);
  const [exportMenuAnchor, setExportMenuAnchor] = useState<null | HTMLElement>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [layoutMenuAnchor, setLayoutMenuAnchor] = useState<null | HTMLElement>(null);

  const getSaveStatusIcon = () => {
    switch (saveStatus) {
      case 'saved':
        return <CheckCircle color="success" fontSize="small" />;
      case 'saving':
        return <CloudSync color="primary" fontSize="small" />;
      case 'error':
        return <Error color="error" fontSize="small" />;
      case 'unsaved':
        return <Warning color="warning" fontSize="small" />;
      default:
        return <CheckCircle color="success" fontSize="small" />;
    }
  };

  const getSaveStatusText = () => {
    switch (saveStatus) {
      case 'saved':
        return lastSaved ? `Saved ${lastSaved.toLocaleTimeString()}` : 'Saved';
      case 'saving':
        return 'Saving...';
      case 'error':
        return 'Save failed';
      case 'unsaved':
        return 'Unsaved changes';
      default:
        return 'Saved';
    }
  };

  const handleExportMenuClose = (format?: string) => {
    setExportMenuAnchor(null);
    if (format) {
      console.log('Export as:', format);
      onExport();
    }
  };

  const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      console.log('Import file:', file.name);
      onImport();
      setImportDialogOpen(false);
    }
  };

  const handleLayoutChange = (layout: string) => {
    setLayoutMenuAnchor(null);
    console.log('Change layout to:', layout);
  };

  return (
    <>
      <AppBar 
        position="static" 
        color="default" 
        elevation={1}
        sx={{ borderBottom: '1px solid', borderColor: 'divider' }}
      >
        <Toolbar variant="dense">
          {/* Ontology Name */}
          <Typography variant="h6" component="div" sx={{ mr: 2 }}>
            {ontologyName}
          </Typography>

          {/* Save Status */}
          <Tooltip title={getSaveStatusText()}>
            <Box display="flex" alignItems="center" mr={2}>
              {getSaveStatusIcon()}
              <Typography variant="body2" sx={{ ml: 0.5, fontSize: '0.75rem' }}>
                {getSaveStatusText()}
              </Typography>
            </Box>
          </Tooltip>

          <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />

          {/* Save Button */}
          <Button
            variant="contained"
            size="small"
            startIcon={<Save />}
            onClick={onSave}
            disabled={saveStatus === 'saving'}
            sx={{ mr: 1 }}
          >
            Save
          </Button>

          {/* Undo/Redo */}
          <ButtonGroup size="small" sx={{ mr: 2 }}>
            <Tooltip title="Undo (Ctrl+Z)">
              <span>
                <IconButton
                  onClick={onUndo}
                  disabled={!canUndo}
                  size="small"
                >
                  <Undo />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Redo (Ctrl+Y)">
              <span>
                <IconButton
                  onClick={onRedo}
                  disabled={!canRedo}
                  size="small"
                >
                  <Redo />
                </IconButton>
              </span>
            </Tooltip>
          </ButtonGroup>

          <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />

          {/* Layout Controls */}
          <Tooltip title="Auto Layout">
            <IconButton
              size="small"
              onClick={(e) => setLayoutMenuAnchor(e.currentTarget)}
            >
              <AutoFixHigh />
            </IconButton>
          </Tooltip>

          <Tooltip title="Zoom In">
            <IconButton size="small">
              <ZoomIn />
            </IconButton>
          </Tooltip>

          <Tooltip title="Zoom Out">
            <IconButton size="small">
              <ZoomOut />
            </IconButton>
          </Tooltip>

          <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />

          {/* View Controls */}
          <Tooltip title="View Options">
            <IconButton
              size="small"
              onClick={(e) => setViewMenuAnchor(e.currentTarget)}
            >
              <ViewList />
            </IconButton>
          </Tooltip>

          <Tooltip title="Toggle Properties Panel">
            <IconButton size="small" onClick={onToggleProperties}>
              <Settings />
            </IconButton>
          </Tooltip>

          {/* Validation Status */}
          {validationErrors > 0 && (
            <Tooltip title={`${validationErrors} validation errors`}>
              <Badge badgeContent={validationErrors} color="error">
                <Chip
                  label="Errors"
                  size="small"
                  color="error"
                  variant="outlined"
                  sx={{ ml: 1 }}
                />
              </Badge>
            </Tooltip>
          )}

          {/* Spacer */}
          <Box sx={{ flexGrow: 1 }} />

          {/* Import/Export */}
          <ButtonGroup size="small" sx={{ mr: 1 }}>
            <Tooltip title="Import">
              <Button
                startIcon={<Upload />}
                onClick={() => setImportDialogOpen(true)}
              >
                Import
              </Button>
            </Tooltip>
            <Tooltip title="Export">
              <Button
                startIcon={<Download />}
                onClick={(e) => setExportMenuAnchor(e.currentTarget)}
              >
                Export
              </Button>
            </Tooltip>
          </ButtonGroup>

          {/* Share */}
          <Tooltip title="Share">
            <IconButton size="small">
              <Share />
            </IconButton>
          </Tooltip>

          {/* Fullscreen */}
          {onToggleFullscreen && (
            <Tooltip title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}>
              <IconButton size="small" onClick={onToggleFullscreen}>
                {isFullscreen ? <FullscreenExit /> : <Fullscreen />}
              </IconButton>
            </Tooltip>
          )}
        </Toolbar>
      </AppBar>

      {/* Export Menu */}
      <Menu
        anchorEl={exportMenuAnchor}
        open={Boolean(exportMenuAnchor)}
        onClose={() => handleExportMenuClose()}
      >
        <MenuItem onClick={() => handleExportMenuClose('json')}>
          <Download sx={{ mr: 1 }} />
          Export as JSON
        </MenuItem>
        <MenuItem onClick={() => handleExportMenuClose('yaml')}>
          <Download sx={{ mr: 1 }} />
          Export as YAML
        </MenuItem>
        <MenuItem onClick={() => handleExportMenuClose('png')}>
          <Download sx={{ mr: 1 }} />
          Export as Image (PNG)
        </MenuItem>
        <MenuItem onClick={() => handleExportMenuClose('svg')}>
          <Download sx={{ mr: 1 }} />
          Export as SVG
        </MenuItem>
      </Menu>

      {/* View Menu */}
      <Menu
        anchorEl={viewMenuAnchor}
        open={Boolean(viewMenuAnchor)}
        onClose={() => setViewMenuAnchor(null)}
      >
        <MenuItem>
          <GridView sx={{ mr: 1 }} />
          Grid View
        </MenuItem>
        <MenuItem>
          <ViewList sx={{ mr: 1 }} />
          List View
        </MenuItem>
        <Divider />
        <MenuItem>
          <Tune sx={{ mr: 1 }} />
          Filter Options
        </MenuItem>
        <MenuItem>
          <History sx={{ mr: 1 }} />
          Version History
        </MenuItem>
      </Menu>

      {/* Layout Menu */}
      <Menu
        anchorEl={layoutMenuAnchor}
        open={Boolean(layoutMenuAnchor)}
        onClose={() => setLayoutMenuAnchor(null)}
      >
        <MenuItem onClick={() => handleLayoutChange('hierarchical')}>
          Hierarchical Layout
        </MenuItem>
        <MenuItem onClick={() => handleLayoutChange('force-directed')}>
          Force-Directed Layout
        </MenuItem>
        <MenuItem onClick={() => handleLayoutChange('circular')}>
          Circular Layout
        </MenuItem>
        <MenuItem onClick={() => handleLayoutChange('grid')}>
          Grid Layout
        </MenuItem>
      </Menu>

      {/* Import Dialog */}
      <Dialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Import Ontology</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" paragraph>
            Select a JSON or YAML file to import ontology data. This will merge
            with your current ontology.
          </Typography>
          <Input
            type="file"
            inputProps={{ accept: '.json,.yaml,.yml' }}
            onChange={handleImportFile}
            fullWidth
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportDialogOpen(false)}>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default EditorToolbar;