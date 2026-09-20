import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Dimensions,
  findNodeHandle,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  UIManager,
  View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import * as NavigationBar from 'expo-navigation-bar';
import * as ScreenOrientation from 'expo-screen-orientation';

import {
  Building2,
  Calendar,
  ChevronLeft,
  Filter,
  History,
  MoreHorizontal,
  Play,
  Radio,
  Search,
  SquarePlay,
  Tv,
  X,
} from 'lucide-react-native';

import { CalendarPickerModal } from './CalendarPickerModal';
import { MenuPopover, type MenuPopoverItem } from './MenuPopover';
import vleagueSchedule from './livh_vleague.json';

/* =========================================================
   CONSTANTS
========================================================= */

const EPL_LOGO =
  'https://assets.football-logos.cc/logos/england/512x512/english-premier-league.b597f797.png';
const UCL_LOGO =
  'https://assets.football-logos.cc/logos/tournaments/512x512/uefa-champions-league.effc906c.png';
const VLEAGUE_LOGO =
  'https://cdn.fstats.ai/fbs/fstat/1788421501469_compressed.png';
const LALIGA_LOGO =
  'https://assets.football-logos.cc/logos/spain/512x512/la-liga.0ea0b0c5.png';
const BUNDESLIGA_LOGO =
  'https://assets.football-logos.cc/logos/germany/512x512/bundesliga.24d9c6f9.png';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const CARD_WIDTH = SCREEN_WIDTH * 0.82;
const CARD_SPACING = 12;
const SIDE_PADDING = 14;

// Mỗi lần hiển thị đúng 1 tuần (Thứ 2 -> Chủ nhật), vd 07/09 -> 13/09,
// tuần kế tiếp tự động là 14/09 -> 20/09.
const WINDOW_DAYS = 7;
const CALENDAR_PICK_DAYS = 60;

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
const UCL_COMPETITION = 'CL';
const LALIGA_COMPETITION = 'PD';
const BUNDESLIGA_COMPETITION = 'BL1';

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

type VLeagueMatch = {
  matchId: number;
  leagueNameShort: string;
  roundName: string;
  matchStartDate: string;
  matchStatus: number;
  team1Id: number;
  team1Name: string;
  team1Logo: string;
  team1TotalGoal: number | null;
  team2Id: number;
  team2Name: string;
  team2Logo: string;
  team2TotalGoal: number | null;
};

type VLeagueSchedule = {
  schedule: Array<{ matchInfoDTOList: VLeagueMatch[] }>;
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

type MatchSectionHandle = {
  scrollToToday: () => void;
};

type FootballCompetition = 'epl' | 'ucl' | 'laliga' | 'bundesliga' | 'vleague';

function getCompetitionCode(competition: Exclude<FootballCompetition, 'vleague'>) {
  switch (competition) {
    case 'ucl':
      return UCL_COMPETITION;
    case 'laliga':
      return LALIGA_COMPETITION;
    case 'bundesliga':
      return BUNDESLIGA_COMPETITION;
    default:
      return EPL_COMPETITION;
  }
}

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
   DATE HELPERS
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

function parseDateStr(dateString: string) {
  const [y, m, d] = dateString.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(base: Date, amount: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + amount);
  return d;
}

function getMonday(date: Date) {
  const d = new Date(date);
  const day = d.getDay(); // 0 = CN
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

const WEEKDAY_SHORT = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const WEEKDAY_FULL = [
  'Chủ nhật',
  'Thứ hai',
  'Thứ ba',
  'Thứ tư',
  'Thứ năm',
  'Thứ sáu',
  'Thứ bảy',
];

function buildDateItem(date: Date) {
  return {
    date: formatDate(date),
    day: WEEKDAY_SHORT[date.getDay()],
    number: `${String(date.getDate()).padStart(2, '0')}/${String(
      date.getMonth() + 1
    ).padStart(2, '0')}`,
  };
}

function getWeekItems(weekStart: Date) {
  const items = [];
  for (let i = 0; i < 7; i++) {
    items.push(buildDateItem(addDays(weekStart, i)));
  }
  return items;
}

function getSectionDates(start: Date, count: number) {
  const items: string[] = [];
  for (let i = 0; i < count; i++) {
    items.push(formatDate(addDays(start, i)));
  }
  return items;
}

function formatFullDateLabel(dateString: string) {
  const date = parseDateStr(dateString);
  return `${WEEKDAY_FULL[date.getDay()]}, ${date.getDate()} tháng ${date.getMonth() + 1
    }`;
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

function isOldMatch(match: FootballMatch, now: Date) {
  const highlightTime = new Date(match.match_date).getTime() + 2 * 60 * 60 * 1000;
  return now.getTime() >= highlightTime;
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

function normalizeVLeagueMatch(event: VLeagueMatch): FootballMatch {
  const normalizedStatus = event.matchStatus === 2
    ? 'FINISHED'
    : event.matchStatus === 5
      ? 'POSTPONED'
      : 'SCHEDULED';

  return {
    match_id: String(event.matchId),
    match_date: event.matchStartDate,
    status: normalizedStatus,
    league: {
      league_id: '46',
      name: event.leagueNameShort,
      country: 'Vietnam',
      competition_name: event.roundName,
    },
    season: { season_id: '2026-2027', year: 2026 },
    home_team: {
      team_id: String(event.team1Id),
      team_name: event.team1Name,
      team_logo: event.team1Logo,
    },
    away_team: {
      team_id: String(event.team2Id),
      team_name: event.team2Name,
      team_logo: event.team2Logo,
    },
    score: {
      home: event.team1TotalGoal,
      away: event.team2TotalGoal,
    },
  };
}

function getVLeagueMatches() {
  const data = vleagueSchedule as VLeagueSchedule;
  return data.schedule.flatMap((round) => round.matchInfoDTOList);
}

/* =========================================================
   MATCH SECTION
========================================================= */

const MatchSection = forwardRef<
  MatchSectionHandle,
  {
    scrollViewRef: React.RefObject<ScrollView | null>;
    competition: FootballCompetition;
    onSelectedDateChange?: (selected: string, today: string) => void;
  }
>(function MatchSection({ scrollViewRef, competition, onSelectedDateChange }, ref) {
  const today = useMemo(() => startOfDay(new Date()), []);
  const todayStr = formatDate(today);

  const [windowStart, setWindowStart] = useState(today);
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [fixturesByDate, setFixturesByDate] = useState<
    Record<string, FootballMatch[]>
  >({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [liveNow, setLiveNow] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [calendarVisible, setCalendarVisible] = useState(false);
  const calendarBtnRef = useRef<View>(null);
  const [calendarAnchorTop, setCalendarAnchorTop] = useState(96);
  const [pendingScrollDate, setPendingScrollDate] = useState<string | null>(
    null
  );

  const dayRefs = useRef<Record<string, any>>({});

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  function openCalendar() {
    calendarBtnRef.current?.measureInWindow((x, y, width, height) => {
      setCalendarAnchorTop(y + height + 8);
      setCalendarVisible(true);
    });
  }

  const weekItems = useMemo(
    () => getWeekItems(getMonday(windowStart)),
    [windowStart]
  );

  const sectionDates = useMemo(
    () => getSectionDates(getMonday(windowStart), WINDOW_DAYS),
    [windowStart]
  );

  /* =====================================================
     FETCH KHOẢNG NGÀY ĐANG XEM
  ===================================================== */

  useEffect(() => {
    fetchWindow(windowStart);
  }, [windowStart, competition]);

  async function fetchWindow(start: Date) {
    if (competition !== 'vleague' && !FOOTBALL_DATA_API_KEY) {
      setError('Chưa tìm thấy EXPO_PUBLIC_FOOTBALL_DATA_API_KEY');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const weekStart = getMonday(start);
      const dateFrom = formatDate(weekStart);
      const dateTo = formatDate(addDays(weekStart, WINDOW_DAYS - 1));

      let matches: FootballMatch[];

      if (competition === 'vleague') {
        const events = getVLeagueMatches();
        matches = events
          .filter((event) => {
            const eventDate = formatDate(new Date(event.matchStartDate));
            return eventDate >= dateFrom && eventDate <= dateTo;
          })
          .map(normalizeVLeagueMatch);
      } else {
        const competitionCode = getCompetitionCode(competition);
        const url =
          `${FOOTBALL_DATA_API_URL}` +
          `/competitions/${competitionCode}/matches` +
          `?dateFrom=${dateFrom}` +
          `&dateTo=${dateTo}`;
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'X-Auth-Token': FOOTBALL_DATA_API_KEY as string,
            Accept: 'application/json',
          },
        });
        const data: FootballDataResponse = await response.json();
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${JSON.stringify(data)}`);
        }
        const events = Array.isArray(data.matches) ? data.matches : [];
        matches = events.map(normalizeMatch);
      }

      const grouped: Record<string, FootballMatch[]> = {};

      matches.forEach((match) => {
        const dateKey = formatDate(new Date(match.match_date));
        if (!grouped[dateKey]) grouped[dateKey] = [];
        grouped[dateKey].push(match);
      });

      Object.values(grouped).forEach((list) =>
        list.sort(
          (a, b) =>
            new Date(a.match_date).getTime() -
            new Date(b.match_date).getTime()
        )
      );

      setFixturesByDate(grouped);

   
    } catch (err) {
      console.error('Football-data error:', err);
      setFixturesByDate({});
      setError(
        err instanceof Error ? err.message : 'Không thể tải lịch thi đấu'
      );
    } finally {
      setLoading(false);
    }
  }

  /* =====================================================
     CHECK LIVE (độc lập với ngày đang xem)
  ===================================================== */

  useEffect(() => {
    if (competition !== 'vleague' && !FOOTBALL_DATA_API_KEY) return;

    let cancelled = false;

    async function checkLive() {
      try {
        let matches: FootballMatch[] = [];
        if (competition === 'vleague') {
          const events = getVLeagueMatches();
          matches = events
            .filter((event) => formatDate(new Date(event.matchStartDate)) === todayStr)
            .map(normalizeVLeagueMatch);
        } else {
          const competitionCode = getCompetitionCode(competition);
          const url =
            `${FOOTBALL_DATA_API_URL}` +
            `/competitions/${competitionCode}/matches` +
            `?dateFrom=${todayStr}` +
            `&dateTo=${todayStr}`;
          const response = await fetch(url, {
            headers: {
              'X-Auth-Token': FOOTBALL_DATA_API_KEY as string,
              Accept: 'application/json',
            },
          });
          const data: FootballDataResponse = await response.json();
          const events = Array.isArray(data.matches) ? data.matches : [];
          matches = events.map(normalizeMatch);
        }
        const anyLive = matches.some(isLiveMatch);

        if (!cancelled) setLiveNow(anyLive);
      } catch {
        // lỗi mạng thì giữ nguyên trạng thái Live hiện tại
      }
    }

    checkLive();
    const interval = setInterval(checkLive, 60000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [todayStr, competition]);

  /* =====================================================
     CUỘN TỚI NGÀY
  ===================================================== */
  function requestScroll(dateStr: string) {
    requestAnimationFrame(() => {
      const node = dayRefs.current[dateStr];
      const scrollView = scrollViewRef?.current;

      if (!node || !scrollView) return;

      const nodeHandle = findNodeHandle(node);
      const scrollHandle = findNodeHandle(scrollView);

      if (nodeHandle == null || scrollHandle == null) return;

      UIManager.measureLayout(
        nodeHandle,
        scrollHandle,
        () => {
          // đo lỗi -> bỏ qua, không cuộn
        },
        (_left: number, top: number) => {
          scrollView.scrollTo({ y: Math.max(top - 12, 0), animated: true });
        }
      );
    });
  }

  function scrollToDate(dateStr: string) {
    setSelectedDate(dateStr);

    if (sectionDates.includes(dateStr)) {
      requestScroll(dateStr);
      return;
    }

    // Ngày nằm ngoài khoảng đang tải -> dời khoảng tải về đúng ngày đó
    setPendingScrollDate(dateStr);
    setWindowStart(parseDateStr(dateStr));
  }

  useEffect(() => {
    if (
      pendingScrollDate &&
      !loading &&
      sectionDates.includes(pendingScrollDate)
    ) {
      requestScroll(pendingScrollDate);
      setPendingScrollDate(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingScrollDate, sectionDates, loading]);

  useEffect(() => {
    onSelectedDateChange?.(selectedDate, todayStr);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  useImperativeHandle(ref, () => ({
    scrollToToday: () => scrollToDate(todayStr),
  }));

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <View style={styles.matchesSection}>
      {/* TOP BAR: Live + Calendar + tuần hiện tại + Filter */}
      <View style={styles.topBar}>
        <View style={styles.liveBadge}>
          <View style={[styles.liveDot, liveNow && styles.liveDotActive]} />
          <Text style={[styles.liveText, liveNow && styles.liveTextActive]}>
            Live
          </Text>
        </View>

        <Pressable
          ref={calendarBtnRef}
          style={styles.calendarBtn}
          onPress={openCalendar}
        >
          <Calendar size={16} color="#AFAFAF" />
        </Pressable>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.dateScroll}
          contentContainerStyle={styles.dateScrollContent}
        >
          {weekItems.map((item) => {
            const active = item.date === selectedDate;
            const isToday = item.date === todayStr;

            return (
              <Pressable
                key={item.date}
                onPress={() => scrollToDate(item.date)}
                style={[styles.dateTab, active && styles.dateTabActive]}
              >
                <Text
                  style={[
                    styles.dateTabDay,
                    active && styles.dateTabDayActive,
                    isToday && styles.dateTabToday,
                  ]}
                >
                  {item.day}
                </Text>
                <Text
                  style={[
                    styles.dateTabNumber,
                    active && styles.dateTabNumberActive,
                    isToday && styles.dateTabToday,
                  ]}
                >
                  {item.number}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.topBarDivider} />

        <Pressable style={styles.filterBtn}>
          <Filter size={14} color="#AFAFAF" />
          <Text style={styles.filterBtnText}>Lọc</Text>
        </Pressable>
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

      {/* DANH SÁCH NHIỀU NGÀY — chỉ in ra những ngày có trận, ngày trống bỏ qua */}
      {!loading && !error && (
        <View>
          {(fixturesByDate[selectedDate]?.length ?? 0) === 0 && (
            <Text style={styles.noScheduleText}>
              Không có trận đấu nào diễn ra trong hôm nay
            </Text>
          )}

          {sectionDates
            .filter((dateStr) => (fixturesByDate[dateStr]?.length ?? 0) > 0)
            .map((dateStr) => {
              const dayMatches = fixturesByDate[dateStr] || [];

              return (
                <View
                  key={dateStr}
                  ref={(node) => {
                    dayRefs.current[dateStr] = node;
                  }}
                >
                  <Text style={styles.dayHeader}>
                    {formatFullDateLabel(dateStr)}
                  </Text>

                  <View style={styles.matchList}>
                    {dayMatches.map((match) => {
                      const homeScore = match.score?.home;
                      const awayScore = match.score?.away;
                      const isLive = isLiveMatch(match);
                      const isOld = isOldMatch(match, now);
                      const hasScore =
                        homeScore !== null &&
                        homeScore !== undefined &&
                        awayScore !== null &&
                        awayScore !== undefined;

                      return (
                        <Pressable
                          key={match.match_id}
                          style={styles.matchItem}
                        >
                          {/* TIME */}
                          <View style={styles.matchTime}>
                            <Text style={styles.matchTimeText}>
                              {formatMatchTime(match.match_date)}
                            </Text>
                            {isLive && (
                              <Text style={styles.matchStatusLive}>
                                Đang đá
                              </Text>
                            )}
                          </View>

                          {/* TEAMS */}
                          <View style={styles.teamsContainer}>
                            <View style={styles.teamRow}>
                              <Image
                                source={{ uri: match.home_team.team_logo }}
                                style={styles.teamLogo}
                                contentFit="contain"
                              />
                              <Text style={styles.teamName} numberOfLines={1}>
                                {match.home_team.team_name}
                              </Text>
                              {hasScore && (
                                <Text style={styles.teamScore}>
                                  {homeScore}
                                </Text>
                              )}
                            </View>

                            <View style={styles.teamRow}>
                              <Image
                                source={{ uri: match.away_team.team_logo }}
                                style={styles.teamLogo}
                                contentFit="contain"
                              />
                              <Text style={styles.teamName} numberOfLines={1}>
                                {match.away_team.team_name}
                              </Text>
                              {hasScore && (
                                <Text style={styles.teamScore}>
                                  {awayScore}
                                </Text>
                              )}
                            </View>
                          </View>

                          <Pressable
                            style={styles.matchAction}
                            accessibilityRole="button"
                            accessibilityLabel={
                              isOld
                                ? `Xem highlight trận ${match.home_team.team_name} và ${match.away_team.team_name}`
                                : `Xem trận ${match.home_team.team_name} và ${match.away_team.team_name}`
                            }
                          >
                            {isOld ? (
                              <SquarePlay size={22} color="#FF6B57" />
                            ) : (
                              <Play size={22} color="#FFFFFF" />
                            )}
                          </Pressable>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              );
            })}
        </View>
      )}

      {/* MODAL CHỌN NGÀY — tách riêng ở CalendarPickerModal.tsx */}
      <CalendarPickerModal
        visible={calendarVisible}
        onClose={() => setCalendarVisible(false)}
        selectedDate={selectedDate}
        onSelectDate={scrollToDate}
        maxDate={formatDate(addDays(today, CALENDAR_PICK_DAYS - 1))}
        anchorTop={calendarAnchorTop}
      />
    </View>
  );
});

/* =========================================================
   SPORTS HEADER
========================================================= */

export function SportsHeader() {
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);
  const matchSectionRef = useRef<MatchSectionHandle>(null);

  const [tab, setTab] = useState<FootballCompetition>('epl');
  const [showBackToToday, setShowBackToToday] = useState(false);

  // Popover 2: mở từ nút "..." — Bảng xếp hạng / Truyền hình
  const [moreMenuVisible, setMoreMenuVisible] = useState(false);
  const [moreMenuAnchor, setMoreMenuAnchor] = useState({ top: 50, right: 44 });
  const moreMenuBtnRef = useRef<View>(null);

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS === 'web') return;

      ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.PORTRAIT_UP
      ).catch(() => {});

      if (Platform.OS === 'android') {
        NavigationBar.setVisibilityAsync('visible').catch(() => {});
      }
    }, [])
  );

  // Đo vị trí thật của nút bấm trên màn hình rồi đặt popover ngay dưới nó,
  // thay vì đoán toạ độ cố định (toạ độ cố định dễ bị lệch do chiều cao
  // status bar khác nhau giữa các máy).
  function openPopoverBelow(
    btnRef: React.RefObject<View | null>,
    setAnchor: (anchor: { top: number; right: number }) => void,
    setVisible: (v: boolean) => void
  ) {
    btnRef.current?.measureInWindow((x, y, width, height) => {
      setAnchor({
        top: y + height + 8,
        right: Math.max(SCREEN_WIDTH - (x + width), 8),
      });
      setVisible(true);
    });
  }
  const scheduleMenuItems: MenuPopoverItem[] = [
    {
      key: 'truc-tiep',
      label: 'Trực tiếp',
      icon: <Radio size={16} color="#fff" />,
      onPress: () => router.push('/ganhthethao/standings'),
    },
    {
      key: 'truyen-hinh',
      label: 'Truyền hình',
      icon: <Tv size={16} color="#fff" />,
      onPress: () => router.push('/ganhthethao/tv-schedule'),
    },
  ];

  const moreMenuItems: MenuPopoverItem[] = [
    {
      key: 'truc-tiep',
      label: 'Trực tiếp',
      icon: <Radio size={20} color="#fff" />,
      onPress: () => router.push('/ganhthethao/standings'),
    },
    {
      key: 'truyen-hinh',
      label: 'Truyền hình',
      icon: <Tv size={20} color="#fff" />,
      onPress: () => router.push('/ganhthethao/tv-schedule'),
    },
  ];

  return (
    <View style={styles.wrapper}>
      <StatusBar style="light" hidden={false} />
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        {/* HEADER */}
        <View style={styles.header}>
          <Pressable onPress={() => router.replace('/intro')} style={styles.iconBtn}>
            <ChevronLeft size={22} color="#fff" />
          </Pressable>

          <Text style={styles.headerTitle}>Thể thao</Text>

          <View style={styles.headerRightGroup}>
            <Pressable
              ref={moreMenuBtnRef}
              style={styles.iconBtn}
              onPress={() =>
                openPopoverBelow(
                  moreMenuBtnRef,
                  setMoreMenuAnchor,
                  setMoreMenuVisible
                )
              }
            >
              <MoreHorizontal size={20} color="#fff" />
            </Pressable>
            <Pressable style={styles.iconBtn}>
              <Search size={20} color="#fff" />
            </Pressable>
          </View>
        </View>

        {/* TABS */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsRow}
        >
          <TabPill
            label="C1"
            icon={
              <Image
                source={{ uri: UCL_LOGO }}
                style={styles.tabPillLogo}
                contentFit="contain"
              />
            }
            active={tab === 'ucl'}
            onPress={() => setTab('ucl')}
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
            icon={
              <Image
                source={{ uri: VLEAGUE_LOGO }}
                style={styles.tabPillLogo}
                contentFit="contain"
              />
            }
            active={tab === 'vleague'}
            onPress={() => setTab('vleague')}
          />

          <TabPill
            label="LaLiga"
            icon={
              <Image
                source={{ uri: LALIGA_LOGO }}
                style={styles.tabPillLogo}
                contentFit="contain"
              />
            }
            active={tab === 'laliga'}
            onPress={() => setTab('laliga')}
          />

          <TabPill
            label="Bundesliga"
            icon={
              <Image
                source={{ uri: BUNDESLIGA_LOGO }}
                style={styles.tabPillLogo}
                contentFit="contain"
              />
            }
            active={tab === 'bundesliga'}
            onPress={() => setTab('bundesliga')}
          />
        </ScrollView>
      </SafeAreaView>

      <ScrollView ref={scrollViewRef} showsVerticalScrollIndicator={false}>
        {/* CAROUSEL */}
        <View style={styles.carouselWrap}>
          <MatchCardCarousel />
        </View>

        {/* MATCHES */}
        <MatchSection
          ref={matchSectionRef}
          scrollViewRef={scrollViewRef}
          competition={tab}
          onSelectedDateChange={(selected, today) =>
            setShowBackToToday(selected !== today)
          }
        />
      </ScrollView>

      {/* QUAY LẠI HÔM NAY */}
      {showBackToToday && (
        <Pressable
          style={styles.backToTodayBtn}
          onPress={() => matchSectionRef.current?.scrollToToday()}
        >
          <History size={14} color="#0A1642" />
          <Text style={styles.backToTodayText}>Quay lại hôm nay</Text>
        </Pressable>
      )}

      {/* THANH CỐ ĐỊNH: Lịch đấu / Xếp hạng — luôn hiện, không chặn scroll */}
      <View pointerEvents="box-none" style={styles.scheduleBarWrap}>
        <View style={styles.scheduleBar}>
          {scheduleMenuItems.map((item, index) => (
            <Pressable
              key={item.key}
              style={[styles.scheduleItem, index > 0 && styles.scheduleItemDivider]}
              onPress={item.onPress}
            >
              <View style={styles.scheduleIconWrap}>{item.icon}</View>
              <Text style={styles.scheduleLabel}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#0A0A0F',
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

  headerRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
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

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },

  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#4A4A55',
  },

  liveDotActive: {
    backgroundColor: '#FF4D4D',
  },

  liveText: {
    color: '#6B6B75',
    fontSize: 13,
    fontWeight: '700',
  },

  liveTextActive: {
    color: '#FF4D4D',
  },

  calendarBtn: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },

  dateScroll: {
    flex: 1,
  },

  dateScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },

  dateTab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },

  dateTabActive: {
    backgroundColor: '#1C1C22',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },

  dateTabDay: {
    color: '#8A8A93',
    fontSize: 12,
    fontWeight: '600',
  },

  dateTabDayActive: {
    color: '#fff',
    fontWeight: '800',
  },

  dateTabNumber: {
    color: '#5C5C66',
    fontSize: 9,
    marginTop: 1,
  },

  dateTabNumberActive: {
    color: '#C9C9D1',
    fontSize: 9,
    marginTop: 1,
  },

  dateTabToday: {
    color: '#FF6B57',
  },

  topBarDivider: {
    width: StyleSheet.hairlineWidth,
    height: 20,
    backgroundColor: '#33333B',
  },

  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  filterBtnText: {
    color: '#AFAFAF',
    fontSize: 12,
    fontWeight: '600',
  },

  dayHeader: {
    color: '#8A8A93',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 18,
    marginBottom: 10,
  },

  noMatchText: {
    color: '#5C5C66',
    fontSize: 12,
    marginBottom: 4,
  },

  matchList: {
    gap: 10,
  },

  matchItem: {
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#1A1A20',
  },

  matchTime: {
    width: 46,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },

  matchTimeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },

  matchStatusLive: {
    color: '#FF5C5C',
    fontSize: 9,
    fontWeight: '800',
    marginTop: 4,
  },

  teamsContainer: {
    flex: 1,
    gap: 10,
    marginLeft: 10,
  },

  matchAction: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },

  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },

  teamLogo: {
    width: 22,
    height: 22,
    marginRight: 10,
  },

  teamName: {
    flex: 1,
    color: '#E4E4E4',
    fontSize: 13,
    fontWeight: '500',
  },

  teamScore: {
    width: 18,
    textAlign: 'center',
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },

  emptyMatch: {
    backgroundColor: '#111F50',
    minHeight: 120,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    paddingHorizontal: 20,
  },

  emptyMatchText: {
    color: '#AFC0EE',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },

  noScheduleText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 14,
    marginBottom: 8,
    textAlign: 'center',
  },

  errorText: {
    color: '#FF7B7B',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 8,
  },

  /* =================================================
     BACK TO TODAY
  ================================================= */

  backToTodayBtn: {
    position: 'absolute',
    bottom: 80,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },

  backToTodayText: {
    color: '#0A1642',
    fontSize: 12,
    fontWeight: '700',
  },
  scheduleBarWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    zIndex: 20,
  },

  scheduleBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(28,28,34,0.96)',
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 6,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },

  scheduleItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    gap: 3,
  },

  scheduleItemDivider: {
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: 'rgba(255,255,255,0.15)',
  },

  scheduleIconWrap: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  scheduleLabel: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
});

export default SportsHeader;