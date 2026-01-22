import fs from 'fs';
import path from 'path';

export type AuditAction = 
  | 'USER_CREATED'
  | 'USER_UPDATED'
  | 'USER_DELETED'
  | 'USER_APPROVED'
  | 'USER_REJECTED'
  | 'USER_STATUS_CHANGED'
  | 'USER_ROLE_CHANGED'
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'LOGOUT';

export interface AuditLogEntry {
  timestamp: string;
  action: AuditAction;
  performedBy: {
    userId: string;
    email: string;
    roles: string[];
  };
  targetUser?: {
    userId?: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
  details: Record<string, unknown>;
  ipAddress?: string;
}

const LOG_DIR = path.join(process.cwd(), 'logs');
const LOG_FILE = path.join(LOG_DIR, 'audit.log');

/**
 * Ensures the logs directory exists
 */
function ensureLogDirectory(): void {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

/**
 * Formats an audit log entry as a JSON line
 */
function formatLogEntry(entry: AuditLogEntry): string {
  return JSON.stringify(entry) + '\n';
}

/**
 * Writes an audit log entry to the log file
 */
export async function writeAuditLog(entry: Omit<AuditLogEntry, 'timestamp'>): Promise<void> {
  try {
    ensureLogDirectory();

    const fullEntry: AuditLogEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
    };

    const logLine = formatLogEntry(fullEntry);
    
    // Append to log file
    fs.appendFileSync(LOG_FILE, logLine, 'utf8');
    
    // Also log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[AUDIT]', JSON.stringify(fullEntry, null, 2));
    }
  } catch (error) {
    console.error('Failed to write audit log:', error);
    // Don't throw - audit logging should not break the main operation
  }
}

/**
 * Helper to create a user creation audit log
 */
export async function logUserCreated(
  performedBy: AuditLogEntry['performedBy'],
  newUser: { email: string; firstName: string; lastName: string; role: string; status: string },
  ipAddress?: string
): Promise<void> {
  await writeAuditLog({
    action: 'USER_CREATED',
    performedBy,
    targetUser: {
      email: newUser.email,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
    },
    details: {
      assignedRole: newUser.role,
      initialStatus: newUser.status,
    },
    ipAddress,
  });
}

/**
 * Helper to create a user update audit log
 */
export async function logUserUpdated(
  performedBy: AuditLogEntry['performedBy'],
  targetUser: { userId: string; email: string },
  changes: Record<string, { from: unknown; to: unknown }>,
  ipAddress?: string
): Promise<void> {
  await writeAuditLog({
    action: 'USER_UPDATED',
    performedBy,
    targetUser,
    details: { changes },
    ipAddress,
  });
}

/**
 * Helper to create a user status change audit log
 */
export async function logUserStatusChanged(
  performedBy: AuditLogEntry['performedBy'],
  targetUser: { userId: string; email: string },
  fromStatus: string,
  toStatus: string,
  reason?: string,
  ipAddress?: string
): Promise<void> {
  await writeAuditLog({
    action: 'USER_STATUS_CHANGED',
    performedBy,
    targetUser,
    details: {
      fromStatus,
      toStatus,
      reason,
    },
    ipAddress,
  });
}

/**
 * Helper to create a user approval audit log
 */
export async function logUserApproved(
  performedBy: AuditLogEntry['performedBy'],
  targetUser: { userId: string; email: string; firstName?: string; lastName?: string },
  assignedRole?: string,
  ipAddress?: string
): Promise<void> {
  await writeAuditLog({
    action: 'USER_APPROVED',
    performedBy,
    targetUser,
    details: {
      previousStatus: 'pending',
      newStatus: 'active',
      assignedRole,
    },
    ipAddress,
  });
}

/**
 * Helper to create a user rejection audit log
 */
export async function logUserRejected(
  performedBy: AuditLogEntry['performedBy'],
  targetUser: { userId: string; email: string; firstName?: string; lastName?: string },
  rejectionReason: string,
  ipAddress?: string
): Promise<void> {
  await writeAuditLog({
    action: 'USER_REJECTED',
    performedBy,
    targetUser,
    details: {
      rejectionReason,
      userDeleted: true,
    },
    ipAddress,
  });
}
