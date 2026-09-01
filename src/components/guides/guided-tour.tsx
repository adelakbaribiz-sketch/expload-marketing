'use client'

import { useState, lazy, Suspense } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getGuide } from '@/lib/guides/section-guides'
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip'
import { HelpCircle, X, ChevronRight, ChevronLeft, Lightbulb, Sparkles } from 'lucide-react'

// Lazy-load framer-motion (heavy)
const MotionDiv = lazy(() => import('framer-motion').then(m => ({ default: m.motion.div })))
const AnimatePresence = lazy(() => import('framer-motion').then(m => ({ default: m.AnimatePresence })))

interface GuideTooltipProps {
  sectionId: string
  children?: React.ReactNode
}

/** Wrap any element with a help tooltip showing the section guide. */
export function GuideTooltip({ sectionId, children }: GuideTooltipProps) {
  const guide = getGuide(sectionId)
  if (!guide) return <>{children}</>
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          {children ?? (
            <button className="inline-flex items-center justify-center rounded-full p-1 hover:bg-muted transition-colors">
              <HelpCircle className="h-4 w-4 text-brand-accent" />
            </button>
          )}
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs animate-tooltip-in">
          <div className="text-xs">
            <div className="font-semibold mb-1 text-brand-primary">{guide.label}</div>
            <div className="text-muted-foreground">{guide.tooltip}</div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

interface GuidedTourProps {
  sectionId: string
  open: boolean
  onClose: () => void
}

/** Modal walkthrough of a section's step-by-step guide. */
export function GuidedTour({ sectionId, open, onClose }: GuidedTourProps) {
  const [step, setStep] = useState(0)
  const guide = getGuide(sectionId)

  // Reset step when sectionId changes (use key prop on parent instead)
  // step state lives for the lifetime of the modal

  if (!guide || !open) return null

  const current = guide.steps[step]
  const isLast = step === guide.steps.length - 1

  return (
    <Suspense fallback={null}>
      <AnimatePresence>
        <MotionDiv
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 grid place-items-center bg-black/40 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <MotionDiv
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            transition={{ type: 'spring', damping: 20 }}
            onClick={(e: any) => e.stopPropagation()}
            className="w-full max-w-lg"
          >
            <Card className="card-3d shadow-2xl border-2" style={{ borderColor: '#F26522' }}>
              <CardContent className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="grid place-items-center h-10 w-10 rounded-xl bg-brand-accent-gradient text-white animate-float-3d">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-wider text-brand-accent font-semibold">Step {step + 1} of {guide.steps.length}</div>
                      <div className="font-bold text-lg text-brand-primary">{guide.label}</div>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={onClose}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Progress bar */}
                <div className="h-1.5 bg-muted rounded-full mb-4 overflow-hidden">
                  <div
                    className="h-full bg-brand-accent-gradient transition-all duration-300"
                    style={{ width: `${((step + 1) / guide.steps.length) * 100}%` }}
                  />
                </div>

                {/* Current step content */}
                <div className="space-y-3 mb-6">
                  <h3 className="font-semibold text-base text-brand-primary">{current.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{current.description}</p>
                  {current.tip && (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-brand-light/20 border border-brand-light/40">
                      <Lightbulb className="h-4 w-4 text-brand-accent shrink-0 mt-0.5" />
                      <div className="text-xs"><strong>Tip:</strong> {current.tip}</div>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={step === 0}
                    onClick={() => setStep(s => s - 1)}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" /> Back
                  </Button>

                  <div className="flex gap-1">
                    {guide.steps.map((_, i) => (
                      <div
                        key={i}
                        className={`h-1.5 rounded-full transition-all ${i === step ? 'w-6 bg-brand-accent' : 'w-1.5 bg-muted-foreground/40'}`}
                      />
                    ))}
                  </div>

                  {isLast ? (
                    <Button size="sm" className="bg-brand-accent-gradient text-white btn-3d" onClick={onClose}>
                      Done <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  ) : (
                    <Button size="sm" className="bg-brand-accent-gradient text-white btn-3d" onClick={() => setStep(s => s + 1)}>
                      Next <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  )}
                </div>

                {/* Next-step suggestion on last step */}
                {isLast && guide.nextStep && (
                  <div className="mt-4 p-3 rounded-lg bg-brand-primary/5 border border-brand-primary/20 text-xs">
                    <div className="font-semibold text-brand-primary mb-1">Next:</div>
                    <div className="text-muted-foreground">{guide.nextStep}</div>
                  </div>
                )}
              </CardContent>
            </Card>
          </MotionDiv>
        </MotionDiv>
      </AnimatePresence>
    </Suspense>
  )
}

/** Hook to manage guided tour state. */
export function useGuidedTour() {
  const [open, setOpen] = useState(false)
  const [sectionId, setSectionId] = useState<string>('')
  const startTour = (id: string) => { setSectionId(id); setOpen(true) }
  const closeTour = () => setOpen(false)
  return { open, sectionId, startTour, closeTour }
}
