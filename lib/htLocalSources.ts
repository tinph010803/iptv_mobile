export type HtSub = { name: string; url: string };
export type HtLocalEpisode = {
  name: string;
  link_m3u8: string;
  thumb_vtt?: string;
  skip_intro_url?: string;
  subs?: HtSub[];
};
export type HtLocalSource = {
  serverName: string;
  episodes: HtLocalEpisode[];
};

export type HtLocalMovie = {
  slug: string;
  title: string;
  title_en?: string;
  description?: string;
  poster_url: string;
  thumb_url?: string;
  year?: number;
  genres?: string[];
  country?: string;
  director?: string;
  actors?: string[];
  tmdb_id?: number;
  tmdb_type?: 'movie' | 'tv';
};

// Phim không có trên phimapi vẫn khai báo được metadata ở đây.
export const HT_LOCAL_MOVIES: Record<string, HtLocalMovie> = {
  'trai-buon-nguoi': {
    slug: 'trai-buon-nguoi',
    title: 'Trại Buôn Người',
    title_en: 'Trại Buôn Người',
    description:
      'Vì cứu em gái sa bẫy buôn người ở biên giới miền Tây, Ny (Steven Nguyễn) cùng bạn thân bị bắt làm nô dịch trong sào huyệt lừa đảo tàn bạo. Tại đây, họ cùng các trinh sát nằm vùng và các nạn nhân hứng chịu bi kịch thể xác âm thầm lập kế hoạch trốn thoát.',
    poster_url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRia6kCP4taj8yOVPOrAR5UZRvl-vG7rwwZdDpGubBW9EVp74hw_nlgqPDo&s=10',
    thumb_url: 'https://static-cgv.vncdn.vn/media/catalog/product/cache/3/image/1800x/71252117777b696995f01934522c402d/t/r/trailer_thumbnail.jpg',
    year: 2026,
    genres: ['Hành Động'],
    country: 'Việt Nam',
    director: 'Toni Dương Bảo Anh',
    actors: ['Steven Nguyễn', 'Quách Ngọc Ngoan', 'Huỳnh Minh Kiên', 'Tùng Mint'],
  },
};

// key = slug phim trong API
export const HT_LOCAL_SOURCES: Record<string, HtLocalSource[]> = {
  'trai-buon-nguoi': [
    {
      serverName: 'Vietsub [HT]',
      episodes: [
        {
          name: 'Full',
          link_m3u8: 'https://scontent.cdninstagram.com/o1/v/t2/f2/m366/AQNeZ0Yh_nV8EIETlIudseW32d2uVWeHRNE_Gx4yCV_M7Q-0yXJ3bvqBv3U7nuzgI0893QDtEBtR_a3YTvzG8QPLdhgVeK95eoTWIJzNU7gkAA.mp4?_nc_cat=101&_nc_oc=Adqe_klMaH_iWaLRotm9_j-EgYEZc4AtfubqF17rLOPFk0jFPpDCGYj5c46MbTGaOf54ADrt3N9ldArH2vpyDZkG&_nc_sid=5e9851&_nc_ht=scontent.fsgn5-6.fna.fbcdn.net&_nc_ohc=WCtq0_Iq5xkQ7kNvwEU6spx&efg=eyJ2ZW5jb2RlX3RhZyI6Inhwdl9wcm9ncmVzc2l2ZS5GQUNFQk9PSy4uQzMuMTI4MC5kYXNoX2gyNjQtYmFzaWMtZ2VuMl83MjBwIiwieHB2X2Fzc2V0X2lkIjoxNDQ3MTIwMzU3Mjk5NDg5LCJhc3NldF9hZ2VfZGF5cyI6MCwidmlfdXNlY2FzZV9pZCI6MTAxMjIsImR1cmF0aW9uX3MiOjc1MDksInVybGdlbl9zb3VyY2UiOiJ3d3cifQ==&ccb=17-1&vs=d2b6f5ef9b37ecb7&_nc_vs=HBksFQIYRWZiX2VwaGVtZXJhbC81QjhCOUQ1MThGMDc0NkVFOURFNzhDMjg0OEQwMkJGNl9tdF8xX3ZpZGVvX2Rhc2hpbml0Lm1wNBUAAsgBEgAVAhhAZmJfcGVybWFuZW50LzBEQzZBRUNFMjJBNjRFM0M4NTJEN0MzNkQxQkMwRjNCX2F1ZGlvX2Rhc2hpbml0Lm1wNBUCAsgBEgAoABgAGwKIB3VzZV9vaWwBMRJwcm9ncmVzc2l2ZV9yZWNpcGUBMRUAACbC1MDtvomSBRUCKAJDMywXQL1VR64UeuEYGWRhc2hfaDI2NC1iYXNpYy1nZW4yXzcyMHARAHUCZZSeAQA&_nc_gid=8DPAgN3NycVPRA4d0P6PNg&_nc_ss=702a8&_nc_map=urlgen_bucketless&_nc_zt=28&oh=00_AQOEQ7wCknX0yNpQC15SqvV1QsL-h-01e8_ATsUzHRMsuA&oe=6AC526C7&bitrate=861642&tag=dash_h264-',
        },
      ],
    },
  ],
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

  'tai-phiet-va-canh-sat-phan-2': [
    {
      serverName: 'Vietsub [HT]',
      episodes: [
        {
          name: 'Tập 1',
          link_m3u8: 'https://chophim.fun/public/m3u8/30469e3399c244f2b211848fbc865d83.m3u8',
          thumb_vtt: 'https://chophim.fun/api/storage/webvtt?file=30469e3399c244f2b211848fbc865d83.vtt',
          skip_intro_url: 'https://chophim.fun/api/skip-times?movie_slug=tai-phiet-va-canh-sat-phan-2&episode_slug=tap-1',
          subs: [
            {
              name: 'Tiếng Việt',
              url: 'https://chophim.fun/api/storage/subtitles?file=tai-phiet-va-canh-sat-phan-2-tap-1-1786684226838-72672283-tap_01_vietnamese.vtt',
            },
            {
              name: 'Tiếng Hàn',
              url: 'https://chophim.fun/api/storage/subtitles?file=tai-phiet-va-canh-sat-phan-2-tap-1-1786684068736-62748611-tap_01_korean.vtt',
            },
            {
              name: 'Tiếng Anh',
              url: 'https://chophim.fun/api/storage/subtitles?file=tai-phiet-va-canh-sat-phan-2-tap-1-1786684073823-4f142d3c-tap_01_english.vtt',
            },
            {
              name: 'Tiếng Trung',
              url: 'https://chophim.fun/api/storage/subtitles?file=tai-phiet-va-canh-sat-phan-2-tap-1-1786684086020-e635c5e5-tap_01_chinese.vtt',
            }

          ],
        },
      ],
    },
  ],
};