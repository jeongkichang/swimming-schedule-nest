import { Injectable, Logger } from '@nestjs/common';
import { LlmService } from "@libs/llm";
import { ScraperService } from "@libs/scraper";
import { OcrService } from "@libs/ocr";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { DailySwimSchedule } from "@libs/db/schemas/daily-swim-schedule.schema";
import { SeoulPoolInfo } from "@libs/db/schemas/seoul-pool-info.schema";

@Injectable()
export class EtlService {
    private readonly logger = new Logger(EtlService.name);

    constructor(
        private readonly llmService: LlmService,
        private readonly scraperService: ScraperService,
        private readonly ocrService: OcrService,

        @InjectModel(SeoulPoolInfo.name)
        private readonly seoulPoolInfoModel: Model<SeoulPoolInfo>,

        @InjectModel(DailySwimSchedule.name)
        private readonly dailySwimScheduleModel: Model<DailySwimSchedule>,
    ) {}

    private delay(ms: number) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    private generatePoolId(): string {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');

        const randomNumber = Math.floor(Math.random() * 0x10000);
        const hexPart = randomNumber.toString(16).padStart(4, '0');

        return `s${year}${month}${day}${hexPart}`;
    }

    async refineSeoulPoolsInfo(): Promise<void> {
        this.logger.log('Starting refineSeoulPoolsInfo...');

        const seoulPoolDocs = await this.seoulPoolInfoModel.find().exec();

        for (const doc of seoulPoolDocs) {
            if (!doc.pbid) {
                this.logger.warn(`Skipping doc without pbid: ${JSON.stringify(doc)}`);
                continue;
            }

            const detailUrl = `${process.env.CRAWLING_TARGET_DETAIL_URL}?pbid=${doc.pbid}`;

            let removedHtml: string;
            try {
                removedHtml = await this.scraperService.fetchAndExtractText(detailUrl);
            } catch (err) {
                this.logger.error(`Failed to scrape detail URL=${detailUrl}`, err);
                continue;
            }

            let imgSrcUrls: string[];
            try {
                imgSrcUrls = await this.scraperService.fetchImageSrcInContainer(detailUrl);
            } catch (err) {
                this.logger.error(`Failed to fetch image src in container`, err);
                continue;
            }

            const prefixUrl = process.env.CRAWLING_TARGET_IMG_URL || '';
            const imgTexts: string[] = [];
            for (const src of imgSrcUrls) {
                try {
                    const fullImgUrl = prefixUrl + src;

                    const ocrResult = await this.ocrService.recognizeKoreanText(fullImgUrl);

                    imgTexts.push(ocrResult.data.text);
                    this.logger.debug(`OCR Texts for pbid=${doc.pbid}: ${ocrResult.data.text}`);
                } catch (err) {
                    this.logger.error(`Failed to OCR image: ${src}`, err);
                }
            }

            const combinedImgText = imgTexts.join('\n');

            let refined: string;
            try {
                refined = await this.llmService.refineSwimInfo(removedHtml, combinedImgText);
            } catch (err) {
                this.logger.error(`Failed to refine info for doc with pbid=${doc.pbid}`, err);
                continue;
            }

            this.logger.log(`Refined info for pbid=${doc.pbid} => ${refined}`);

            let schedules: any;
            try {
                const cleanRefined = refined
                    .trim()
                    .replace(/^```json\s*/i, '')
                    .replace(/\s*```$/, '');
                schedules = JSON.parse(cleanRefined);
            } catch (jsonError) {
                this.logger.error(`Failed to parse LLM JSON for pbid=${doc.pbid}`, jsonError);
                continue;
            }

            if (
                (Array.isArray(schedules) && schedules.length === 0) ||
                (typeof schedules === 'object' && Object.keys(schedules).length === 0)
            ) {
                this.logger.warn(`No data to insert (empty schedules) for pbid=${doc.pbid}`);
            } else {
                if (Array.isArray(schedules)) {
                    for (const schedule of schedules) {
                        await this.dailySwimScheduleModel.create({
                            ...schedule,
                            pool_code: doc.pool_code,
                            created_at: new Date(),
                        });
                    }
                    this.logger.log(`Inserted ${schedules.length} schedules for pbid=${doc.pbid}`);
                } else {
                    await this.dailySwimScheduleModel.create({
                        ...schedules,
                        pool_code: doc.pool_code,
                        created_at: new Date(),
                    });
                    this.logger.log(`Inserted 1 schedule object for pbid=${doc.pbid}`);
                }
            }

            await this.delay(2000);
        }

        this.logger.log('refineSeoulPoolsInfo completed.');
    }

    async getText() {
        const imgUrl = '';
        const text = await this.ocrService.recognizeKoreanText(imgUrl);
        this.logger.log( { text } );
    }

    private readonly sourceUrlTypeList = [
        '홈페이지',
        '홈페이지',
        '홈페이지',
        '홈페이지',
        '인스타그램',
        '홈페이지',
        '영업종료',
        '홈페이지',
        '홈페이지 없음',
        '홈페이지',
        '홈페이지',
        '홈페이지',
        '네이버 블로그',
        '홈페이지',
        '홈페이지',
        '홈페이지 없음',
        '네이버 블로그',
        '홈페이지',
        '홈페이지',
        '홈페이지',
        '홈페이지 없음',
        '홈페이지',
        '홈페이지',
        '카카오 채널',
        '홈페이지',
        '네이버 블로그',
        '홈페이지',
        '홈페이지',
        '홈페이지',
        '다음 카페',
        '홈페이지',
        '홈페이지',
        '홈페이지',
        '홈페이지',
        '홈페이지',
        '홈페이지',
        '홈페이지',
        '네이버 카페',
        '홈페이지',
        '홈페이지',
        '네이버 블로그',
        '홈페이지',
        '홈페이지',
        '영업종료',
        '홈페이지',
        '홈페이지',
        '홈페이지',
        '홈페이지',
        '홈페이지 없음',
        '홈페이지',
        '네이버 블로그',
        '영업종료',
        '홈페이지',
        '홈페이지',
        '홈페이지',
        '홈페이지',
        '홈페이지',
        '홈페이지',
        '홈페이지',
        '홈페이지',
        '홈페이지',
        '네이버 블로그',
        '홈페이지',
        '홈페이지',
        '홈페이지',
        '홈페이지',
        '홈페이지',
        '홈페이지',
        '홈페이지',
        '홈페이지',
        '홈페이지',
        '네이버 블로그',
        '홈페이지',
        '홈페이지',
        '홈페이지',
        '홈페이지',
        '홈페이지',
        '홈페이지',
        '홈페이지',
        '홈페이지',
        '홈페이지',
        '홈페이지',
        '홈페이지',
        '홈페이지',
        '홈페이지',
        '홈페이지',
        '홈페이지',
        '홈페이지',
        '홈페이지',
        '네이버 카페',
        '홈페이지',
        '홈페이지',
        '홈페이지 없음',
        '홈페이지',
        '홈페이지',
        '홈페이지',
        '홈페이지',
        '홈페이지 없음',
        '홈페이지',
        '홈페이지',
        '홈페이지',
        '홈페이지',
        '홈페이지',
        '홈페이지',
        '홈페이지',
        '홈페이지 없음',
        '네이버 블로그',
        '홈페이지',
        '홈페이지',
        '네이버 블로그',
        '홈페이지',
        '홈페이지',
        '홈페이지',
        '홈페이지',
        '홈페이지 없음',
        '홈페이지',
        '홈페이지',
        '홈페이지',
        '홈페이지',
        '홈페이지',
        '홈페이지',
        '홈페이지',
        '홈페이지',
        '홈페이지',
        '홈페이지',
        '홈페이지',
        '홈페이지',
        '홈페이지 없음',
        '홈페이지',
        '홈페이지',
        '홈페이지',
        '홈페이지',
        '홈페이지',
        '홈페이지',
        '네이버 카페',
        '홈페이지',
        '홈페이지',
        '홈페이지',
        '네이버 블로그',
        '영업종료',
        '홈페이지',
        '네이버 블로그',
        '홈페이지',
        '홈페이지',
        '홈페이지',
        '네이버 카페',
        '홈페이지',
        '홈페이지',
        '홈페이지',
        '홈페이지',
        '홈페이지',
        '홈페이지',
        '홈페이지',
        '네이버 블로그',
        '홈페이지',
        '홈페이지',
        '홈페이지',
        '홈페이지',
        '홈페이지',
        '홈페이지',
        '네이버 블로그',
        '홈페이지',
        '홈페이지 없음',
        '홈페이지',
        '네이버 카페',
        '홈페이지',
        '홈페이지',
        '홈페이지',
        '홈페이지',
        '홈페이지',
    ];

    private readonly sourceUrlList = [
        'https://smartstore.naver.com/chungwoonsporex',
        'https://blog.naver.com/swimzon',
        'https://www.nowonsc.kr/fmcs/52?action=read&action-value=618dfa314df3e6a5131f4002139c1b71',
        'https://thenhsports.modoo.at/?link=e4fmah9o',
        'https://www.instagram.com/eonbuk2022/',
        'https://poi-kyeongseo.com/bbs/board.php?bo_table=yp_program01&wr_id=1',
        'null',
        'https://dlentkaen.cafe24.com/bizdemo66872/mp2/mp2_sub10.php',
        'null',
        'https://www.dobongsiseol.or.kr/msport_center/intro/01.htm',
        'http://www.kumhosports.co.kr/support/index.php',
        'https://yeyak.dobongsiseol.or.kr/lecture/swimming.php?c_id=01&page_info=swimming&n_type=lecture',
        'https://blog.naver.com/swimfit_master',
        'https://www.syu.ac.kr/sportscenter/program/program-guide/',
        'https://www.nowonsc.kr/fmcs/52?page_size=20&exist_comment=&search_field=ALL&search_word=%EC%9B%94%EA%B3%84%EA%B5%AC%EB%AF%BC%EC%B2%B4%EC%9C%A1%EC%84%BC%ED%84%B0',
        'null',
        'https://blog.naver.com/qkrwngur2000',
        'https://www.youthcenter.or.kr/105',
        'http://www.marinsports.co.kr/',
        'https://www.gbcmc.or.kr/fmcs/72',
        'null',
        'https://www.gbcmc.or.kr/fmcs/66',
        'https://www.nanna.seoul.kr/swimming',
        'https://pf.kakao.com/_Hdzxmb',
        'https://www.gurosisul.or.kr/mod.asp?m=business&s=b04-3',
        'https://blog.naver.com/newjeongoksporex',
        'https://guronam.modoo.at/?link=6a3zmi1h',
        'https://www.gurosisul.or.kr/mod.asp?m=business&s=b07-3',
        'http://www.guro1318.org/sub02/sub01.php',
        'https://cafe.daum.net/SPORWELL',
        'https://www.gurosisul.or.kr/',
        'http://www.ddmy.or.kr/new/02_program/index_2_3.php',
        'http://www.happykd.or.kr/',
        'https://www.dfmc.kr:8443/course/sports/fmcs/39?page_size=20&page_size=20&document_category_srl=14&search_field=ALL&search_word=',
        'https://www.gocheok-sc.or.kr/',
        'http://www.communitycenter.or.kr/bbs/board.php?bo_table=story02',
        'https://www.jungnangimc.or.kr/html/01020300',
        'https://cafe.naver.com/myeonilsc',
        'http://www.royalsports.co.kr/theme/royal/html/business/swim.php',
        'http://www.mangwoo.kr/bbs/board.php?bo_table=B21&wr_id=1',
        'https://blog.naver.com/intwosports',
        'https://www.jungnangimc.or.kr/html/01010300',
        'https://jangwicho.sen.es.kr/184319/subMenu.do',
        'null',
        'http://www.korspo.co.kr/donam.php#tab5',
        'https://www.gongdan.go.kr/portal/bbs/B0000035/list.do?optn1=15&menuNo=400625',
        'https://www.gongdan.go.kr/portal/bbs/B0000035/list.do?optn1=08&menuNo=400284',
        'https://www.gongdan.go.kr/portal/bbs/B0000035/list.do?optn1=04&menuNo=400210',
        'null',
        'https://sports.happysd.or.kr/fmcs/198?document_category_srl=4&page_size=20&search_field=ALL&search_word=',
        'https://blog.naver.com/jinpyo74',
        'null',
        'https://s.gfmc.kr/html/sub1_3.php',
        'https://g.gfmc.kr/center/board/boardList.do',
        'http://sdyc.or.kr/main/ko/sub03_01.html',
        'https://sports.happysd.or.kr/fmcs/198?document_category_srl=2&page_size=20&search_field=ALL&search_word=',
        'https://sports.happysd.or.kr/fmcs/198?document_category_srl=5&page_size=20&search_field=ALL&search_word=',
        'https://sports.happysd.or.kr/fmcs/198?document_category_srl=9&page_size=20&search_field=ALL&search_word=',
        'https://sports.happysd.or.kr/fmcs/38',
        'http://www.singil.org/',
        'https://www.mullaeyouth.or.kr/bbs/content.php?co_id=swimEdu&pg=01',
        'https://blog.naver.com/swimfit_master',
        'https://www.y-sisul.or.kr/mod.asp?m=business&s=b03',
        'https://www.y-sisul.or.kr/mod.asp?m=business&s=a03',
        'https://dongbu.seoulwomanup.or.kr/dongbu/common/bbs/selectPageListBBS.do?bbs_code=B0454',
        'http://sporex.kr/',
        'https://www.gwangjin.or.kr/common/bbs/selectBbs.do?bbs_code=A1006&bbs_seq=1406&sch_type=&sch_text=&currentPage=1',
        'https://sports.idongjak.or.kr/home/29',
        'https://sports.idongjak.or.kr/home/171?center=DONGJAK01',
        'https://booking.gwangjin.or.kr/fmcs/102?document_category_srl=3&page_size=20&search_field=ALL&search_word=',
        'https://sports.idongjak.or.kr/home/61',
        'https://blog.naver.com/gwangjinfmc',
        'https://online.igangdong.or.kr/sindex.do?icode=4004',
        'http://www.jeongnip.or.kr/sub02/sub02.php#swim3_02_target',
        'https://www.davinsport.com/',
        'https://www.igangdong.or.kr/page/ch/ch_0101.asp',
        'http://www.kdsports.or.kr/',
        'https://seoulcbid.or.kr/',
        'https://www.ijongno.co.kr/www/136',
        'https://www.ijongno.co.kr/www/136',
        'https://www.ijongno.co.kr/www/136',
        'https://sl-ssc.co.kr/programs/swimming/',
        'http://www.peymca.or.kr/',
        'http://bongraesc.com/',
        'http://www.korspo.co.kr/seongdong.php#tab3',
        'http://seoulywca.alltheway.kr/?doc=sub_02',
        'https://www.e-junggu.or.kr/fmcs/56',
        'https://cheonggu.modoo.at/?link=xmh96737',
        'https://www.e-junggu.or.kr/fmcs/203',
        'https://cafe.naver.com/yongsanswimming',
        'https://www.hyochang.or.kr:6017/?c=loc&mcd=hcc0001d',
        'http://www.galwol.or.kr/community/view02.php?pkid=943',
        'null',
        'https://yssports.yong-san.or.kr/www/127',
        'https://www.ycs.or.kr/fmcs/27',
        'https://seobu.seoulwomanup.or.kr/seobu/common/bbs/selectBBS.do?bbs_seq=136361&bbs_code=B0450&bbs_type_code=10&bbs_type=&WrdNoticeAllValue=&reqUrl=&sch_type=&sch_text=&currentPage=1',
        'http://mokdong.aesiang.co.kr/class/swim_guide.htm',
        'null',
        'https://shingisporex.modoo.at/?link=9lcxw12c',
        'https://www.ycs.or.kr/fmcs/19',
        'http://www.ycymca.or.kr/sub02/sub01.php',
        'https://www.ycs.or.kr/fmcs/23',
        'http://www.wawa.or.kr/sub04/sub02_view.php?prdcode=2103220049&dep_code=109&dep2_code=&search_week=&searchopt=&searchkey=',
        'https://poi-kyeongseo.com/bbs/board.php?bo_table=yp_program02&wr_id=1',
        'https://sport.gssi.or.kr/page/prgGuide/05/',
        'null',
        'https://blog.naver.com/bata3012',
        'http://www.iyc.or.kr/sports_center/center_01.jsp?ver=b',
        'https://airswim.modoo.at/?link=9n8aav59',
        'https://blog.naver.com/superstarsignature',
        'https://sport.gssi.or.kr/page/prgGuide/01/',
        'https://kbsbiz.co.kr/course/%ec%88%98%ec%98%81/',
        'https://www.gwanakgongdan.or.kr/fmcs/1216',
        'http://www.srcsportscenter.com',
        'null',
        'http://ihspotown.com/gnu/sub_032.html',
        'http://www.phspo.com/phgrp/cnts/CntsFrntView.do?cntsId=CFV_2020000&menuNo=2020000',
        'https://www.ssleports.com/sports/program_time.php?cdCode=sccgsm&regCode=sccgsmad',
        'http://sportime.co.kr/?page_id=89',
        'https://www.sporex.com/sub_branch/list_v.php?number=12',
        'https://seocho.sporex.com/sub_intro2/program.php',
        'http://www.sigmasportsclub.com/main.php?m1=3&m2=53',
        'https://www.ksponco.or.kr/sports/menu.es?mid=a50204000000',
        'https://www.sgsc.or.kr/bbs/content.php?co_id=03_06_01',
        'https://mjsports.modoo.at/?link=arxzmull',
        'https://www.davinsport.com/',
        'http://www.korspo.co.kr/changcheon.php#tab5',
        'null',
        'https://www.davinsport.com/26/?q=YToxOntzOjEyOiJrZXl3b3JkX3R5cGUiO3M6MzoiYWxsIjt9&bmode=view&idx=15976625&t=board',
        'http://www.youthnaroo.or.kr/sub01/sub07-3.php',
        'http://yousungsports.com/',
        'https://blog.naver.com/woosungspo',
        'http://www.cyc.or.kr/sub/exercise/exercise01.asp?scrID=0000000223&pageNum=5&subNum=1&ssubNum=1',
        'http://igangdong.or.k',
        'http://soeuisc.com/',
        'http://www.purmesports.or.kr/',
        'https://www.mfac.or.kr/academy/msport.jsp',
        'https://www.esongpa.or.kr/',
        'https://blog.naver.com/kdy4966',
        'null',
        'https://cs.sscmc.or.kr/sdmcs/26',
        'https://blog.naver.com/dmcsports',
        'https://stadium.seoul.go.kr/',
        'http://www.youtra.or.kr/',
        'http://superville-sportsclub.co.kr/',
        'https://cafe.naver.com/swim119',
        'http://www.womansports.co.kr/program/yoga.asp',
        'https://life.gangnam.go.kr/fmcs/341',
        'https://www.gangnam.go.kr/office/gyyc/board/gyyc_21/list.do?mid=gyyc_swimming',
        'http://www.dycenter.com/',
        'https://ykasports.com/swim',
        'https://life.gangnam.go.kr/fmcs/301',
        'http://www.woori1318.or.kr/',
        'https://blog.naver.com/ejrl32',
        'http://www.sbsports.or.kr/community/01.php?ptype=view&idx=5529&page=1&code=notice&searchopt=subject&searchkey=%ED%94%84%EB%A1%9C%EA%B7%B8%EB%9E%A8',
        'https://jwswimming.modoo.at/?link=7yk2b5dn',
        'https://sports.idongjak.or.kr/home/105',
        'https://efmc.or.kr/fmcs/221',
        'http://www.kepcosc.or.kr/',
        'http://www.eonnamcscenter.com/',
        'https://blog.naver.com/sportsforkids01',
        'https://www.eptsports.or.kr/fmcs/178',
        'null',
        'https://www.gwanakgongdan.or.kr/fmcs/26',
        'https://m.cafe.naver.com/seoilsc',
        'https://www.gwanakgongdan.or.kr/fmcs/13',
        'https://seochosc.com/',
        'http://www.sinsasports.co.kr',
        'https://sammo.co.kr/',
        'http://www.seochoymca.com/',
    ];

    async findSourceUrl() {
        const seoulPoolDocs = await this.seoulPoolInfoModel.find().exec();

        if (
            seoulPoolDocs.length !== 170 ||
            this.sourceUrlTypeList.length !== 170 ||
            this.sourceUrlList.length !== 170
        ) {
            this.logger.error(
                `Row count mismatch. seoulPoolDocs=${seoulPoolDocs.length}, sourceUrlTypeList=${this.sourceUrlTypeList.length}, sourceUrlList=${this.sourceUrlList.length}`,
            );
            return;
        }

        for (let i = 0; i < 170; i++) {
            const doc = seoulPoolDocs[i];
            const typeRaw = this.sourceUrlTypeList[i]; // 예: "홈페이지", "네이버 블로그", etc
            const urlRaw = this.sourceUrlList[i];      // 예: "null", "https://..."

            // (A) source_url_type 매핑
            const mappedType = this.mapSourceUrlType(typeRaw);

            // (B) 영업 중 여부
            const isOperating = this.mapOperatingStatus(typeRaw);
            // "Y" or "N"

            // (C) source_url
            const finalUrl = (urlRaw === 'null') ? 'N' : urlRaw;

            // 문서에 새 프로퍼티를 추가
            doc['source_url_type'] = mappedType;
            doc['source_url'] = finalUrl;
            doc['is_operating'] = isOperating;

            // 영업종료 or 홈페이지 없음 인 경우 => source_url_type = "N"
            // -> 이미 mapSourceUrlType()에서 처리

            // (D) DB에 저장
            await doc.save();
            this.logger.log(
                `[${i}] Updated doc pool_code=${doc.pool_code}, source_url_type=${mappedType}, is_operating=${isOperating}, source_url=${finalUrl}`,
            );
        }

        this.logger.log('All docs updated successfully.');
    }

    mapSourceUrlType(type: string): string {
        switch (type) {
            case '홈페이지':
                return 'web';
            case '네이버 블로그':
                return 'naver_blog';
            case '네이버 카페':
                return 'naver_cafe';
            case '인스타그램':
                return 'instagram';
            case '카카오 채널':
                return 'kakao_channel';
            case '다음 카페':
                return 'daum_cafe';
            case '홈페이지 없음':
            case '영업종료':
                return 'N';
            default:
                return 'N'; // 혹시 예상치 못한 값도 일단 'N' 처리
        }
    }

    mapOperatingStatus(type: string): string {
        if (type === '영업종료' || type === '홈페이지 없음') {
            return 'N';
        }
        return 'Y';
    }
}
