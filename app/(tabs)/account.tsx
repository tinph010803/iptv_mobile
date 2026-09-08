import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  User,
  Eye,
  EyeOff,
  ChevronRight,
  History,
  Plus,
  Heart,
  Monitor,
  FileText,
  Shield,
  LogOut,
  Star,
  Link2,
} from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'expo-router';

/* ─── Menu items ─────────────────────────────────────────── */
const MENU_ITEMS = [
  { id: 'watching', label: 'Lịch sử xem', icon: History },
  { id: 'playlist', label: 'Danh sách phim của tôi', icon: Plus },
  { id: 'favorites', label: 'Yêu thích', icon: Heart },
  { id: 'smarttv', label: 'Đăng nhập SmartTV', icon: Monitor },
  { id: 'policy', label: 'Hợp Đồng và Chính Sách', icon: Shield },
  { id: 'privacy', label: 'Chính sách bảo mật', icon: FileText },
];

/* ─── Auth bottom‑sheet modal ───────────────────────────── */
type ModalMode = 'login' | 'register' | null;

function AuthModal({
  mode,
  onClose,
  onSwitch,
}: {
  mode: ModalMode;
  onClose: () => void;
  onSwitch: (m: ModalMode) => void;
}) {
  const { login, register } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showLoginPass, setShowLoginPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function resetFields() {
    setDisplayName(''); setEmail(''); setPassword(''); setConfirmPassword('');
    setUsername(''); setLoginPassword(''); setError('');
  }

  function handleSwitch(m: ModalMode) {
    resetFields();
    onSwitch(m);
  }

  async function handleRegister() {
    setError('');
    if (!displayName.trim()) return setError('Vui lòng nhập tên.');
    if (!email.trim()) return setError('Vui lòng nhập email.');
    if (!password) return setError('Vui lòng nhập mật khẩu.');
    if (password.length < 6) return setError('Mật khẩu ít nhất 6 ký tự.');
    if (password !== confirmPassword) return setError('Mật khẩu nhập lại không khớp.');
    const derivedUsername = displayName.replace(/\s+/g, '').toLowerCase();
    const usernameToUse = derivedUsername.length >= 3 ? derivedUsername : derivedUsername.padEnd(3, '0');
    try {
      setLoading(true);
      await register({ email, username: usernameToUse, password, displayName });
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Đăng ký thất bại.');
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin() {
    setError('');
    if (!username.trim()) return setError('Vui lòng nhập tên đăng nhập.');
    if (!loginPassword) return setError('Vui lòng nhập mật khẩu.');
    try {
      setLoading(true);
      await login(username, loginPassword);
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Đăng nhập thất bại.');
    } finally {
      setLoading(false);
    }
  }

  const isRegister = mode === 'register';

  return (
    <Modal
      visible={mode !== null}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior="padding"
        style={styles.modalKAV}
      >
        <Pressable style={styles.modalOverlay} onPress={onClose} />
        <Pressable style={styles.modalSheet} onPress={() => {}}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <View style={styles.handleBar} />

            <Text style={styles.modalTitle}>
              {isRegister ? 'Đăng ký' : 'Đăng nhập'}
            </Text>

            {isRegister ? (
              <Text style={styles.modalSub}>
                Nếu bạn đã có tài khoản,{' '}
                <Text style={styles.modalLink} onPress={() => handleSwitch('login')}>
                  đăng nhập ngay
                </Text>
              </Text>
            ) : (
              <Text style={styles.modalSub}>
                Chưa có tài khoản?{' '}
                <Text style={styles.modalLink} onPress={() => handleSwitch('register')}>
                  đăng ký ngay
                </Text>
              </Text>
            )}

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            {isRegister ? (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="Tên của bạn"
                  placeholderTextColor={Colors.textSecondary}
                  value={displayName}
                  onChangeText={setDisplayName}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Nhập email của bạn"
                  placeholderTextColor={Colors.textSecondary}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <View style={styles.inputRow}>
                  <TextInput
                    style={[styles.input, styles.inputFlex]}
                    placeholder="Nhập mật khẩu"
                    placeholderTextColor={Colors.textSecondary}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPass}
                  />
                  <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPass(v => !v)}>
                    {showPass
                      ? <EyeOff size={18} color={Colors.textSecondary} />
                      : <Eye size={18} color={Colors.textSecondary} />}
                  </TouchableOpacity>
                </View>
                <View style={styles.inputRow}>
                  <TextInput
                    style={[styles.input, styles.inputFlex]}
                    placeholder="Nhập lại mật khẩu"
                    placeholderTextColor={Colors.textSecondary}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirm}
                  />
                  <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowConfirm(v => !v)}>
                    {showConfirm
                      ? <EyeOff size={18} color={Colors.textSecondary} />
                      : <Eye size={18} color={Colors.textSecondary} />}
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="Tên đăng nhập"
                  placeholderTextColor={Colors.textSecondary}
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                />
                <View style={styles.inputRow}>
                  <TextInput
                    style={[styles.input, styles.inputFlex]}
                    placeholder="Mật khẩu"
                    placeholderTextColor={Colors.textSecondary}
                    value={loginPassword}
                    onChangeText={setLoginPassword}
                    secureTextEntry={!showLoginPass}
                  />
                  <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowLoginPass(v => !v)}>
                    {showLoginPass
                      ? <EyeOff size={18} color={Colors.textSecondary} />
                      : <Eye size={18} color={Colors.textSecondary} />}
                  </TouchableOpacity>
                </View>
              </>
            )}

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={isRegister ? handleRegister : handleLogin}
              activeOpacity={0.85}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color={Colors.black} />
                : <Text style={styles.submitBtnText}>{isRegister ? 'Đăng ký' : 'Đăng nhập'}</Text>}
            </TouchableOpacity>
          </ScrollView>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/* ─── Main screen ────────────────────────────────────────── */
export default function AccountScreen() {
  const { user, logout, isLoading } = useAuth();
  const router = useRouter();
  const [modalMode, setModalMode] = useState<ModalMode>(null);

  async function handleLogout() {
    Alert.alert('Đăng xuất', 'Bạn có chắc muốn đăng xuất?', [
      { text: 'Huỷ', style: 'cancel' },
      { text: 'Đăng xuất', style: 'destructive', onPress: logout },
    ]);
  }

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Tài khoản</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {user ? (
          <TouchableOpacity
            style={styles.profileCard}
            onPress={() => router.push('/profile-edit')}
            activeOpacity={0.8}
          >
            <View style={styles.avatarRow}>
              {user.avatar ? (
                <Image source={{ uri: user.avatar }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <User size={24} color={Colors.text} />
                </View>
              )}
              <View style={styles.profileInfo}>
                <View style={styles.nameRow}>
                  <Text style={styles.profileName}>
                    {user.displayName || user.username}
                  </Text>
                  <Text style={styles.infinityBadge}> ∞</Text>
                </View>
                <Text style={styles.profileEmail}>{user.email}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ) : (
          <View style={styles.authRow}>
            <TouchableOpacity
              style={styles.loginBtn}
              activeOpacity={0.85}
              onPress={() => setModalMode('login')}
            >
              <User size={16} color={Colors.black} />
              <Text style={styles.loginBtnText}> Đăng nhập</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.registerBtn}
              activeOpacity={0.85}
              onPress={() => setModalMode('register')}
            >
              <Text style={styles.registerBtnText}>Đăng ký</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.menuSection}>
          {MENU_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <TouchableOpacity
                key={item.id}
                style={styles.menuItem}
                activeOpacity={0.7}
                onPress={
                  item.id === 'favorites'
                    ? () => router.push('/favorites')
                    : item.id === 'watching'
                    ? () => router.push('/watch-history')
                    : undefined
                }
              >
                <View style={styles.menuItemLeft}>
                  <Icon size={18} color={Colors.textSecondary} />
                  <Text style={styles.menuItemText}>{item.label}</Text>
                </View>
                <ChevronRight size={16} color={Colors.textSecondary} />
              </TouchableOpacity>
            );
          })}

          {/* Menu dành riêng cho Admin */}
          {user?.role === 'admin' && (
            <>
              <TouchableOpacity
                style={styles.menuItem}
                activeOpacity={0.7}
                onPress={() => router.push('/admin/featured' as any)}
              >
                <View style={styles.menuItemLeft}>
                  <Star size={18} color="#f59e0b" />
                  <Text style={[styles.menuItemText, { color: '#f59e0b' }]}>Top Phim</Text>
                </View>
                <ChevronRight size={16} color="#f59e0b" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                activeOpacity={0.7}
                onPress={() => router.push('/admin/link-profile' as any)}
              >
                <View style={styles.menuItemLeft}>
                  <Link2 size={18} color="#60a5fa" />
                  <Text style={[styles.menuItemText, { color: '#60a5fa' }]}>Link Profile</Text>
                </View>
                <ChevronRight size={16} color="#60a5fa" />
              </TouchableOpacity>
            </>
          )}
        </View>

        {user && (
          <TouchableOpacity style={styles.logoutItem} onPress={handleLogout} activeOpacity={0.7}>
            <LogOut size={18} color="#FF4D4F" />
            <Text style={styles.logoutText}>Đăng xuất</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      <AuthModal
        mode={modalMode}
        onClose={() => setModalMode(null)}
        onSwitch={setModalMode}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { justifyContent: 'center', alignItems: 'center' },

  header: { paddingHorizontal: 16, paddingVertical: 12 },
  headerTitle: { color: Colors.text, fontSize: 20, fontWeight: '700' },

  /* guest */
  authRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  loginBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#D4A017',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginBtnText: { color: Colors.black, fontWeight: '700', fontSize: 15 },
  registerBtn: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: Colors.text,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  registerBtnText: { color: Colors.text, fontWeight: '700', fontSize: 15 },

  /* logged in */
  profileCard: { paddingHorizontal: 16, paddingBottom: 16 },
  avatarRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  avatar: { width: 50, height: 50, borderRadius: 25 },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.backgroundLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: { marginLeft: 12 },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  profileName: { color: Colors.text, fontSize: 16, fontWeight: '700' },
  infinityBadge: { color: '#D4A017', fontSize: 18, fontWeight: '900' },
  profileEmail: { color: Colors.textSecondary, fontSize: 13, marginTop: 2 },

  /* menu */
  menuSection: { paddingHorizontal: 16 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  menuItemText: { color: Colors.text, fontSize: 15 },

  /* logout */
  logoutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 18,
    marginTop: 8,
  },
  logoutText: { color: '#FF4D4F', fontSize: 15, fontWeight: '600' },

  /* modal */
  modalOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalKAV: { flex: 1, justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#141E40',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 36,
    paddingTop: 12,
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
  },
  modalSub: {
    color: Colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 20,
  },
  modalLink: { color: '#D4A017', fontWeight: '600' },
  errorText: { color: Colors.error, fontSize: 13, marginBottom: 10, textAlign: 'center' },
  input: {
    backgroundColor: Colors.backgroundLight,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: Colors.text,
    fontSize: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  inputFlex: { flex: 1, marginBottom: 0 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundLight,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 10,
    paddingRight: 12,
    overflow: 'hidden',
  },
  eyeBtn: { padding: 4 },
  submitBtn: {
    backgroundColor: '#D4A017',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 6,
  },
  submitBtnText: { color: Colors.black, fontWeight: '700', fontSize: 16 },
});
