import { createTwoFilesPatch, applyPatch, parsePatch, type ParsedDiff } from 'diff';
import type { FileMap } from '~/lib/stores/files';
import { MODIFICATIONS_TAG_NAME, WORK_DIR } from './constants';

export const modificationsRegex = new RegExp(
  `^<${MODIFICATIONS_TAG_NAME}>[\\s\\S]*?<\\/${MODIFICATIONS_TAG_NAME}>\\s+`,
  'g',
);

interface ModifiedFile {
  type: 'diff' | 'file';
  content: string;
}

type FileModifications = Record<string, ModifiedFile>;

// Enhanced diff system interfaces
export interface DiffOperation {
  id: string;
  timestamp: number;
  filePath: string;
  operation: 'create' | 'modify' | 'delete';
  originalContent: string;
  newContent: string;
  diff: string;
  validated: boolean;
  applied: boolean;
}

export interface DiffValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  canApply: boolean;
}

export interface DiffRollbackPoint {
  id: string;
  timestamp: number;
  operations: DiffOperation[];
  description: string;
}

// Enhanced diff operations storage
const diffOperations: Map<string, DiffOperation[]> = new Map();
const rollbackPoints: Map<string, DiffRollbackPoint[]> = new Map();

export function computeFileModifications(files: FileMap, modifiedFiles: Map<string, string>) {
  const modifications: FileModifications = {};

  let hasModifiedFiles = false;

  for (const [filePath, originalContent] of modifiedFiles) {
    const file = files[filePath];

    if (file?.type !== 'file') {
      continue;
    }

    const unifiedDiff = diffFiles(filePath, originalContent, file.content);

    if (!unifiedDiff) {
      // files are identical
      continue;
    }

    hasModifiedFiles = true;

    if (unifiedDiff.length > file.content.length) {
      // if there are lots of changes we simply grab the current file content since it's smaller than the diff
      modifications[filePath] = { type: 'file', content: file.content };
    } else {
      // otherwise we use the diff since it's smaller
      modifications[filePath] = { type: 'diff', content: unifiedDiff };
    }
  }

  if (!hasModifiedFiles) {
    return undefined;
  }

  return modifications;
}

// Enhanced diff validation system
export function validateDiffOperation(operation: DiffOperation): DiffValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Parse the diff to validate structure
    const parsedDiff = parsePatch(operation.diff);

    if (!parsedDiff || parsedDiff.length === 0) {
      errors.push('Invalid diff format');
      return { isValid: false, errors, warnings, canApply: false };
    }

    // Validate file path
    if (!operation.filePath || operation.filePath.trim() === '') {
      errors.push('Invalid file path');
    }

    // Check for potential conflicts
    if (operation.operation === 'modify') {
      try {
        const testApply = applyPatch(operation.originalContent, operation.diff);
        if (!testApply) {
          errors.push('Diff cannot be applied to original content');
        } else if (testApply !== operation.newContent) {
          warnings.push('Applied diff does not match expected new content');
        }
      } catch (error) {
        errors.push(`Diff application test failed: ${error}`);
      }
    }

    // Production safety checks
    if (operation.filePath.includes('node_modules/')) {
      warnings.push('Modifying node_modules files is not recommended');
    }

    if (operation.filePath.endsWith('.lock') || operation.filePath.endsWith('.lockb')) {
      warnings.push('Modifying lock files can cause dependency issues');
    }

    const isValid = errors.length === 0;
    const canApply = isValid && (warnings.length === 0 || warnings.every(w => !w.includes('cannot be applied')));

    return { isValid, errors, warnings, canApply };
  } catch (error) {
    errors.push(`Validation error: ${error}`);
    return { isValid: false, errors, warnings, canApply: false };
  }
}

// Enhanced diff operation management
export function createDiffOperation(
  filePath: string,
  originalContent: string,
  newContent: string,
  operation: 'create' | 'modify' | 'delete' = 'modify'
): DiffOperation {
  const diff = diffFiles(filePath, originalContent, newContent) || '';

  return {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
    filePath,
    operation,
    originalContent,
    newContent,
    diff,
    validated: false,
    applied: false
  };
}

export function addDiffOperation(projectId: string, operation: DiffOperation): void {
  if (!diffOperations.has(projectId)) {
    diffOperations.set(projectId, []);
  }

  const operations = diffOperations.get(projectId)!;
  operations.push(operation);

  // Keep only last 100 operations per project
  if (operations.length > 100) {
    operations.splice(0, operations.length - 100);
  }
}

export function getDiffOperations(projectId: string): DiffOperation[] {
  return diffOperations.get(projectId) || [];
}

export function createRollbackPoint(projectId: string, description: string): DiffRollbackPoint {
  const operations = getDiffOperations(projectId);
  const rollbackPoint: DiffRollbackPoint = {
    id: `rollback-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
    operations: [...operations],
    description
  };

  if (!rollbackPoints.has(projectId)) {
    rollbackPoints.set(projectId, []);
  }

  const points = rollbackPoints.get(projectId)!;
  points.push(rollbackPoint);

  // Keep only last 20 rollback points per project
  if (points.length > 20) {
    points.splice(0, points.length - 20);
  }

  return rollbackPoint;
}

export function getRollbackPoints(projectId: string): DiffRollbackPoint[] {
  return rollbackPoints.get(projectId) || [];
}

export function applyDiffOperation(operation: DiffOperation): { success: boolean; error?: string; result?: string } {
  try {
    const validation = validateDiffOperation(operation);

    if (!validation.canApply) {
      return {
        success: false,
        error: `Cannot apply operation: ${validation.errors.join(', ')}`
      };
    }

    let result: string;

    switch (operation.operation) {
      case 'create':
        result = operation.newContent;
        break;
      case 'modify':
        const applied = applyPatch(operation.originalContent, operation.diff);
        if (!applied) {
          return {
            success: false,
            error: 'Failed to apply diff patch'
          };
        }
        result = applied;
        break;
      case 'delete':
        result = '';
        break;
      default:
        return {
          success: false,
          error: `Unknown operation type: ${operation.operation}`
        };
    }

    return {
      success: true,
      result
    };
  } catch (error) {
    return {
      success: false,
      error: `Error applying operation: ${error}`
    };
  }
}

/**
 * Computes a diff in the unified format. The only difference is that the header is omitted
 * because it will always assume that you're comparing two versions of the same file and
 * it allows us to avoid the extra characters we send back to the llm.
 *
 * @see https://www.gnu.org/software/diffutils/manual/html_node/Unified-Format.html
 */
export function diffFiles(fileName: string, oldFileContent: string, newFileContent: string) {
  let unifiedDiff = createTwoFilesPatch(fileName, fileName, oldFileContent, newFileContent);

  const patchHeaderEnd = `--- ${fileName}\n+++ ${fileName}\n`;
  const headerEndIndex = unifiedDiff.indexOf(patchHeaderEnd);

  if (headerEndIndex >= 0) {
    unifiedDiff = unifiedDiff.slice(headerEndIndex + patchHeaderEnd.length);
  }

  if (unifiedDiff === '') {
    return undefined;
  }

  return unifiedDiff;
}

const regex = new RegExp(`^${WORK_DIR}\/`);

/**
 * Strips out the work directory from the file path.
 */
export function extractRelativePath(filePath: string) {
  return filePath.replace(regex, '');
}

/**
 * Converts the unified diff to HTML.
 *
 * Example:
 *
 * ```html
 * <bolt_file_modifications>
 * <diff path="/home/project/index.js">
 * - console.log('Hello, World!');
 * + console.log('Hello, Bolt!');
 * </diff>
 * </bolt_file_modifications>
 * ```
 */
export function fileModificationsToHTML(modifications: FileModifications) {
  const entries = Object.entries(modifications);

  if (entries.length === 0) {
    return undefined;
  }

  const result: string[] = [`<${MODIFICATIONS_TAG_NAME}>`];

  for (const [filePath, { type, content }] of entries) {
    result.push(`<${type} path=${JSON.stringify(filePath)}>`, content, `</${type}>`);
  }

  result.push(`</${MODIFICATIONS_TAG_NAME}>`);

  return result.join('\n');
}
