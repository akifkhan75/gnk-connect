import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Calculator, Pencil, Plus, Trash2, TriangleAlert } from 'lucide-react';
import {
  PRICING_SCOPES,
  PRODUCT_TYPES,
  ROUNDING_MODES,
  type PricingRuleDto,
  type PricingScope,
} from '@gnk/types';
import { pricingRuleSchema, type PricingRuleInput } from '@gnk/validation';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  Checkbox,
  ConfirmDialog,
  DataTable,
  Dialog,
  ErrorState,
  Field,
  Input,
  Money,
  PageHeader,
  Select,
  Tabs,
  formatDate,
  titleCase,
  useToast,
} from '@gnk/ui';
import { api } from '@/lib/api';
import { applyServerErrors, errorMessage } from '@/lib/forms';
import { useCan } from '@/lib/useCan';
import { RequirePerm } from '@/components/guards';

const SCOPE_LABEL: Record<PricingScope, string> = {
  PARTNER_PRODUCT: 'Partner + product',
  PARTNER: 'Partner',
  TIER: 'Pricing tier',
  DEPARTURE: 'Departure',
  PRODUCT: 'Product',
  PRODUCT_TYPE: 'Product type',
  SUPPLIER: 'Supplier',
  DEFAULT: 'Default',
};

export function PricingPage() {
  const [tab, setTab] = useState('rules');
  return (
    <RequirePerm perm="pricing:read">
      <PageHeader
        title="Pricing"
        description="Markup rules turn supplier net fares into partner selling prices. The most specific matching rule wins; stackable rules add on top."
      />
      <Card>
        <div className="px-4">
          <Tabs
            value={tab}
            onChange={setTab}
            items={[
              { value: 'rules', label: 'Rules' },
              { value: 'simulate', label: 'Simulator' },
              { value: 'tiers', label: 'Tiers' },
            ]}
          />
        </div>
        {tab === 'rules' && <Rules />}
        {tab === 'simulate' && <Simulator />}
        {tab === 'tiers' && <Tiers />}
      </Card>
    </RequirePerm>
  );
}

function Rules() {
  const can = useCan();
  const qc = useQueryClient();
  const toast = useToast();
  const [editing, setEditing] = useState<PricingRuleDto | 'new' | null>(null);
  const [deleting, setDeleting] = useState<PricingRuleDto | null>(null);
  const q = useQuery({ queryKey: ['rules'], queryFn: api.pricing.rules });
  if (q.error) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const writable = can('pricing:write');
  return (
    <>
      <div className="flex items-center justify-between gap-3 border-b p-4">
        <p className="text-[13px] text-muted-foreground">
          Precedence: partner + product → partner → tier → departure → product → product type →
          supplier → default.
        </p>
        {writable && (
          <Button onClick={() => setEditing('new')}>
            <Plus /> New rule
          </Button>
        )}
      </div>
      <DataTable
        rows={q.data}
        loading={q.isLoading}
        rowKey={(r) => r.id}
        rowClassName={(r) => (r.isActive ? undefined : 'opacity-55')}
        onRowClick={writable ? (r) => setEditing(r) : undefined}
        columns={[
          {
            key: 'n',
            header: 'Rule',
            cell: (r) => (
              <div>
                <p className="flex items-center gap-2 font-medium">
                  {r.name}
                  {r.conflictsWith.length > 0 && (
                    <span
                      title={`Same scope, target and priority as: ${r.conflictsWith.join(', ')}`}
                      className="text-warning"
                    >
                      <TriangleAlert className="size-4" />
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">{r.targetLabel}</p>
              </div>
            ),
          },
          {
            key: 's',
            header: 'Scope',
            cell: (r) => (
              <Badge tone={r.scope === 'DEFAULT' ? 'neutral' : 'primary'}>
                {SCOPE_LABEL[r.scope]}
              </Badge>
            ),
          },
          {
            key: 'm',
            header: 'Markup',
            align: 'right',
            cell: (r) => (
              <div>
                <p className="font-semibold">
                  {r.markupType === 'FIXED' ? <Money value={r.markupValue} /> : `${r.markupValue}%`}
                </p>
                {(r.minMarkup != null || r.maxMarkup != null) && (
                  <p className="text-xs text-muted-foreground">
                    {r.minMarkup != null && `min ${r.minMarkup.toLocaleString('en-PK')}`}{' '}
                    {r.maxMarkup != null && `max ${r.maxMarkup.toLocaleString('en-PK')}`}
                  </p>
                )}
              </div>
            ),
          },
          {
            key: 'x',
            header: 'Options',
            hideBelow: 'lg',
            cell: (r) => (
              <span className="flex flex-wrap gap-1">
                {r.stackable && <Badge tone="gold">Stacks</Badge>}
                {r.rounding !== 'NONE' && <Badge>{titleCase(r.rounding)}</Badge>}
                {r.priority > 0 && <Badge>Priority {r.priority}</Badge>}
              </span>
            ),
          },
          {
            key: 'v',
            header: 'Valid',
            hideBelow: 'md',
            cell: (r) =>
              r.validFrom || r.validTo
                ? `${r.validFrom ? formatDate(r.validFrom) : '…'} – ${r.validTo ? formatDate(r.validTo) : '…'}`
                : 'Always',
          },
          {
            key: 'a',
            header: 'Status',
            align: 'right',
            cell: (r) =>
              r.isActive ? (
                <Badge tone="success" dot>
                  Active
                </Badge>
              ) : (
                <Badge>Paused</Badge>
              ),
          },
          ...(writable
            ? [
                {
                  key: 'act',
                  header: <span className="sr-only">Actions</span>,
                  align: 'right' as const,
                  cell: (r: PricingRuleDto) => (
                    <span className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setEditing(r)}
                        aria-label="Edit rule"
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setDeleting(r)}
                        aria-label="Delete rule"
                      >
                        <Trash2 />
                      </Button>
                    </span>
                  ),
                },
              ]
            : []),
        ]}
      />
      {editing && (
        <RuleDialog rule={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />
      )}
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete "${deleting?.name}"?`}
        description="New quotes stop using it straight away. Existing bookings keep their price."
        confirmLabel="Delete rule"
        tone="danger"
        onConfirm={async () => {
          try {
            qc.setQueryData(['rules'], await api.pricing.remove(deleting!.id));
            toast.success('Rule deleted');
          } catch (e) {
            throw new Error(errorMessage(e), { cause: e });
          }
        }}
      />
    </>
  );
}

function RuleDialog({ rule, onClose }: { rule: PricingRuleDto | null; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [error, setError] = useState<string>();
  const options = useQuery({ queryKey: ['options'], queryFn: api.catalog.options });
  const tiers = useQuery({ queryKey: ['tiers'], queryFn: api.pricing.tiers });
  const {
    register,
    handleSubmit,
    watch,
    formState,
    setError: setFieldError,
  } = useForm<PricingRuleInput>({
    resolver: zodResolver(pricingRuleSchema),
    defaultValues: rule
      ? ({
          ...rule,
          productType: rule.productType ?? '',
          supplierId: rule.supplierId ?? '',
          productId: rule.productId ?? '',
          departureId: rule.departureId ?? '',
          accountId: rule.accountId ?? '',
          pricingTierId: rule.pricingTierId ?? '',
          minMarkup: rule.minMarkup ?? '',
          maxMarkup: rule.maxMarkup ?? '',
          validFrom: rule.validFrom ?? '',
          validTo: rule.validTo ?? '',
        } as never)
      : {
          name: '',
          scope: 'PRODUCT',
          markupType: 'FIXED',
          markupValue: 10000,
          stackable: false,
          priority: 0,
          rounding: 'NEAREST_100',
          isActive: true,
        },
  });
  const scope = watch('scope');
  const productId = watch('productId');
  const markupType = watch('markupType');
  const e = formState.errors;
  const save = useMutation({
    mutationFn: (v: PricingRuleInput) =>
      rule ? api.pricing.update(rule.id, v) : api.pricing.create(v),
    onSuccess: (rules) => {
      qc.setQueryData(['rules'], rules);
      toast.success(rule ? 'Rule updated' : 'Rule created');
      onClose();
    },
    onError: (err) => setError(applyServerErrors(err, setFieldError)),
  });
  const onSubmit = handleSubmit((v) => save.mutate(v));
  const needs = (s: PricingScope[]) => s.includes(scope as PricingScope);

  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={rule ? 'Edit pricing rule' : 'New pricing rule'}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onSubmit} loading={save.isPending}>
            Save rule
          </Button>
        </>
      }
    >
      <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
        {error && (
          <Alert tone="danger" className="sm:col-span-2">
            {error}
          </Alert>
        )}
        <Field label="Name" required className="sm:col-span-2" error={e.name?.message}>
          <Input placeholder="e.g. Umrah peak season +5,000" {...register('name')} />
        </Field>
        <Field label="Applies to" required error={e.scope?.message}>
          <Select {...register('scope')}>
            {PRICING_SCOPES.map((s) => (
              <option key={s} value={s}>
                {SCOPE_LABEL[s]}
              </option>
            ))}
          </Select>
        </Field>
        {needs(['PARTNER', 'PARTNER_PRODUCT']) && (
          <Field label="Partner" required error={e.accountId?.message}>
            <Select {...register('accountId')}>
              <option value="">Select…</option>
              {options.data?.partners.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
        )}
        {needs(['PRODUCT', 'PARTNER_PRODUCT', 'DEPARTURE']) && (
          <Field label="Product" required={scope !== 'DEPARTURE'} error={e.productId?.message}>
            <Select {...register('productId')}>
              <option value="">Select…</option>
              {options.data?.products.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
        )}
        {needs(['DEPARTURE']) && (
          <Field label="Departure" required error={e.departureId?.message}>
            <Select {...register('departureId')}>
              <option value="">Select…</option>
              {options.data?.departures
                .filter((d) => !productId || d.productId === productId)
                .map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
            </Select>
          </Field>
        )}
        {needs(['PRODUCT_TYPE']) && (
          <Field label="Product type" required error={e.productType?.message}>
            <Select {...register('productType')}>
              <option value="">Select…</option>
              {PRODUCT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {titleCase(t)}
                </option>
              ))}
            </Select>
          </Field>
        )}
        {needs(['SUPPLIER']) && (
          <Field label="Supplier" required error={e.supplierId?.message}>
            <Select {...register('supplierId')}>
              <option value="">Select…</option>
              {options.data?.suppliers.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
        )}
        {needs(['TIER']) && (
          <Field label="Tier" required error={e.pricingTierId?.message}>
            <Select {...register('pricingTierId')}>
              <option value="">Select…</option>
              {tiers.data?.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-2 sm:col-span-2">
          <Field label="Markup type">
            <Select {...register('markupType')}>
              <option value="FIXED">Fixed PKR</option>
              <option value="PERCENTAGE">Percent of net</option>
            </Select>
          </Field>
          <Field
            label={markupType === 'FIXED' ? 'Amount per seat (PKR)' : 'Percent'}
            required
            error={e.markupValue?.message}
          >
            <Input type="number" step="0.01" min={0} {...register('markupValue')} />
          </Field>
        </div>
        {markupType === 'PERCENTAGE' && (
          <>
            <Field label="Minimum markup (PKR)" error={e.minMarkup?.message}>
              <Input type="number" min={0} {...register('minMarkup')} />
            </Field>
            <Field label="Maximum markup (PKR)" error={e.maxMarkup?.message}>
              <Input type="number" min={0} {...register('maxMarkup')} />
            </Field>
          </>
        )}
        <Field label="Round selling price">
          <Select {...register('rounding')}>
            {ROUNDING_MODES.map((r) => (
              <option key={r} value={r}>
                {r === 'NONE' ? 'No rounding' : titleCase(r)}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="Priority"
          hint="Breaks ties within the same scope (higher wins)"
          error={e.priority?.message}
        >
          <Input type="number" min={0} {...register('priority')} />
        </Field>
        <Field label="Valid from" error={e.validFrom?.message}>
          <Input type="date" {...register('validFrom')} />
        </Field>
        <Field label="Valid until" error={e.validTo?.message}>
          <Input type="date" {...register('validTo')} />
        </Field>
        <div className="flex flex-col gap-2 sm:col-span-2">
          <Checkbox
            label="Stackable: add this on top of the winning rule (e.g. a seasonal surcharge)"
            {...register('stackable')}
          />
          <Checkbox label="Active" {...register('isActive')} />
        </div>
      </form>
    </Dialog>
  );
}

function Simulator() {
  const options = useQuery({ queryKey: ['options'], queryFn: api.catalog.options });
  const [accountId, setAccountId] = useState('');
  const [departureId, setDepartureId] = useState('');
  const [seats, setSeats] = useState(1);
  const sim = useMutation({
    mutationFn: () => api.pricing.simulate({ accountId, departureId, seats }),
  });
  const OUTCOME: Record<string, ['success' | 'gold' | 'neutral' | 'warning', string]> = {
    applied: ['success', 'Applied'],
    stacked: ['gold', 'Stacked'],
    overridden: ['warning', 'Overridden by a more specific rule'],
    not_matching: ['neutral', "Doesn't match"],
    inactive: ['neutral', 'Paused'],
    expired: ['neutral', 'Outside validity'],
  };
  return (
    <CardBody className="space-y-5">
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_100px_auto] md:items-end">
        <Field label="Partner">
          <Select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            <option value="">Select a partner…</option>
            {options.data?.partners.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Departure">
          <Select value={departureId} onChange={(e) => setDepartureId(e.target.value)}>
            <option value="">Select a departure…</option>
            {options.data?.departures.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Seats">
          <Input
            type="number"
            min={1}
            max={9}
            value={seats}
            onChange={(e) => setSeats(Number(e.target.value) || 1)}
          />
        </Field>
        <Button
          onClick={() => sim.mutate()}
          disabled={!accountId || !departureId}
          loading={sim.isPending}
        >
          <Calculator /> Calculate
        </Button>
      </div>
      {sim.error && <Alert tone="danger">{errorMessage(sim.error)}</Alert>}
      {sim.data && (
        <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
          <div className="space-y-2 rounded-lg border bg-surface-sunken p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Supplier net</span>
              <Money value={sim.data.supplierNet} />
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Markup</span>
              <Money value={sim.data.markup} className="text-success" />
            </div>
            <div className="flex justify-between border-t pt-2 font-semibold">
              <span>Selling / seat</span>
              <Money value={sim.data.unitPrice} />
            </div>
            <div className="flex justify-between text-lg font-semibold">
              <span>Total × {sim.data.seats}</span>
              <Money value={sim.data.totalPrice} />
            </div>
          </div>
          <DataTable
            dense
            rows={sim.data.evaluated}
            rowKey={(r) => r.id}
            columns={[
              {
                key: 'n',
                header: 'Rule',
                cell: (r) => <span className="font-medium">{r.name}</span>,
              },
              { key: 's', header: 'Scope', cell: (r) => SCOPE_LABEL[r.scope] },
              {
                key: 'o',
                header: 'Outcome',
                align: 'right',
                cell: (r) => <Badge tone={OUTCOME[r.outcome][0]}>{OUTCOME[r.outcome][1]}</Badge>,
              },
              {
                key: 'a',
                header: 'Amount',
                align: 'right',
                cell: (r) => {
                  const a = sim.data!.applied.find((x) => x.id === r.id);
                  return a ? <Money value={a.amount} /> : '';
                },
              },
            ]}
          />
        </div>
      )}
    </CardBody>
  );
}

function Tiers() {
  const can = useCan();
  const qc = useQueryClient();
  const toast = useToast();
  const [name, setName] = useState('');
  const q = useQuery({ queryKey: ['tiers'], queryFn: api.pricing.tiers });
  const create = useMutation({
    mutationFn: () => api.pricing.createTier(name.trim()),
    onSuccess: (t) => {
      qc.setQueryData(['tiers'], t);
      setName('');
      toast.success('Tier created');
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: api.pricing.deleteTier,
    onSuccess: (t) => qc.setQueryData(['tiers'], t),
    onError: (e) => toast.error(errorMessage(e)),
  });
  return (
    <>
      {can('pricing:write') && (
        <div className="flex gap-2 border-b p-4">
          <Input
            className="max-w-xs"
            placeholder="New tier, e.g. Gold"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Button
            onClick={() => create.mutate()}
            disabled={name.trim().length < 2}
            loading={create.isPending}
          >
            <Plus /> Add tier
          </Button>
        </div>
      )}
      <DataTable
        rows={q.data}
        loading={q.isLoading}
        rowKey={(t) => t.id}
        empty={
          <p className="text-center text-sm text-muted-foreground">
            No tiers. Tiers group partners that share pricing rules (e.g. Gold, Silver).
          </p>
        }
        columns={[
          { key: 'n', header: 'Tier', cell: (t) => <span className="font-medium">{t.name}</span> },
          { key: 'p', header: 'Partners', align: 'right', cell: (t) => t.partnersCount },
          ...(can('pricing:write')
            ? [
                {
                  key: 'a',
                  header: <span className="sr-only">Actions</span>,
                  align: 'right' as const,
                  cell: (t: { id: string }) => (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => remove.mutate(t.id)}
                      aria-label="Delete tier"
                    >
                      <Trash2 />
                    </Button>
                  ),
                },
              ]
            : []),
        ]}
      />
    </>
  );
}
