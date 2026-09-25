import * as React from 'react';
import { cn } from './Button';

export interface TimelineEvent {
  id: string;
  title: string;
  description?: React.ReactNode;
  time: string;
  icon?: React.ReactNode;
  isActive?: boolean;
}

export interface TimelineProps extends React.HTMLAttributes<HTMLDivElement> {
  events: TimelineEvent[];
}

export function Timeline({ events, className, ...props }: TimelineProps) {
  return (
    <div className={cn('flow-root', className)} {...props}>
      <ul role="list" className="-mb-8">
        {events.map((event, eventIdx) => (
          <li key={event.id}>
            <div className="relative pb-8">
              {eventIdx !== events.length - 1 ? (
                <span
                  className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-border"
                  aria-hidden="true"
                />
              ) : null}
              <div className="relative flex space-x-3">
                <div>
                  <span
                    className={cn(
                      'h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-background',
                      event.isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {event.icon ? (
                      event.icon
                    ) : (
                      <div className="h-2.5 w-2.5 rounded-full bg-current" />
                    )}
                  </span>
                </div>
                <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                  <div>
                    <p className="text-sm font-medium text-foreground">{event.title}</p>
                    {event.description && (
                      <div className="mt-1 text-sm text-muted-foreground">{event.description}</div>
                    )}
                  </div>
                  <div className="whitespace-nowrap text-right text-sm text-muted-foreground">
                    <time dateTime={event.time}>{event.time}</time>
                  </div>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
