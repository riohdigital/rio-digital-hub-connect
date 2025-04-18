import * as React from "react"

import { cn } from "@/lib/utils"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    // Auto-resize functionality
    const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
    
    const combinedRef = (node: HTMLTextAreaElement) => {
      textareaRef.current = node;
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    };

    const handleInput = React.useCallback(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      
      // Reset height to get the scroll height
      textarea.style.height = 'auto';
      
      // Set the height to the scroll height
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }, []);

    React.useEffect(() => {
      handleInput();
    }, [props.value, handleInput]);

    return (
      <textarea
        className={cn(
          "flex min-h-[40px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={combinedRef}
        onInput={handleInput}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
