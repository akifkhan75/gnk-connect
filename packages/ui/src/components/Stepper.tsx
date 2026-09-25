import * as React from 'react';
import { cn } from './Button';
import { Check } from 'lucide-react';

export interface Step {
  title: string;
  description?: string;
  status?: 'complete' | 'current' | 'upcoming';
}

export interface StepperProps extends React.HTMLAttributes<HTMLDivElement> {
  steps: Step[];
  currentStep: number;
}

export function Stepper({ steps, currentStep, className, ...props }: StepperProps) {
  return (
    <div className={cn('w-full', className)} {...props}>
      <nav aria-label="Progress">
        <ol role="list" className="space-y-4 md:flex md:space-x-8 md:space-y-0">
          {steps.map((step, index) => {
            const isComplete = index < currentStep;
            const isCurrent = index === currentStep;

            return (
              <li key={step.title} className="md:flex-1">
                <div
                  className={cn(
                    'group flex flex-col border-l-4 py-2 pl-4 transition-colors md:border-l-0 md:border-t-4 md:pb-0 md:pl-0 md:pt-4',
                    isComplete ? 'border-primary' : isCurrent ? 'border-primary' : 'border-border',
                  )}
                >
                  <span className="text-sm font-medium text-primary flex items-center gap-2">
                    {isComplete ? (
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Check className="h-3 w-3" aria-hidden="true" />
                      </span>
                    ) : (
                      <span
                        className={cn(
                          'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs',
                          isCurrent
                            ? 'border-primary text-primary'
                            : 'border-border text-muted-foreground',
                        )}
                      >
                        {index + 1}
                      </span>
                    )}
                    <span className={cn(!isComplete && !isCurrent && 'text-muted-foreground')}>
                      {step.title}
                    </span>
                  </span>
                  {step.description && (
                    <span className="text-sm text-muted-foreground">{step.description}</span>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
}
