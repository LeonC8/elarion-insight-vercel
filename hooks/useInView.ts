import { useState, useEffect, useRef, RefObject } from 'react';

interface UseInViewOptions {
  root?: Element | null;
  rootMargin?: string;
  threshold?: number | number[];
  triggerOnce?: boolean;
}

export function useInView<T extends Element>(
  options: UseInViewOptions = {}
): { ref: RefObject<T>; isInView: boolean } {
  const { root = null, rootMargin = '0px', threshold = 0, triggerOnce = false } = options;
  const [isInView, setIsInView] = useState(false);
  const ref = useRef<T>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (observerRef.current && triggerOnce && isInView) {
      observerRef.current.disconnect();
    }
  }, [isInView, triggerOnce]);

  useEffect(() => {
    const node = ref.current; // Capture the current value of the ref
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          if (triggerOnce) {
            observer.unobserve(node); // Disconnect after triggering once
             observerRef.current = null; // Clear the ref
          }
        } else if (!triggerOnce) {
           setIsInView(false); // Only reset if triggerOnce is false
        }
      },
      {
        root,
        rootMargin,
        threshold,
      }
    );
    
    observerRef.current = observer; // Store observer instance
    observer.observe(node);

    return () => {
      if (observerRef.current) {
         observerRef.current.disconnect();
         observerRef.current = null;
      } else if (observer) {
        // Fallback if observerRef wasn't set or cleared early
        observer.disconnect();
      }
    };
  // Add triggerOnce to dependencies
  }, [root, rootMargin, threshold, triggerOnce, ref]); // Re-run if options change or ref changes

  return { ref, isInView };
} 