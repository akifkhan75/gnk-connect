import { useEffect, useState } from 'react';
import type { BookingConcessionRequestDto } from '@gnk/types';
import { Button, Dialog, Field, Input, Textarea, titleCase } from '@gnk/ui';

export type ConcessionDecisionPayload = {
  decision: 'APPROVED' | 'REJECTED';
  approvedChildSeats?: number;
  approvedInfantSeats?: number;
  approvedDiscountAmount?: number;
  decisionNote?: string;
  pnrCode?: string;
};

export function ConcessionDecideDialog({
  open,
  onOpenChange,
  request,
  decision,
  onSubmit,
  loading,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  request: BookingConcessionRequestDto | null;
  decision: 'APPROVED' | 'REJECTED';
  onSubmit: (payload: ConcessionDecisionPayload) => void;
  loading: boolean;
}) {
  const [childSeats, setChildSeats] = useState('');
  const [infantSeats, setInfantSeats] = useState('');
  const [discount, setDiscount] = useState('');
  const [pnrCode, setPnrCode] = useState('');
  const [decisionNote, setDecisionNote] = useState('');

  useEffect(() => {
    if (!open || !request) return;
    setChildSeats(String(request.requestedChildSeats ?? ''));
    setInfantSeats(String(request.requestedInfantSeats ?? ''));
    setDiscount(
      request.requestedDiscountAmount != null ? String(request.requestedDiscountAmount) : '',
    );
    setPnrCode('');
    setDecisionNote('');
  }, [open, request]);

  const submit = () => {
    if (!request) return;
    const payload: ConcessionDecisionPayload = {
      decision,
      decisionNote: decisionNote.trim() || undefined,
    };
    if (decision === 'APPROVED') {
      if (request.kind === 'CHILD_SEATS' && childSeats.trim()) {
        payload.approvedChildSeats = Number(childSeats);
      }
      if (request.kind === 'INFANT_SEATS' && infantSeats.trim()) {
        payload.approvedInfantSeats = Number(infantSeats);
      }
      if (request.kind === 'DISCOUNT' && discount.trim()) {
        payload.approvedDiscountAmount = Number(discount);
      }
      if (pnrCode.trim()) payload.pnrCode = pnrCode.trim();
    }
    onSubmit(payload);
  };

  const title =
    decision === 'APPROVED'
      ? `Approve ${request ? titleCase(request.kind) : 'concession'}`
      : 'Reject concession';

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={
        request?.reason
          ? `Partner reason: ${request.reason}`
          : decision === 'REJECTED'
            ? 'The partner is notified with your note.'
            : 'Adjust approved amounts if needed. PNR is optional for child/infant seat grants.'
      }
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant={decision === 'REJECTED' ? 'danger' : 'primary'}
            onClick={submit}
            loading={loading}
          >
            {decision === 'APPROVED' ? 'Approve' : 'Reject'}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {decision === 'APPROVED' && request?.kind === 'CHILD_SEATS' && (
          <>
            <Field label="Approved child seats">
              <Input
                type="number"
                min={0}
                max={50}
                value={childSeats}
                onChange={(e) => setChildSeats(e.target.value)}
              />
            </Field>
            <Field label="Child PNR (optional)">
              <Input
                value={pnrCode}
                onChange={(e) => setPnrCode(e.target.value)}
                placeholder="ABC123"
              />
            </Field>
          </>
        )}
        {decision === 'APPROVED' && request?.kind === 'INFANT_SEATS' && (
          <>
            <Field label="Approved infant seats">
              <Input
                type="number"
                min={0}
                max={50}
                value={infantSeats}
                onChange={(e) => setInfantSeats(e.target.value)}
              />
            </Field>
            <Field label="Infant PNR (optional)">
              <Input
                value={pnrCode}
                onChange={(e) => setPnrCode(e.target.value)}
                placeholder="ABC123"
              />
            </Field>
          </>
        )}
        {decision === 'APPROVED' && request?.kind === 'DISCOUNT' && (
          <Field label="Approved discount (PKR)">
            <Input
              type="number"
              min={0}
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
            />
          </Field>
        )}
        <Field label={decision === 'REJECTED' ? 'Note to partner' : 'Note (optional)'}>
          <Textarea
            value={decisionNote}
            onChange={(e) => setDecisionNote(e.target.value)}
            rows={2}
          />
        </Field>
      </div>
    </Dialog>
  );
}
