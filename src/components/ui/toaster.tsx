import { useToast } from "@/hooks/use-toast"
import { useLanguage } from "@/context/LanguageContext"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

export function Toaster() {
  const { toasts } = useToast()
  const { direction } = useLanguage()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className={`grid gap-1 ${direction === 'rtl' ? 'text-right' : ''}`}>
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport className={direction === 'rtl' ? 'sm:left-0 sm:right-auto' : ''} />
    </ToastProvider>
  )
}
