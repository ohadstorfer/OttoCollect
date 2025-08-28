import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import AuthForm from './AuthForm';

interface AuthRequiredDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AuthRequiredDialog = ({ open, onOpenChange }: AuthRequiredDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Authentication Required</DialogTitle>
          <DialogDescription>
            Please sign in to continue.
          </DialogDescription>
        </DialogHeader>
        <AuthForm mode="login" />
      </DialogContent>
    </Dialog>
  );
};

export default AuthRequiredDialog;
