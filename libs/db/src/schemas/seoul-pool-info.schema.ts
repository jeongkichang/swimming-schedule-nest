import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class SeoulPoolInfo extends Document {
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

    @Prop()
    source_updated_at?: Date;
}

export const SeoulPoolInfoSchema = SchemaFactory.createForClass(SeoulPoolInfo);
