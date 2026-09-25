
import { Badge, type BadgeProps } from './Badge';

const statusConfig: Record<string, BadgeProps['variant']> = {
  // Warning (yellow)
  PENDING_APPROVAL: 'warning',
  SUBMITTED: 'warning',
  UNDER_REVIEW: 'warning',

  // Info (blue)
  APPROVED: 'info',
  SUBMITTED_TO_SUPPLIER: 'info',
  SUPPLIER_PENDING: 'info',

  // Success (green)
  CONFIRMED: 'success',
  VERIFIED: 'success',
  PAID: 'success',
  COMPLETED: 'success',
  ACTIVE: 'success',

  // Danger (red)
  REJECTED: 'destructive',
  SUPPLIER_FAILED: 'destructive',
  FAILED: 'destructive',

  // Muted (gray)
  CANCELLED: 'secondary',
  EXPIRED: 'secondary',
  SUSPENDED: 'secondary',
  DRAFT: 'secondary',
};

export interface StatusBadgeProps extends Omit<BadgeProps, 'variant'> {
  status: string;
}

export function StatusBadge({ status, className, ...props }: StatusBadgeProps) {
  const variant = statusConfig[status] || 'default';

  // Format the status string (e.g. PENDING_APPROVAL -> Pending Approval)
  const formattedStatus = status
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

  return (
    <Badge variant={variant} className={className} {...props}>
      {formattedStatus}
    </Badge>
  );
}
