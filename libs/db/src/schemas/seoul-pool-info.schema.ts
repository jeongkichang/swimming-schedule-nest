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

    @Prop({
        type: {
            type: String,
            enum: ['Point'],
            required: true,
            default: 'Point',
        },
        coordinates: {
            type: [Number],
            required: true,
            default: [0, 0],
        },
    })
    location?: {
        type: 'Point';
        coordinates: [number, number]; // [lng, lat]
    };

    @Prop()
    source_url_type?: string;

    @Prop()
    source_url?: string;

    @Prop()
    is_operating?: string;

    @Prop()
    available_daily_swimming?: string;

    @Prop()
    available_html_crawling?: string;
}

export const SeoulPoolInfoSchema = SchemaFactory.createForClass(SeoulPoolInfo);

SeoulPoolInfoSchema.index({ location: '2dsphere' });
