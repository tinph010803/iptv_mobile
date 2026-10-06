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

};