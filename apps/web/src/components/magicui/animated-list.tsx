'use client'

import * as React from 'react'
import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion, type MotionProps } from 'motion/react'
import { cn } from '@/lib/utils'

export function AnimatedListItem({ children }: { children: React.ReactNode }) {
  const animations: MotionProps = {
    initial: { scale: 0.9, opacity: 0, y: 8 },
    animate: { scale: 1, opacity: 1, y: 0, originY: 0 },
    exit: { scale: 0.9, opacity: 0 },
    transition: { type: 'spring', stiffness: 350, damping: 40 },
  }
  return (
    <motion.div {...animations} layout className="w-full">
      {children}
    </motion.div>
  )
}

export interface AnimatedListProps extends React.ComponentPropsWithoutRef<'div'> {
  children: React.ReactNode
  /** Delay between each item, in ms */
  delay?: number
}

export const AnimatedList = React.memo(function AnimatedList({
  children,
  className,
  delay = 250,
  ...props
}: AnimatedListProps) {
  const [index, setIndex] = useState(0)
  const childrenArray = useMemo(() => React.Children.toArray(children), [children])

  useEffect(() => {
    if (index >= childrenArray.length - 1) return
    const t = setTimeout(() => setIndex((i) => i + 1), delay)
    return () => clearTimeout(t)
  }, [index, delay, childrenArray.length])

  const itemsToShow = useMemo(
    () => childrenArray.slice(0, index + 1),
    [index, childrenArray],
  )

  return (
    <div className={cn('flex flex-col gap-2', className)} {...props}>
      <AnimatePresence>
        {itemsToShow.map((item) => (
          <AnimatedListItem key={(item as React.ReactElement).key ?? Math.random()}>
            {item}
          </AnimatedListItem>
        ))}
      </AnimatePresence>
    </div>
  )
})
