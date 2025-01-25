import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class SwimmingPool extends Document {
    @Prop()
    name?: string;

    @Prop()
    code?: string;

    @Prop()
    url?: string;
}

export const SwimmingPoolSchema = SchemaFactory.createForClass(SwimmingPool);
