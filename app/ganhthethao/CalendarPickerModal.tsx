import { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react-native';

/* =========================================================
   CALENDAR PICKER MODAL — dạng lưới tháng thật sự

   Có nút chuyển tháng trước/sau, hàng tiêu đề thứ (Thứ 2..CN),
   lưới các ngày trong tháng. Ngày hôm nay tô chữ cam, ngày đang
   chọn có khoanh tròn nền trắng. Neo (anchor) ngay dưới nút lịch
   thay vì hiện giữa màn hình.
========================================================= */

export type CalendarPickerModalProps = {
  visible: boolean;
  onClose: () => void;
  /** Ngày đang được chọn, dạng 'YYYY-MM-DD' */
  selectedDate: string;
  /** Gọi khi người dùng chọn 1 ngày trong lưới lịch */
  onSelectDate: (dateStr: string) => void;
  /** Ngày nhỏ nhất có thể chọn, dạng 'YYYY-MM-DD' (tuỳ chọn) */
  minDate?: string;
  /** Ngày lớn nhất có thể chọn, dạng 'YYYY-MM-DD' (tuỳ chọn) */
  maxDate?: string;
  /** Vị trí top để neo ngay dưới nút lịch, đo bằng measureInWindow */
  anchorTop?: number;
};

const WEEKDAY_HEADERS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN'];
const MONTH_NAMES_VN = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
  'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
];

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function toDateStr(year: number, month: number, day: number) {
  return `${year}-${pad2(month + 1)}-${pad2(day)}`;
}

function parseDateStr(dateString: string) {
  const [y, m, d] = dateString.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// Thứ trong tuần theo kiểu VN: Thứ 2 = 0 ... CN = 6
function vnWeekday(date: Date) {
  const jsDay = date.getDay(); // 0 = CN ... 6 = Thứ 7
  return jsDay === 0 ? 6 : jsDay - 1;
}

export function CalendarPickerModal({
  visible,
  onClose,
  selectedDate,
  onSelectDate,
  minDate,
  maxDate,
  anchorTop = 96,
}: CalendarPickerModalProps) {
  const selected = useMemo(() => parseDateStr(selectedDate), [selectedDate]);

  const [viewYear, setViewYear] = useState(selected.getFullYear());
  const [viewMonth, setViewMonth] = useState(selected.getMonth()); // 0-11

  const todayStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
  }, []);

  const cells = useMemo(() => {
    const firstOfMonth = new Date(viewYear, viewMonth, 1);
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const leadingBlanks = vnWeekday(firstOfMonth);

    const result: Array<{ day: number; dateStr: string } | null> = [];
    for (let i = 0; i < leadingBlanks; i++) result.push(null);
    for (let day = 1; day <= daysInMonth; day++) {
      result.push({ day, dateStr: toDateStr(viewYear, viewMonth, day) });
    }
    return result;
  }, [viewYear, viewMonth]);

  function goPrevMonth() {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function goNextMonth() {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  function isDisabled(dateStr: string) {
    if (minDate && dateStr < minDate) return true;
    if (maxDate && dateStr > maxDate) return true;
    return false;
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      {/* Không làm tối nền — chỉ bắt sự kiện bấm ra ngoài để đóng */}
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

      <View style={[styles.card, { top: anchorTop }]}>
        <View style={styles.header}>
          <Pressable onPress={goPrevMonth} hitSlop={8} style={styles.navBtn}>
            <ChevronLeft size={18} color="#AFC0EE" />
          </Pressable>

          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>{MONTH_NAMES_VN[viewMonth]}</Text>
            <Text style={styles.headerYear}>{viewYear}</Text>
          </View>

          <Pressable onPress={goNextMonth} hitSlop={8} style={styles.navBtn}>
            <ChevronRight size={18} color="#AFC0EE" />
          </Pressable>

          <View style={styles.calendarIconWrap}>
            <CalendarIcon size={16} color="#AFC0EE" />
          </View>
        </View>

        <View style={styles.weekdayRow}>
          {WEEKDAY_HEADERS.map((label) => (
            <Text key={label} style={styles.weekdayText}>
              {label}
            </Text>
          ))}
        </View>

        <View style={styles.grid}>
          {cells.map((cell, index) => {
            if (!cell) {
              return <View key={`blank-${index}`} style={styles.cell} />;
            }

            const isToday = cell.dateStr === todayStr;
            const isSelected = cell.dateStr === selectedDate;
            const disabled = isDisabled(cell.dateStr);

            return (
              <Pressable
                key={cell.dateStr}
                disabled={disabled}
                style={styles.cell}
                onPress={() => {
                  onClose();
                  onSelectDate(cell.dateStr);
                }}
              >
                <View style={[styles.dayCircle, isSelected && styles.dayCircleSelected]}>
                  <Text
                    style={[
                      styles.dayText,
                      isToday && styles.dayTextToday,
                      isSelected && styles.dayTextSelected,
                      disabled && styles.dayTextDisabled,
                    ]}
                  >
                    {cell.day}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    left: 14,
    right: 14,
    backgroundColor: '#1C1C22',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },

  navBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },

  headerTitleWrap: {
    alignItems: 'center',
    marginHorizontal: 16,
    minWidth: 100,
  },

  headerTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },

  headerYear: {
    color: '#8A8A93',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },

  calendarIconWrap: {
    position: 'absolute',
    right: 4,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },

  weekdayRow: {
    flexDirection: 'row',
    marginTop: 10,
    marginBottom: 4,
  },

  weekdayText: {
    flex: 1,
    textAlign: 'center',
    color: '#8A8A93',
    fontSize: 11,
    fontWeight: '600',
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  dayCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },

  dayCircleSelected: {
    backgroundColor: '#fff',
  },

  dayText: {
    color: '#E4E4E4',
    fontSize: 13,
    fontWeight: '600',
  },

  dayTextToday: {
    color: '#FF6B57',
    fontWeight: '800',
  },

  dayTextSelected: {
    color: '#0A0A0F',
    fontWeight: '800',
  },

  dayTextDisabled: {
    color: '#3A3A42',
  },
});

export default CalendarPickerModal;