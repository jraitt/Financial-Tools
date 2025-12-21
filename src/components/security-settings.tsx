'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChangePasswordDialog } from './change-password-dialog';

export function SecuritySettings() {
  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg">Security</CardTitle>
        <CardDescription>Update your password and security settings.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">
        <ChangePasswordDialog />
        <button className="w-full text-left text-sm font-medium text-muted-foreground py-2 cursor-not-allowed">
          Manage Two-Factor Authentication (Coming Soon)
        </button>
      </CardContent>
    </Card>
  );
}
