import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
interface AuthRequiredDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmLogin: () => void;
}
export function AuthRequiredDialog({
  open,
  onOpenChange,
  onConfirmLogin,
}: AuthRequiredDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Требуется авторизация</AlertDialogTitle>
          <AlertDialogDescription>
            Для редактирования необходимо войти в аккаунт.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Отмена</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirmLogin}>Войти</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
