import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { Loader2 } from 'lucide-react';

export const TooltipProvider = TooltipPrimitive.Provider;
export const TooltipRoot = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

export const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className = '', sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={`z-50 overflow-hidden rounded-lg bg-[#1e1f24] px-3 py-2.5 text-sm text-gray-300 shadow-xl border border-[#34373c] animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 ${className}`}
      {...props}
    />
  </TooltipPrimitive.Portal>
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export interface TooltipRowProps {
  label: string;
  value: React.ReactNode;
  valueClassName?: string;
  labelClassName?: string;
}

export interface AppTooltipProps {
  key?: React.Key;
  children: React.ReactNode;
  description?: React.ReactNode;
  rows?: TooltipRowProps[];
  isLoading?: boolean;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
}

export function AppTooltip({ children, description, rows, isLoading, side = 'top', align = 'center' }: AppTooltipProps) {
  return (
    <TooltipRoot delayDuration={200}>
      <TooltipTrigger asChild>
        {children}
      </TooltipTrigger>
      <TooltipContent side={side} align={align}>
        {isLoading ? (
          <div className="flex items-center justify-center p-2 min-w-[120px]">
            <Loader2 className="w-5 h-5 animate-spin text-[#8E9299]" />
          </div>
        ) : (
          <div className="flex flex-col min-w-[200px] max-w-[320px]">
            {description && (
              <>
                <div className="text-[13px] leading-relaxed text-[#c9cbcf] whitespace-normal">
                  {description}
                </div>
                {rows && rows.length > 0 && (
                  <div className="my-2.5 border-b border-dashed border-[#43464d]" />
                )}
              </>
            )}
            {rows && rows.length > 0 && (
              <div className="flex flex-col gap-2">
                {rows.map((row, i) => (
                  <div key={i} className="flex items-center justify-between gap-6">
                    <span className={row.labelClassName || 'text-[13px] font-medium text-[#c9cbcf]'}>{row.label}</span>
                    <span className={row.valueClassName || 'text-[13px] font-mono text-white'}>  {row.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        <TooltipPrimitive.Arrow className="fill-[#34373c]" />
      </TooltipContent>
    </TooltipRoot>
  );
}
