import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { Button, EmptyState } from '@gnk/ui';

export function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <EmptyState
        icon={<Compass />}
        title="Page not found"
        description="The page you're looking for doesn't exist or has moved."
        action={
          <Button asChild>
            <Link to="/">Back to dashboard</Link>
          </Button>
        }
      />
    </div>
  );
}
