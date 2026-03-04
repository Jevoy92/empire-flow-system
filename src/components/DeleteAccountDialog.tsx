import { useState } from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DeleteAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userEmail: string;
  onDeleted: () => void;
}

export function DeleteAccountDialog({ open, onOpenChange, userEmail, onDeleted }: DeleteAccountDialogProps) {
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const handleDelete = async () => {
    if (confirmText !== 'DELETE') {
      toast({ variant: 'destructive', title: 'Please type DELETE to confirm' });
      return;
    }

    setIsDeleting(true);
    
    try {
      const { error } = await supabase.functions.invoke('delete-account');
      
      if (error) throw error;
      
      toast({ title: 'Account deleted successfully' });
      onDeleted();
    } catch (error: unknown) {
      toast({ 
        variant: 'destructive', 
        title: 'Failed to delete account',
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setConfirmText('');
    }
    onOpenChange(open);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
            <AlertDialogTitle>Delete Account</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-3">
            <p>
              This action is <strong>permanent and cannot be undone</strong>. All your data will be deleted:
            </p>
            <ul className="list-disc list-inside text-sm space-y-1">
              <li>All sessions and history</li>
              <li>All projects and templates</li>
              <li>All notes and achievements</li>
              <li>Your profile and settings</li>
            </ul>
            <p className="pt-2">
              Type <strong>DELETE</strong> below to confirm:
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <Input
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder="Type DELETE"
          className="my-2"
        />
        
        <AlertDialogFooter>
          <Button variant="ghost" onClick={() => handleClose(false)} disabled={isDeleting}>
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleDelete}
            disabled={confirmText !== 'DELETE' || isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Deleting...
              </>
            ) : (
              'Delete My Account'
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
