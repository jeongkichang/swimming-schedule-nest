import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from "@nestjs/mongoose";
import { DailySwimSchedule } from "@libs/db/schemas/daily-swim-schedule.schema";
import { Model } from "mongoose";

@Injectable()
export class WebService {
    private readonly logger = new Logger(WebService.name);

    constructor(
        @InjectModel(DailySwimSchedule.name)
        private readonly dailySwimScheduleModel: Model<DailySwimSchedule>,
    ) {}

    async getAvailableSwimSchedules(): Promise<any[]> {
        const now = new Date();
        const dayStringList = ['일', '월', '화', '수', '목', '금', '토'];
        const currentDayKorean = dayStringList[now.getDay()];
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();

        let results = await this.dailySwimScheduleModel.aggregate([
            {
                $match: { day: currentDayKorean }
            },
            {
                $lookup: {
                    from: 'seoul_pool_info',
                    localField: 'pool_code',
                    foreignField: 'pool_code',
                    as: 'poolInfo'
                }
            },
            {
                $unwind: {
                    path: '$poolInfo',
                    preserveNullAndEmptyArrays: true
                }
            },
        ]);

        results = results.filter((doc: any) => {
            if (!doc.time_range) return false;
            const [startStr] = doc.time_range.split('-').map((t: string) => t.trim());
            const [startHour, startMin] = startStr.split(':').map(Number);

            const nowInMinutes = currentHour * 60 + currentMinute;
            const startInMinutes = startHour * 60 + startMin;

            return nowInMinutes <= startInMinutes;
        });

        const output = results.map((doc: any) => ({
            day: doc.day,
            time_range: doc.time_range,
            adult_fee: doc.adult_fee,
            teen_fee: doc.teen_fee,
            child_fee: doc.child_fee,
            pool_code: doc.pool_code,
            title: doc.poolInfo?.title,
            address: doc.poolInfo?.address,
        }));

        this.logger.log(`Found ${output.length} schedules for ${currentDayKorean} after ${currentHour}:${currentMinute}`);
        return output;
    }

    /**
     * 위치 기반으로 2km 반경 내의 자유수영 정보를 찾아오는 예시
     * - seoul_pool_info 컬렉션(GeoJSON)을 시작점으로 $geoNear
     * - daily_swim_schedule 와 $lookup
     */
    async getAvailableSwimSchedulesNear(lat: number, lng: number): Promise<any[]> {

        console.log(lat, lng);

        const now = new Date();
        const dayStringList = ['일', '월', '화', '수', '목', '금', '토'];
        const currentDayKorean = dayStringList[now.getDay()];

        // 1) 서울 수영장 정보 컬렉션(seoul_pool_info)을 기준으로 GeoNear
        //    - location 필드(GeoJSON) + 2dsphere 인덱스를 통해 2km 이내 수영장 찾기
        // 2) pool_code 기반으로 daily_swim_schedule을 조인($lookup)
        // 3) 요일(day) 필터 등도 파이프라인에서 처리 가능(아래 $match)
        //    * 시간대 필터(time_range)는 복잡하므로, 필요하다면 추가 스테이지나 별도 로직으로 진행 가능
        //    * 여기서는 예시로 day만 필터

        const pipeline = [
            {
                $geoNear: {
                    near: { type: 'Point', coordinates: [lng, lat] }, // 주의: [경도, 위도] 순서
                    distanceField: 'dist',
                    maxDistance: 2000, // 2km
                    spherical: true,
                },
            },
            {
                $lookup: {
                    from: 'daily_swim_schedule',        // lookup 대상 컬렉션
                    localField: 'pool_code',            // seoul_pool_info.pool_code
                    foreignField: 'pool_code',          // daily_swim_schedule.pool_code
                    as: 'schedules',                    // 결과 배열
                },
            },
            // schedules 배열을 펼쳐서 개별 문서로
            {
                $unwind: '$schedules',
            },
            // 요일(day) 필터 적용
            // {
            //     $match: {
            //         'schedules.day': currentDayKorean,
            //     },
            // },
            // 최종 필요한 필드만 정리(예시)
            {
                $project: {
                    _id: 0,
                    pool_code: 1,
                    title: 1,
                    address: 1,
                    location: 1,
                    dist: 1, // dist(거리)도 필요하면 포함
                    'schedules.day': 1,
                    'schedules.time_range': 1,
                    'schedules.adult_fee': 1,
                    'schedules.teen_fee': 1,
                    'schedules.child_fee': 1,
                },
            },
        ];

        // 2) 실제 DB 컬렉션은 dailySwimScheduleModel의 db/connection에서
        //    seoul_pool_info 컬렉션을 가져와 aggregate를 호출
        const seoulPoolCollection = this.dailySwimScheduleModel.db.collection('seoul_pool_info');

        // 3) 파이프라인 실행
        const results = await seoulPoolCollection.aggregate(pipeline).toArray();

        this.logger.log(
            `[getAvailableSwimSchedulesNear] lat=${lat}, lng=${lng}, found=${results.length}, day=${currentDayKorean}`,
        );
        return results;
    }
}
