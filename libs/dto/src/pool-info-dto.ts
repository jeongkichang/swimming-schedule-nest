import {Exclude, Expose} from 'class-transformer';

@Exclude()
export class PoolInfoDto {
    @Expose()
    _id?: string;

    @Expose()
    poolId?: string;

    @Expose()
    title?: string;

    @Expose()
    address?: string;

    @Expose()
    pbid?: string;

    @Expose()
    createdAt?: Date;
}
