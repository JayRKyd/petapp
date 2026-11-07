/**
 * What can be booked and how long it takes. Prices and durations depend on
 * the pet's size. These are example values until the owner gives the real
 * list; they will move to a Settings screen so the owner can change them.
 */
export const SIZES = [
  { value: 'small', label: 'Small', hint: 'under 25 lb' },
  { value: 'medium', label: 'Medium', hint: '25 to 50 lb' },
  { value: 'large', label: 'Large', hint: 'over 50 lb' },
] as const;

export type Size = (typeof SIZES)[number]['value'];

export interface Service {
  id: string;
  name: string;
  description: string;
  price: Record<Size, number>;
  /** Minutes on the calendar. */
  minutes: Record<Size, number>;
}

export const SERVICES: Service[] = [
  {
    id: 'bath',
    name: 'Bath & brush',
    description: 'Wash, condition, blow dry, brush out',
    price: { small: 45, medium: 55, large: 70 },
    minutes: { small: 45, medium: 60, large: 75 },
  },
  {
    id: 'full',
    name: 'Full groom',
    description: 'Bath, haircut, nails, ears, pads',
    price: { small: 75, medium: 95, large: 120 },
    minutes: { small: 90, medium: 120, large: 150 },
  },
  {
    id: 'deshed',
    name: 'De-shed treatment',
    description: 'Bath plus a deep brush out for heavy shedders',
    price: { small: 60, medium: 75, large: 95 },
    minutes: { small: 60, medium: 75, large: 90 },
  },
  {
    id: 'nails',
    name: 'Nails & ears',
    description: 'Nail trim and file, ear clean',
    price: { small: 20, medium: 20, large: 25 },
    minutes: { small: 20, medium: 20, large: 25 },
  },
];

/** Appointments can start every this many minutes. */
export const SLOT_STEP_MINUTES = 30;

/** How many pets can be in at the same time: one groomer, one pet. */
export const CAPACITY = 1;

export function serviceById(id: string): Service | null {
  return SERVICES.find((s) => s.id === id) ?? null;
}

export function sizeLabel(size: Size): string {
  return SIZES.find((s) => s.value === size)?.label ?? size;
}
