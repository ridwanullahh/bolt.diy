// Export all UI components for easier imports

// Core components
export * from './Badge';
export * from './Button';
export * from './Card';
export * from './Checkbox';
export * from './Collapsible';
export {
  Dialog,
  DialogRoot,
  DialogClose,
  DialogTitle,
  DialogDescription,
  DialogButton,
  ConfirmationDialog,
  SelectionDialog,
} from './Dialog';
export type { ConfirmationDialogProps, SelectionDialogProps } from './Dialog';
export * from './IconButton';
export * from './Input';
export * from './Label';
export * from './ScrollArea';
export * from './Switch';
export * from './Tabs';
export * from './ThemeSwitch';

// Loading components
export * from './LoadingDots';
export * from './LoadingOverlay';

// New components
export * from './Breadcrumbs';
export * from './CloseButton';
export * from './CodeBlock';
export * from './EmptyState';
export * from './FileIcon';
export * from './FilterChip';
export * from './GradientCard';
export * from './RepositoryStats';
export * from './SearchInput';
export * from './SearchResultItem';
export * from './StatusIndicator';
export * from './TabsWithSlider';

// Tooltip components
export { default as WithTooltip } from './Tooltip';
export { Tooltip } from './Tooltip';
