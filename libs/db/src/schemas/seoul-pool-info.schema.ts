import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class SeoulPoolInfo extends Document {
    @Prop()
    poolId?: string;

    @Prop()
    title?: string;

    @Prop()
    address?: string;

    @Prop()
    pbid?: string;

    @Prop()
    createdAt?: Date;
}

export const SeoulPoolInfoSchema = SchemaFactory.createForClass(SeoulPoolInfo);
