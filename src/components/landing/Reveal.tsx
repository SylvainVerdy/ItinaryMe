"use client";

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

type RevealProps = {
  children: React.ReactNode;
  /** Décalage de l'animation, en ms. */
  delay?: number;
  className?: string;
  as?: 'div' | 'section' | 'li' | 'article';
};

/**
 * Révèle son contenu au premier passage dans le viewport.
 * Le style vit dans `.reveal` / `.reveal.is-visible` (globals.css), qui neutralise
 * aussi l'animation quand `prefers-reduced-motion` est actif.
 */
export function Reveal({ children, delay = 0, className, as: Tag = 'div' }: RevealProps) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }

    // Déjà dans (ou au-dessus de) la fenêtre au montage : rechargement en cours
    // de page, ancre, restauration de position. On affiche sans attendre.
    if (node.getBoundingClientRect().top < window.innerHeight) {
      setVisible(true);
      return;
    }

    // threshold 0 : le moindre pixel visible déclenche. Indispensable pour les
    // blocs plus hauts que la fenêtre et pour les scrolls rapides.
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setVisible(true);
        observer.disconnect();
      },
      { threshold: 0, rootMargin: '0px 0px -60px 0px' },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref as never}
      className={cn('reveal', visible && 'is-visible', className)}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </Tag>
  );
}
