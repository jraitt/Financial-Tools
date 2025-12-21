'use client';

import { useState } from 'react';
import { updateUserRole, deleteUser } from './actions';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { MoreHorizontal, Shield, User, Trash2 } from 'lucide-react';

interface UserActionsProps {
  userId: string;
  currentRole: string;
  isCurrentUser: boolean;
  userName: string;
}

export function UserActions({ userId, currentRole, isCurrentUser, userName }: UserActionsProps) {
  const [loading, setLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [error, setError] = useState('');

  const handleRoleChange = async (newRole: 'user' | 'admin') => {
    if (loading) return;
    setLoading(true);
    setError('');

    const result = await updateUserRole(userId, newRole);

    if (result.error) {
      setError(result.error);
    }

    setLoading(false);
  };

  const handleDelete = async () => {
    if (loading) return;
    setLoading(true);
    setError('');

    const result = await deleteUser(userId);

    if (result.error) {
      setError(result.error);
    }

    setDeleteDialogOpen(false);
    setLoading(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" disabled={loading}>
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {currentRole !== 'admin' && (
            <DropdownMenuItem onClick={() => handleRoleChange('admin')}>
              <Shield className="h-4 w-4 mr-2" />
              Make Admin
            </DropdownMenuItem>
          )}
          {currentRole === 'admin' && !isCurrentUser && (
            <DropdownMenuItem onClick={() => handleRoleChange('user')}>
              <User className="h-4 w-4 mr-2" />
              Remove Admin
            </DropdownMenuItem>
          )}
          {isCurrentUser && (
            <DropdownMenuItem disabled className="text-muted-foreground">
              <User className="h-4 w-4 mr-2" />
              This is you
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setDeleteDialogOpen(true)}
            disabled={isCurrentUser}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete User
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {error && (
        <span className="text-xs text-destructive ml-2">{error}</span>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{userName}</strong>? This action cannot be undone.
              All of their data will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
