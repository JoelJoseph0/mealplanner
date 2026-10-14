import Dialog from './Dialog';
import Button from './Button';

export const ConfirmDialog = ({
  open,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Confirm',
  danger = false,
  loading = false,
}) => (
  <Dialog
    open={open}
    onClose={onClose}
    title={title}
    size="sm"
    footer={
      <>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>
          {confirmLabel}
        </Button>
      </>
    }
  >
    <p className="text-sm text-muted">{message}</p>
  </Dialog>
);

export default ConfirmDialog;
