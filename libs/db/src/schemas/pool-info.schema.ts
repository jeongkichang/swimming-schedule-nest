import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class PoolInfo extends Document {
    @Prop()
    pool_code?: string;

    @Prop()
    title?: string;

    @Prop()
    address?: string;

    @Prop()
    pbid?: string;

    @Prop()
    created_at?: Date;
}

export const PoolInfoSchema = SchemaFactory.createForClass(PoolInfo);
