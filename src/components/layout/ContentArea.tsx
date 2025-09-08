import { ScrollArea } from "@/components/ui/scroll-area"
import { ReactNode, Suspense } from 'react'
import ErrorBoundary from '../ErrorBoundary'
import LoadingSpinner from '../LoadingSpinner'

interface ContentAreaProps {
  children: ReactNode
}

const ContentArea = ({ children }: ContentAreaProps) => {
  return (
    <main className="flex-1 overflow-hidden bg-background">
      <ScrollArea className="h-full">
        <div className="container mx-auto p-6">
          <ErrorBoundary>
            <Suspense fallback={<LoadingSpinner />}>
              {children}
            </Suspense>
          </ErrorBoundary>
        </div>
      </ScrollArea>
    </main>
  )
}

export default ContentArea