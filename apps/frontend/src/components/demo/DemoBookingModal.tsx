'use client';

import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { QurelioPhoneInput } from '@/components/ui/phone-input';
import { zPhoneE164Required } from '@/lib/account-validation';
import { toastFirstFieldError } from '@/lib/form-errors';
import { Calendar, Loader2 } from '@/components/icons';
import { demoApi, type DemoSlotPublic } from '@/lib/api';
import { DEMO_CAPACITIES, DEMO_FIELDS, DEMO_RESPONSE_HOURS } from '@/components/demo/demo-options';

const schema = z.object({
  companyName: z.string().min(2, 'Company name required'),
  field: z.string().min(1, 'Field required'),
  email: z.string().email('Invalid email'),
  phone: zPhoneE164Required,
  description: z.string().min(10, 'Description too short'),
  companyCapacity: z.string().min(1, 'Capacity required'),
});
type FormData = z.infer<typeof schema>;

export function formatSlot(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface Props {
  slot: DemoSlotPublic | null;
  onClose: () => void;
  onBooked: () => void;
}

export function DemoBookingModal({ slot, onClose, onBooked }: Props) {
  const {
    register, handleSubmit, control, reset, formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      companyName: '', field: '', email: '', phone: '', description: '', companyCapacity: '',
    },
  });

  const submit = async (data: FormData) => {
    if (!slot) return;
    try {
      await demoApi.book({ ...data, slotId: slot.id });
      toast.success(`Request sent — we will confirm within ${DEMO_RESPONSE_HOURS} hours`);
      reset();
      onBooked();
    } catch (e: any) {
      const raw = e?.response?.data?.message ?? 'Could not send your request';
      toast.error(Array.isArray(raw) ? raw.join(', ') : String(raw));
      // A 409 means someone else took the slot while the form was open.
      if (e?.response?.status === 409) onBooked();
    }
  };

  return (
    <Dialog open={!!slot} onOpenChange={(v) => !v && !isSubmitting && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Book your demo</DialogTitle>
          <DialogDescription className="text-[13px]">
            Tell us about your company so we can tailor the session.
          </DialogDescription>
        </DialogHeader>

        {slot && (
          <div className="flex items-center gap-3 rounded-xl border border-[var(--brand-primary)]/25 bg-[var(--brand-primary)]/5 p-3.5">
            <Calendar className="h-5 w-5 shrink-0 text-[var(--brand-primary)]" />
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-[var(--text-primary)]">{formatSlot(slot.startsAt)}</p>
              <p className="text-[11px] text-[var(--muted)]">
                {slot.durationMinutes} minutes · shown in your local time
              </p>
            </div>
          </div>
        )}

        <form
          onSubmit={handleSubmit(submit, () => toastFirstFieldError(errors))}
          className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2"
        >
          <div className="sm:col-span-2">
            <Label htmlFor="companyName">Company name</Label>
            <Input id="companyName" placeholder="Your company" {...register('companyName')} />
            {errors.companyName && <p className="mt-1 text-xs text-red-600">{errors.companyName.message}</p>}
          </div>

          <div className="min-w-0">
            <Label htmlFor="field">Field / Industry</Label>
            <select
              id="field"
              className="h-10 w-full rounded-md border border-[var(--input-border)] bg-[var(--surface)] px-3 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/30"
              defaultValue=""
              {...register('field')}
            >
              <option value="" disabled>Select a field</option>
              {DEMO_FIELDS.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
            {errors.field && <p className="mt-1 text-xs text-red-600">{errors.field.message}</p>}
          </div>

          <div className="min-w-0">
            <Label htmlFor="companyCapacity">Company capacity</Label>
            <select
              id="companyCapacity"
              className="h-10 w-full rounded-md border border-[var(--input-border)] bg-[var(--surface)] px-3 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/30"
              defaultValue=""
              {...register('companyCapacity')}
            >
              <option value="" disabled>Select capacity</option>
              {DEMO_CAPACITIES.map((c) => <option key={c} value={c}>{c} employees</option>)}
            </select>
            {errors.companyCapacity && <p className="mt-1 text-xs text-red-600">{errors.companyCapacity.message}</p>}
          </div>

          <div className="min-w-0">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="company@email.com" {...register('email')} />
            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
          </div>

          <div className="min-w-0">
            <Label htmlFor="phone">Phone number</Label>
            <Controller
              name="phone"
              control={control}
              render={({ field }) => (
                <QurelioPhoneInput
                  id="phone"
                  value={field.value ? field.value : undefined}
                  onChange={(v) => field.onChange(v ?? '')}
                  onBlur={field.onBlur}
                  error={Boolean(errors.phone)}
                />
              )}
            />
            {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone.message}</p>}
          </div>

          <div className="sm:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              rows={4}
              placeholder="Briefly describe your company and quality goals..."
              {...register('description')}
            />
            {errors.description && <p className="mt-1 text-xs text-red-600">{errors.description.message}</p>}
          </div>

          <div className="sm:col-span-2 mt-1 flex flex-col-reverse items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[11px] text-[var(--muted)]">
              We reply within {DEMO_RESPONSE_HOURS} hours. Your slot is held until then.
            </p>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="gap-2">
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Request this slot
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
