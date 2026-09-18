// import { Tabs } from 'expo-router';
// import { useSafeAreaInsets } from 'react-native-safe-area-context';
// import { Platform, useWindowDimensions } from 'react-native';
// import { Colors } from '@/constants/colors';
// import { House as Home, Search, Calendar, User } from 'lucide-react-native';

// export default function TabLayout() {
//   const { bottom } = useSafeAreaInsets();
//   const { width } = useWindowDimensions();

//   // Visible content area always 56dp; bottom inset extends tab bar behind Android nav bar
//   const CONTENT_H = 56;
//   const TAB_HEIGHT = CONTENT_H + bottom;
//   const showLabel = width >= 360;

//   return (
//     <Tabs
//       screenOptions={{
//         headerShown: false,
//         tabBarShowLabel: showLabel,
//         tabBarStyle: {
//           backgroundColor: '#101E53',
//           borderTopColor: '#1D2A61',
//           borderTopWidth: 0.5,
//           paddingTop: 8,
//           paddingBottom: Platform.OS === 'android' ? bottom + 2 : Math.max(bottom, 6),
//           height: TAB_HEIGHT,
//         },
//         tabBarActiveTintColor: Colors.primary,
//         tabBarInactiveTintColor: Colors.textSecondary,
//         tabBarLabelStyle: {
//           fontSize: 10,
//           fontWeight: '600',
//           marginTop: 2,
//         },
//       }}
//     >
//       <Tabs.Screen
//         name="index"
//         options={{
//           title: 'Trang chủ',
//           tabBarIcon: ({ size, color }) => <Home size={size} color={color} />,
//         }}
//       />
//       <Tabs.Screen
//         name="search"
//         options={{
//           title: 'Tìm kiếm',
//           tabBarIcon: ({ size, color }) => <Search size={size} color={color} />,
//         }}
//       />
//       <Tabs.Screen
//         name="schedule"
//         options={{
//           title: 'Lịch chiếu',
//           tabBarIcon: ({ size, color }) => <Calendar size={size} color={color} />,
//         }}
//       />
//       <Tabs.Screen
//         name="account"
//         options={{
//           title: 'Tài khoản',
//           tabBarIcon: ({ size, color }) => <User size={size} color={color} />,
//         }}
//       />
//     </Tabs>
//   );
// }
import { Slot, useRouter, usePathname } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Search,
  Compass,
  House as Home,
  Heart,
  User,
  X,
  Menu,
  LucideIcon,
} from 'lucide-react-native';

const PINK = '#FF3D9A';
const BAR_BG = '#131d41';
const BAR_BORDER = '#1D2A61';

type TabItem = {
  href: string;
  label: string;
  Icon: LucideIcon;
};

const SIDE_TABS_LEFT: TabItem[] = [
  { href: '/search', label: 'Tìm kiếm', Icon: Search },
  { href: '/topics', label: 'Khám phá', Icon: Compass },
];

const SIDE_TABS_RIGHT: TabItem[] = [
  { href: '/favorites', label: 'Yêu thích', Icon: Heart },
  { href: '/account', label: 'Tài khoản', Icon: User },
];

function FloatingTabBar() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(true);

  const navigate = (href: string) => {
    if (href === pathname) return;
    router.push(href as any);
  };

  const renderItem = ({ href, label, Icon }: TabItem) => {
    const isActive = pathname === href;
    const color = isActive ? '#FFFFFF' : 'rgba(255,255,255,0.7)';

    return (
      <Pressable key={href} onPress={() => navigate(href)} style={styles.item}>
        <Icon size={20} color={color} strokeWidth={2} />
        <Text style={[styles.label, { color }]}>{label}</Text>
      </Pressable>
    );
  };

  const isHomeActive = pathname === '/';

  // Menu đã đóng: chỉ hiện 1 nút nhỏ để mở lại, góc phải dưới màn hình
  if (!visible) {
    return (
      <View
        pointerEvents="box-none"
        style={[styles.wrapperClosed, { bottom: insets.bottom + 12 }]}
      >
        <Pressable style={styles.reopenButton} onPress={() => setVisible(true)}>
          <Menu size={20} color="#FFFFFF" strokeWidth={2} />
        </Pressable>
      </View>
    );
  }

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrapper, { bottom: insets.bottom + 12 }]}
    >
      <View style={styles.barContainer}>
        <View style={styles.bar}>
          {SIDE_TABS_LEFT.map(renderItem)}
          <View style={styles.spacer} />
          {SIDE_TABS_RIGHT.map(renderItem)}
        </View>

        <Pressable
          onPress={() => navigate('/')}
          style={[styles.homeButton, isHomeActive && styles.homeButtonActive]}
        >
          <Home size={24} color="#1A1A1A" strokeWidth={2} />
        </Pressable>

        {/* Nút X để đóng menu */}
        <Pressable
          style={styles.closeButton}
          onPress={() => setVisible(false)}
          hitSlop={8}
        >
          <X size={14} color="#FFFFFF" strokeWidth={2.5} />
        </Pressable>
      </View>
    </View>
  );
}

export default function RootLayout() {
  return (
    <>
      <Slot />
      <FloatingTabBar />
    </>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 40,
    alignItems: 'center',
  },
  wrapperClosed: {
    position: 'absolute',
    right: 16,
    zIndex: 40,
  },
  barContainer: {
    alignItems: 'center',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 4,
    borderRadius: 32,
    borderWidth: 0.5,
    borderColor: BAR_BORDER,
    backgroundColor: BAR_BG,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.8,
        shadowRadius: 24,
        shadowOffset: { width: 0, height: 12 },
      },
      android: {
        elevation: 16,
      },
    }),
  },
  item: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    minWidth: 60,
  },
  spacer: {
    width: 52,
  },
  label: {
    fontSize: 9,
    marginTop: 4,
  },
  homeButton: {
    position: 'absolute',
    top: -12,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: PINK,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: PINK,
    shadowOpacity: 0.6,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  homeButtonActive: {
    shadowOpacity: 0.9,
  },
  closeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: BAR_BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reopenButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: BAR_BG,
    borderWidth: 0.5,
    borderColor: BAR_BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.6,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
      },
      android: {
        elevation: 8,
      },
    }),
  },
});