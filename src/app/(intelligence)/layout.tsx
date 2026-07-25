import { ApplicationShell } from '@/components/intelligence/ApplicationShell';
import type { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
}

export default function IntelligenceLayout({ children }: LayoutProps) {
  return (
    <ApplicationShell activeRoute={'/'}>
      {children}
    </ApplicationShell>
  );
}