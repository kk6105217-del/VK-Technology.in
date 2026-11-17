import { AuditLog } from '../models/AuditLog.js';
import { isMongoConnected } from '../config/database.js';

export interface AuditLogParams {
  adminEmail: string;
  adminId?: number;
  userId?: number;
  action: string;
  resourceType: 'Product' | 'Order' | 'User' | 'Inventory' | 'Payment' | 'Category' | 'Coupon' | 'System' | 'Security';
  resourceId?: string | number;
  ipAddress?: string;
  userAgent?: string;
  result?: 'success' | 'failure';
  failureReason?: string;
  changeSummary?: {
    before?: Record<string, any>;
    after?: Record<string, any>;
    details?: string;
  };
}

// Sensitive keys to redact from audit logs
const SENSITIVE_KEYS = ['password', 'password_hash', 'token', 'secret', 'cvv', 'upi_pin', 'card_number', 'mfa_secret'];

function redactSensitiveData(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(redactSensitiveData);

  const clean: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.some((s) => k.toLowerCase().includes(s))) {
      clean[k] = '[REDACTED]';
    } else if (typeof v === 'object') {
      clean[k] = redactSensitiveData(v);
    } else {
      clean[k] = v;
    }
  }
  return clean;
}

export class AuditService {
  static async log(params: AuditLogParams): Promise<void> {
    try {
      const sanitizedSummary = params.changeSummary
        ? {
            before: redactSensitiveData(params.changeSummary.before),
            after: redactSensitiveData(params.changeSummary.after),
            details: params.changeSummary.details,
          }
        : undefined;

      if (isMongoConnected()) {
        await AuditLog.create({
          admin_email: params.adminEmail.toLowerCase(),
          admin_id: params.adminId,
          user_id: params.userId,
          action: params.action.toUpperCase(),
          resource_type: params.resourceType,
          resource_id: params.resourceId ? String(params.resourceId) : undefined,
          ip_address: params.ipAddress,
          user_agent: params.userAgent,
          result: params.result || 'success',
          failure_reason: params.failureReason,
          change_summary: sanitizedSummary,
          timestamp: new Date(),
        });
      } else {
        // Fallback console log for dev visibility
        console.log(`[AUDIT] ${params.action} on ${params.resourceType} by ${params.adminEmail}: ${params.result || 'success'}`);
      }
    } catch (err: any) {
      console.warn('[AuditService] Failed to persist audit log:', err.message);
    }
  }
}
