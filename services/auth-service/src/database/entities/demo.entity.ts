import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn, OneToMany, Index, Unique,
} from 'typeorm';

/**
 * Demo booking calendar.
 *
 * Public visitors browse OPEN slots and book one; the platform super admin owns
 * the calendar. Slots are explicit rows rather than generated from weekly rules,
 * so "what is bookable" is always exactly what the admin created.
 */

export enum DemoSlotStatus {
  /** Published and bookable by the public page. */
  OPEN = 'OPEN',
  /** Held by a booking request (pending or confirmed). */
  BOOKED = 'BOOKED',
  /** Kept on the calendar but withdrawn from the public page. */
  BLOCKED = 'BLOCKED',
}

export enum DemoBookingStatus {
  /** Awaiting the admin's answer — the 48 h response target applies from createdAt. */
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  DECLINED = 'DECLINED',
  /** Withdrawn after being accepted, or cancelled with the slot. */
  CANCELLED = 'CANCELLED',
}

@Entity('demo_slots')
@Index(['startsAt'])
@Index(['status', 'startsAt'])
// One slot per instant: makes double-creation impossible, including via bulk generate.
@Unique('uq_demo_slot_startsAt', ['startsAt'])
export class DemoSlot {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Slot start, stored with timezone so the public page can render it locally. */
  @Column({ name: 'starts_at', type: 'timestamp with time zone' })
  startsAt!: Date;

  @Column({ name: 'duration_minutes', type: 'int', default: 45 })
  durationMinutes!: number;

  @Column({ type: 'enum', enum: DemoSlotStatus, default: DemoSlotStatus.OPEN })
  status!: DemoSlotStatus;

  @OneToMany(() => DemoBooking, (b) => b.slot)
  bookings!: DemoBooking[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

@Entity('demo_bookings')
@Index(['status', 'createdAt'])
@Index(['email'])
export class DemoBooking {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'slot_id', type: 'uuid' })
  slotId!: string;

  @ManyToOne(() => DemoSlot, (s) => s.bookings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'slot_id' })
  slot!: DemoSlot;

  // ── Request form (mirrors the company registration fields) ────────────────

  @Column({ name: 'company_name' })
  companyName!: string;

  /** Industry / field, from the same list as company registration. */
  @Column()
  field!: string;

  @Column()
  email!: string;

  /** E.164, produced by the same phone input as registration. */
  @Column()
  phone!: string;

  @Column({ type: 'text' })
  description!: string;

  /** Employee band, e.g. "11-50" — same values as company registration. */
  @Column({ name: 'company_capacity' })
  companyCapacity!: string;

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  @Column({ type: 'enum', enum: DemoBookingStatus, default: DemoBookingStatus.PENDING })
  status!: DemoBookingStatus;

  /** Free-text note the admin adds when answering. */
  @Column({ name: 'admin_note', type: 'text', nullable: true })
  adminNote?: string | null;

  @Column({ name: 'responded_at', type: 'timestamp with time zone', nullable: true })
  respondedAt?: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
