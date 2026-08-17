import {
  IsArray, IsEmail, IsEnum, IsIn, IsInt, IsISO8601, IsOptional, IsString,
  Matches, MaxLength, Min, MinLength,
} from 'class-validator';
import { DemoBookingStatus, DemoSlotStatus } from '../database/entities/demo.entity';

/** Same option lists the company registration form offers, so the two agree. */
export const DEMO_FIELDS = [
  'Manufacturing', 'Healthcare', 'Technology', 'Finance', 'Retail',
  'Construction', 'Education', 'Logistics', 'Food & Beverage', 'Other',
] as const;

export const DEMO_CAPACITIES = ['1-10', '11-50', '51-200', '201-500', '500+'] as const;

export class CreateDemoBookingDto {
  @IsString()
  @MinLength(2, { message: 'Company name required' })
  @MaxLength(200)
  companyName!: string;

  @IsIn(DEMO_FIELDS as unknown as string[], { message: 'Select a valid field' })
  field!: string;

  @IsEmail({}, { message: 'Invalid email' })
  @MaxLength(320)
  email!: string;

  /** E.164 — the frontend phone input already normalises to this shape. */
  @Matches(/^\+[1-9]\d{6,14}$/, { message: 'Enter a valid phone number with country code' })
  phone!: string;

  @IsString()
  @MinLength(10, { message: 'Description too short' })
  @MaxLength(4000)
  description!: string;

  @IsIn(DEMO_CAPACITIES as unknown as string[], { message: 'Select a valid capacity' })
  companyCapacity!: string;

  @IsString()
  slotId!: string;
}

export class CreateDemoSlotDto {
  /** ISO instant for the slot start. */
  @IsISO8601({}, { message: 'startsAt must be an ISO date-time' })
  startsAt!: string;

  @IsOptional()
  @IsInt()
  @Min(5)
  durationMinutes?: number;
}

export class BulkCreateDemoSlotsDto {
  @IsArray()
  @IsISO8601({}, { each: true, message: 'Each slot start must be an ISO date-time' })
  starts!: string[];

  @IsOptional()
  @IsInt()
  @Min(5)
  durationMinutes?: number;
}

export class UpdateDemoSlotDto {
  @IsOptional()
  @IsEnum(DemoSlotStatus)
  status?: DemoSlotStatus;

  @IsOptional()
  @IsISO8601({}, { message: 'startsAt must be an ISO date-time' })
  startsAt?: string;

  @IsOptional()
  @IsInt()
  @Min(5)
  durationMinutes?: number;
}

export class RespondDemoBookingDto {
  @IsEnum(DemoBookingStatus)
  status!: DemoBookingStatus;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  adminNote?: string;
}
