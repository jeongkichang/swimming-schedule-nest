import {Exclude, Expose} from 'class-transformer';

@Exclude()
export class PoolInfoDto {
    @Expose()
    _id?: string;

    @Expose()
    address?: string;

    @Expose()
    pbid?: number;
}
