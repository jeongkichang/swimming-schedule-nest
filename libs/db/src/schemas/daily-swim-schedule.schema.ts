import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class DailySwimSchedule extends Document {
    @Prop()
    day?: string;

    @Prop()
    time_range?: string;

    @Prop()
    adult_fee?: number;

    @Prop()
    teen_fee?: number;

    @Prop()
    child_fee?: number;

    @Prop()
    pool_code?: string;

    @Prop()
    createdAt?: Date;

    @Prop()
    created_at?: Date;
}

export const DailySwimScheduleSchema = SchemaFactory.createForClass(DailySwimSchedule);
