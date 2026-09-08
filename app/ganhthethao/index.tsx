import { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

import {
  Calendar,
  ChevronDown,
  ChevronLeft,
  Filter,
  Menu,
  Search,
  Trophy,
} from 'lucide-react-native';

/* =========================================================
   CONSTANTS
========================================================= */

const EPL_LOGO =
  'https://assets.football-logos.cc/logos/england/512x512/english-premier-league.b597f797.png';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const CARD_WIDTH = SCREEN_WIDTH * 0.82;
const CARD_SPACING = 12;
const SIDE_PADDING = 14;

/* =========================================================
   CAROUSEL
========================================================= */

const MATCHES = [
  { id: '1', image: 'https://i.ibb.co/TD8dPNDL/Vd2rk.jpg' },
  { id: '2', image: 'https://i.ibb.co/FLh85YwR/OKqm-Q.jpg' },
  { id: '3', image: 'https://i.ibb.co/tMMJ4HHp/ZGfw-O.jpg' },
];

/* =========================================================
   FOOTBALL-DATA.ORG
========================================================= */

const FOOTBALL_DATA_API_KEY = process.env.EXPO_PUBLIC_FOOTBALL_DATA_API_KEY;
const FOOTBALL_DATA_API_URL = 'https://api.football-data.org/v4';
const EPL_COMPETITION = 'PL';

/* =========================================================
   TYPES
========================================================= */

type FootballDataMatch = {
  id: number;
  utcDate: string;
  status: string;
  matchday?: number | null;

  competition: {
    id: number;
    name: string;
    code: string;
    emblem?: string | null;
  };

  season?: {
    id: number;
    startDate: string;
    endDate: string;
    currentMatchday?: number | null;
    winner?: unknown;
  };

  homeTeam: {
    id: number;
    name: string;
    shortName?: string;
    tla?: string;
    crest?: string;
  };

  awayTeam: {
    id: number;
    name: string;
    shortName?: string;
    tla?: string;
    crest?: string;
  };

  score: {
    winner?: string | null;
    duration?: string;
    fullTime: {
      home: number | null;
      away: number | null;
    };
    halfTime?: {
      home: number | null;
      away: number | null;
    };
  };
};

type FootballDataResponse = {
  filters?: Record<string, unknown>;

  resultSet?: {
    count?: number;
    competitions?: string;
    first?: string;
    last?: string;
    played?: number;
    wins?: number;
    draws?: number;
    losses?: number;
  };

  competition?: {
    id: number;
    name: string;
    code: string;
    type: string;
    emblem?: string;
  };

  matches?: FootballDataMatch[];
};

type FootballMatch = {
  match_id: string;
  match_date: string;
  status: string;

  league: {
    league_id: string;
    name: string;
    country: string;
    competition_name: string;
  };

  season?: {
    season_id: string;
    year: number;
  };

  home_team: {
    team_id: string;
    team_name: string;
    team_logo: string;
  };

  away_team: {
    team_id: string;
    team_name: string;
    team_logo: string;
  };

  score?: {
    home: number | null;
    away: number | null;
  };
};

/* =========================================================
   TAB PILL
========================================================= */

function TabPill({
  label,
  icon,
  active,
  hot,
  onPress,
}: {
  label: string;
  icon?: React.ReactNode;
  active?: boolean;
  hot?: boolean;
  onPress: () => void;
}) {
  if (hot && active) {
    return (
      <Pressable onPress={onPress}>
        <LinearGradient
          colors={['#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#B14DFF']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.tabPillHot}
        >
          {icon}
          <Text style={styles.tabPillTextActive}>{label}</Text>

          <View style={styles.hotBadge}>
            <Text style={styles.hotBadgeText}>HOT</Text>
          </View>
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      style={[styles.tabPill, active && styles.tabPillActive]}
    >
      {icon}
      <Text style={[styles.tabPillText, active && styles.tabPillTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

/* =========================================================
   MATCH CARD CAROUSEL
========================================================= */

function MatchCardCarousel() {
  const listRef = useRef<FlatList>(null);

  return (
    <FlatList
      ref={listRef}
      data={MATCHES}
      keyExtractor={(item) => item.id}
      horizontal
      showsHorizontalScrollIndicator={false}
      snapToInterval={CARD_WIDTH + CARD_SPACING}
      decelerationRate="fast"
      snapToAlignment="start"
      contentContainerStyle={{ paddingHorizontal: SIDE_PADDING }}
      ItemSeparatorComponent={() => <View style={{ width: CARD_SPACING }} />}
      renderItem={({ item }) => (
        <Pressable style={styles.card}>
          <Image
            source={{ uri: item.image }}
            style={styles.cardImage}
            contentFit="cover"
          />
        </Pressable>
      )}
    />
  );
}

/* =========================================================
   DATE
========================================================= */

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function formatDisplayDate(dateString: string) {
  const [year, month, day] = dateString.split('-');
  return `${day}/${month}/${year}`;
}

function formatMatchTime(dateString: string) {
  return new Date(dateString).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Ho_Chi_Minh',
  });
}

/* =========================================================
   STATUS
========================================================= */

function getMatchStatus(status: string) {
  const normalized = status?.toUpperCase().trim();

  if (normalized === 'FINISHED') return 'Kết thúc';
  if (normalized === 'PAUSED') return 'Nghỉ giữa hiệp';
  if (normalized === 'LIVE' || normalized === 'IN_PLAY') return 'Đang đá';
  if (normalized === 'POSTPONED') return 'Hoãn';
  if (normalized === 'CANCELLED') return 'Đã hủy';
  if (normalized === 'SUSPENDED') return 'Tạm dừng';

  return 'Sắp diễn ra';
}

function isLiveMatch(match: FootballMatch) {
  const status = match.status?.toUpperCase().trim();
  return status === 'LIVE' || status === 'IN_PLAY';
}

/* =========================================================
   DATE ITEMS
========================================================= */

const DATE_RANGE_DAYS = 14;

function getDateItems() {
  const dates = [];

  for (let i = 0; i < DATE_RANGE_DAYS; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);

    const dateString = formatDate(date);

    let day = '';

    if (i === 0) {
      day = 'Hôm nay';
    } else if (i === 1) {
      day = 'Ngày mai';
    } else {
      day = date.toLocaleDateString('vi-VN', { weekday: 'short' });
    }

    dates.push({
      date: dateString,
      day,
      number: `${String(date.getDate()).padStart(2, '0')}/${String(
        date.getMonth() + 1
      ).padStart(2, '0')}`,
    });
  }

  return dates;
}

/* =========================================================
   NORMALIZE MATCH
========================================================= */

function normalizeMatch(match: FootballDataMatch): FootballMatch {
  return {
    match_id: String(match.id),
    match_date: match.utcDate,
    status: match.status,

    league: {
      league_id: String(match.competition.id),
      name: match.competition.name || 'Premier League',
      country: 'England',
      competition_name: match.season
        ? `${new Date(match.season.startDate).getFullYear()}-${new Date(
            match.season.endDate
          ).getFullYear()}`
        : 'Premier League',
    },

    season: match.season
      ? {
          season_id: String(match.season.id),
          year: new Date(match.season.startDate).getFullYear(),
        }
      : undefined,

    home_team: {
      team_id: String(match.homeTeam.id),
      team_name: match.homeTeam.name,
      team_logo: match.homeTeam.crest || '',
    },

    away_team: {
      team_id: String(match.awayTeam.id),
      team_name: match.awayTeam.name,
      team_logo: match.awayTeam.crest || '',
    },

    score: {
      home: match.score.fullTime.home,
      away: match.score.fullTime.away,
    },
  };
}

/* =========================================================
   MATCH SECTION
========================================================= */

function MatchSection() {
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
  const [fixtures, setFixtures] = useState<FootballMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dateScrollRef = useRef<ScrollView>(null);

  /* =====================================================
     FETCH
  ===================================================== */

  useEffect(() => {
    fetchFixtures(selectedDate);
  }, [selectedDate]);

  async function fetchFixtures(date: string) {
    if (!FOOTBALL_DATA_API_KEY) {
      setError('Chưa tìm thấy EXPO_PUBLIC_FOOTBALL_DATA_API_KEY');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const url =
        `${FOOTBALL_DATA_API_URL}` +
        `/competitions/${EPL_COMPETITION}/matches` +
        `?dateFrom=${date}` +
        `&dateTo=${date}`;

      console.log('Football-data URL:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-Auth-Token': FOOTBALL_DATA_API_KEY,
          Accept: 'application/json',
        },
      });

      const data: FootballDataResponse = await response.json();

      console.log('Football-data response:', data);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${JSON.stringify(data)}`);
      }

      const events = Array.isArray(data.matches) ? data.matches : [];

      console.log('Total matches:', events.length);

      const matches = events.map(normalizeMatch);

      matches.sort(
        (a, b) =>
          new Date(a.match_date).getTime() - new Date(b.match_date).getTime()
      );

      console.log(`Matches for ${date}:`, matches.length);

      console.log(
        'Matches:',
        matches.map((match) => ({
          id: match.match_id,
          home: match.home_team.team_name,
          away: match.away_team.team_name,
          time: match.match_date,
          status: match.status,
        }))
      );

      setFixtures(matches);
    } catch (err) {
      console.error('Football-data error:', err);

      setFixtures([]);
      setError(
        err instanceof Error ? err.message : 'Không thể tải lịch thi đấu'
      );
    } finally {
      setLoading(false);
    }
  }

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <View style={styles.matchesSection}>
      {/* HEADER */}
      <View style={styles.matchesHeader}>
        <View style={styles.matchesTitleRow}>
          <View style={styles.matchesTitleIcon}>
            <Calendar size={17} color="#fff" />
          </View>
          <Text style={styles.matchesTitle}>Trận đấu</Text>
        </View>

        <Pressable style={styles.filterButton}>
          <Filter size={15} color="#AFC0EE" />
          <Text style={styles.filterText}>Bộ lọc</Text>
          <ChevronDown size={14} color="#AFC0EE" />
        </Pressable>
      </View>

      {/* DATE */}
      <ScrollView
        ref={dateScrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.dateRow}
      >
        {getDateItems().map((item) => {
          const active = item.date === selectedDate;

          return (
            <Pressable
              key={item.date}
              onPress={() => setSelectedDate(item.date)}
              style={[styles.dateItem, active && styles.dateItemActive]}
            >
              <Text style={active ? styles.dateDayActive : styles.dateDay}>
                {item.day}
              </Text>
              <Text
                style={active ? styles.dateNumberActive : styles.dateNumber}
              >
                {item.number}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* LEAGUE */}
      <View style={styles.leagueHeader}>
        <View style={styles.leagueLeft}>
          <Image
            source={{ uri: EPL_LOGO }}
            style={styles.leagueLogo}
            contentFit="contain"
          />
          <View>
            <Text style={styles.leagueName}>Ngoại hạng Anh</Text>
            <Text style={styles.leagueRound}>
              {fixtures[0]?.league?.competition_name || 'Premier League'}
            </Text>
          </View>
        </View>

        <ChevronDown size={17} color="#7186B9" />
      </View>

      {/* LOADING */}
      {loading && (
        <View style={styles.emptyMatch}>
          <Text style={styles.emptyMatchText}>Đang tải lịch thi đấu...</Text>
        </View>
      )}

      {/* ERROR */}
      {!loading && error && (
        <View style={styles.emptyMatch}>
          <Calendar size={24} color="#FF7B7B" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* EMPTY */}
      {!loading && !error && fixtures.length === 0 && (
        <View style={styles.emptyMatch}>
          <Calendar size={24} color="#52699F" />
          <Text style={styles.emptyMatchText}>Không có trận đấu nào</Text>
          <Text style={styles.emptyMatchSubText}>
            trong ngày {formatDisplayDate(selectedDate)}
          </Text>
        </View>
      )}

      {/* MATCH LIST */}
      {!loading && !error && fixtures.length > 0 && (
        <View style={styles.matchList}>
          {fixtures.map((match) => {
            const homeScore = match.score?.home;
            const awayScore = match.score?.away;
            const status = getMatchStatus(match.status);
            const isLive = isLiveMatch(match);

            return (
              <Pressable key={match.match_id} style={styles.matchItem}>
                {/* TIME */}
                <View style={styles.matchTime}>
                  <Text style={styles.matchTimeText}>
                    {formatMatchTime(match.match_date)}
                  </Text>
                  <Text
                    style={[
                      styles.matchStatus,
                      isLive && styles.matchStatusLive,
                    ]}
                  >
                    {status}
                  </Text>
                </View>

                {/* TEAMS */}
                <View style={styles.teamsContainer}>
                  {/* HOME */}
                  <View style={styles.teamRow}>
                    <Image
                      source={{ uri: match.home_team.team_logo }}
                      style={styles.teamLogo}
                      contentFit="contain"
                    />
                    <Text style={styles.teamName} numberOfLines={1}>
                      {match.home_team.team_name}
                    </Text>
                    <Text style={styles.teamScore}>{homeScore ?? '-'}</Text>
                  </View>

                  {/* AWAY */}
                  <View style={styles.teamRow}>
                    <Image
                      source={{ uri: match.away_team.team_logo }}
                      style={styles.teamLogo}
                      contentFit="contain"
                    />
                    <Text style={styles.teamName} numberOfLines={1}>
                      {match.away_team.team_name}
                    </Text>
                    <Text style={styles.teamScore}>{awayScore ?? '-'}</Text>
                  </View>
                </View>

                {/* ARROW */}
                <ChevronLeft
                  size={18}
                  color="#52699F"
                  style={styles.matchArrow}
                />
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

/* =========================================================
   SPORTS HEADER
========================================================= */

export function SportsHeader() {
  const router = useRouter();

  const [tab, setTab] = useState<'tong-hop' | 'epl' | 'vleague'>('epl');

  return (
    <View style={styles.wrapper}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        {/* HEADER */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.iconBtn}>
            <ChevronLeft size={22} color="#fff" />
          </Pressable>

          <Text style={styles.headerTitle}>Thể thao</Text>

          <Pressable style={styles.iconBtn}>
            <Search size={20} color="#fff" />
          </Pressable>
        </View>

        {/* TABS */}
        <View style={styles.tabsRow}>
          <TabPill
            label="Tổng hợp"
            icon={<Text style={styles.tabPillEmoji}>🏸</Text>}
            active={tab === 'tong-hop'}
            onPress={() => setTab('tong-hop')}
          />

          <TabPill
            label="Ngoại hạng Anh"
            icon={
              <Image
                source={{ uri: EPL_LOGO }}
                style={styles.tabPillLogo}
                contentFit="contain"
              />
            }
            hot
            active={tab === 'epl'}
            onPress={() => setTab('epl')}
          />

          <TabPill
            label="V.League"
            icon={<Trophy size={13} color="#FF4D4D" fill="#FF4D4D" />}
            active={tab === 'vleague'}
            onPress={() => setTab('vleague')}
          />

          <Pressable style={styles.menuBtn}>
            <Menu size={18} color="#fff" />
          </Pressable>
        </View>
      </SafeAreaView>

      {/* CAROUSEL */}
     <ScrollView showsVerticalScrollIndicator={false}>
        {/* CAROUSEL */}
        <View style={styles.carouselWrap}>
          <MatchCardCarousel />
        </View>

        {/* MATCHES */}
        <MatchSection />
      </ScrollView>
    </View>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  wrapper: {
     flex: 1,
    backgroundColor: '#0A1642',
  },

  safeArea: {
    backgroundColor: 'transparent',
  },

  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },

  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },

  iconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },

  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
    paddingBottom: 10,
  },

  tabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#152A62',
  },

  tabPillActive: {
    backgroundColor: '#22347A',
  },

  tabPillHot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    paddingRight: 14,
    borderRadius: 16,
  },

  tabPillEmoji: {
    fontSize: 12,
  },

  tabPillLogo: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },

  tabPillText: {
    color: '#AFC0EE',
    fontSize: 12,
    fontWeight: '600',
  },

  tabPillTextActive: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },

  hotBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#FF4D4D',
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: '#0F1F4D',
  },

  hotBadgeText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '800',
  },

  menuBtn: {
    marginLeft: 'auto',
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },

  carouselWrap: {
    paddingTop: 8,
    paddingBottom: 12,
  },

  card: {
    width: CARD_WIDTH,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#152A62',
  },

  cardImage: {
    width: '100%',
    aspectRatio: 375 / 220,
  },

  /* =================================================
     MATCHES
  ================================================= */

  matchesSection: {
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 24,
  },

  matchesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },

  matchesTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  matchesTitleIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: '#22347A',
    alignItems: 'center',
    justifyContent: 'center',
  },

  matchesTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },

  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#152A62',
  },

  filterText: {
    color: '#AFC0EE',
    fontSize: 11,
    fontWeight: '600',
  },

  dateRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
    paddingRight: 4,
  },

  dateItem: {
    width: 62,
    minHeight: 54,
    borderRadius: 12,
    backgroundColor: '#152A62',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },

  dateItemActive: {
    backgroundColor: '#22347A',
    borderColor: '#4D96FF',
  },

  dateDay: {
    color: '#7186B9',
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 3,
  },

  dateNumber: {
    color: '#AFC0EE',
    fontSize: 12,
    fontWeight: '700',
  },

  dateDayActive: {
    color: '#8FB8FF',
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 3,
  },

  dateNumberActive: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },

  leagueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#152A62',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopLeftRadius: 13,
    borderTopRightRadius: 13,
  },

  leagueLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },

  leagueLogo: {
    width: 28,
    height: 28,
  },

  leagueName: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },

  leagueRound: {
    color: '#7186B9',
    fontSize: 9,
    marginTop: 2,
  },

  matchList: {
    backgroundColor: '#111F50',
    borderBottomLeftRadius: 13,
    borderBottomRightRadius: 13,
    overflow: 'hidden',
  },

  matchItem: {
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#263A70',
  },

  matchTime: {
    width: 62,
    alignItems: 'center',
    justifyContent: 'center',
  },

  matchTimeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },

  matchStatus: {
    color: '#7186B9',
    fontSize: 8,
    marginTop: 4,
  },

  matchStatusLive: {
    color: '#FF5C5C',
    fontWeight: '800',
  },

  teamsContainer: {
    flex: 1,
    gap: 6,
    marginLeft: 5,
  },

  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },

  teamLogo: {
    width: 25,
    height: 25,
    marginRight: 8,
  },

  teamName: {
    flex: 1,
    color: '#DCE6FF',
    fontSize: 11,
    fontWeight: '600',
  },

  teamScore: {
    width: 18,
    textAlign: 'center',
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },

  matchArrow: {
    transform: [{ rotate: '180deg' }],
    marginLeft: 5,
  },

  emptyMatch: {
    backgroundColor: '#111F50',
    minHeight: 120,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomLeftRadius: 13,
    borderBottomRightRadius: 13,
    paddingHorizontal: 20,
  },

  emptyMatchText: {
    color: '#AFC0EE',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },

  emptyMatchSubText: {
    color: '#52699F',
    fontSize: 10,
    marginTop: 4,
  },

  errorText: {
    color: '#FF7B7B',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 8,
  },
});

export default SportsHeader;