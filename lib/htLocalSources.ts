export type HtSub = { name: string; url: string };
export type HtLocalEpisode = {
  name: string;
  link_m3u8: string;
  subs?: HtSub[];
};
export type HtLocalSource = {
  serverName: string;
  episodes: HtLocalEpisode[];
};

// key = slug phim trong API
export const HT_LOCAL_SOURCES: Record<string, HtLocalSource[]> = {
  'quai-thu-vo-hinh-vung-dat-chet-choc': [
    {
      serverName: 'Vietsub [HT]',
      episodes: [
        {
          name: 'Full',
          link_m3u8:
            'https://gota.edgecontent.site/m3u8/cdn_0_onflix_0/3f81d1b6c3da0568e0d2921969944873.m3u8?exp=1790738647&token=_iGPLYwwZAja-ZjzaSyRvdzlulqpq2Az-EngeyhzwNbGOSGWrF3ePOzknGzUdFoW7X0jTMAm',
          subs: [
            {
              name: 'Tiếng Việt (Vietnamese)',
              url: 'https://m-center.onflixcdn.com/content/06032026/36f0f72f-a222-4c4f-90e7-01f5465dd26a.vtt',
            },
            {
              name: 'Tiếng Anh (English)',
              url: 'https://m-center.onflixcdn.com/content/06032026/17edfced-15a7-4dcd-9606-d7693c2bd7bc.vtt',
            },
          ],
        },
      ],
    },
  ],

  // 👇 THÊM PHIM MỚI Ở ĐÂY
  'nguoi-nhen-khong-con-nha': [
    {
      serverName: 'Vietsub [HT]',
      episodes: [
        {
          name: 'Full',
          link_m3u8: 'https://gota.edgecontent.site/1080p/f31406f28fd108affa9ba88dbca22313.m3u8?exp=1790741159&token=_iGPLYwwZAja-ZjzaSyRvdzlulqpq2Az-EngeyhzwNbGPiiRrVM8SIBoKli7go6ns-bLEABx',
          subs: [
            {
              name: 'Tiếng Việt (Vietnamese)',
              url: 'https://m-center.onflixcdn.com/content/09082026/8a178ae4-a9eb-4db3-8855-aafd8045a680.vtt',
            },
            {
              name: 'Tiếng Anh (English)',
              url: 'https://m-center.onflixcdn.com/content/09082026/0bec2433-a895-494c-9167-0f5b2b3dcd4f.vtt',
            },
          ],
        },
      ],
    },
  ],
};