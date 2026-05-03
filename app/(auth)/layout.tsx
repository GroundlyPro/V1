import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-brand">Groundly PRO</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Field service management for local businesses
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
