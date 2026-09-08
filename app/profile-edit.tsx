import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Modal,
  TextInput,
  ActivityIndicator,
  FlatList,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight, Pencil, KeyRound, Camera, Eye, EyeOff } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { apiUpdateProfile, apiChangePassword } from '@/lib/authApi';

const PRESET_AVATARS = [
  'https://img.upanhnhanh.com/25ac35b6f54550d9583906919fb61fbf',
  'https://img.upanhnhanh.com/e7f9fa0b547c0fe6d021cc2c6556ae62',
  'https://img.upanhnhanh.com/093485df2403b756ae1ce245dc30ceb6',
  'https://img.upanhnhanh.com/afec688dcdc9eaedab5abc6edc624950',
  'https://img.upanhnhanh.com/4b460da3a5603611b8331d7d17cb5046',
  'https://img.upanhnhanh.com/b504ee6715bb0775d243e2633500a5a5',
  'https://img.upanhnhanh.com/4655a64ffcc05c7ea7a8e9c7fe1c768c',
  'https://img.upanhnhanh.com/b6e97b1e0283c9fd644bee220f8b1ad1',
];

type SheetType = 'avatar' | 'info' | 'password' | null;

/* ─── Avatar picker sheet ──────────────────────────────────── */
function AvatarSheet({
  visible,
  currentAvatar,
  onClose,
  onSave,
}: {
  visible: boolean;
  currentAvatar?: string;
  onClose: () => void;
  onSave: (url: string) => Promise<void>;
}) {
  const [selected, setSelected] = useState(currentAvatar || '');
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    if (!selected) return;
    setLoading(true);
    try {
      await onSave(selected);
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.sheet, { maxHeight: '80%' }]} onPress={() => {}}>
          <View style={styles.handleBar} />
          <Text style={styles.sheetTitle}>Chọn ảnh đại diện</Text>
          <FlatList
            key="avatar-grid-4"
            data={PRESET_AVATARS}
            numColumns={4}
            keyExtractor={(item) => item}
            contentContainerStyle={styles.avatarGrid}
            columnWrapperStyle={styles.avatarRow}
            renderItem={({ item }) => {
              const isSelected = selected === item;
              return (
                <TouchableOpacity
                  onPress={() => setSelected(item)}
                  style={[styles.avatarPickerItem, isSelected && styles.avatarPickerSelected]}
                  activeOpacity={0.8}
                >
                  <Image source={{ uri: item }} style={styles.avatarPickerImg} />
                  {isSelected && <View style={styles.avatarCheckOverlay} />}
                </TouchableOpacity>
              );
            }}
          />
          <View style={styles.sheetBtnRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.8}>
              <Text style={styles.cancelBtnText}>Huỷ</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, !selected && { opacity: 0.5 }]}
              onPress={handleSave}
              activeOpacity={0.8}
              disabled={!selected || loading}
            >
              {loading
                ? <ActivityIndicator color="#000" />
                : <Text style={styles.saveBtnText}>Cập nhật</Text>}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/* ─── Info edit sheet ──────────────────────────────────────── */
function InfoSheet({
  visible,
  initialName,
  email,
  initialGender,
  onClose,
  onSave,
}: {
  visible: boolean;
  initialName: string;
  email: string;
  initialGender: 'male' | 'female' | 'other';
  onClose: () => void;
  onSave: (name: string, gender: 'male' | 'female' | 'other') => Promise<void>;
}) {
  const [name, setName] = useState(initialName);
  const [gender, setGender] = useState<'male' | 'female' | 'other'>(initialGender);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const GENDERS: { value: 'male' | 'female' | 'other'; label: string }[] = [
    { value: 'male', label: 'Nam' },
    { value: 'female', label: 'Nữ' },
    { value: 'other', label: 'Không xác định' },
  ];

  async function handleSave() {
    setError('');
    if (!name.trim()) return setError('Vui lòng nhập tên hiển thị.');
    setLoading(true);
    try {
      await onSave(name.trim(), gender);
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Cập nhật thất bại.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.kavContainer}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.handleBar} />
            <Text style={styles.sheetTitle}>Thông tin tài khoản</Text>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Text style={styles.fieldLabel}>Tên hiển thị</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholderTextColor={Colors.textSecondary}
              placeholder="Nhập tên hiển thị"
            />

            <Text style={styles.fieldLabel}>Email</Text>
            <TextInput
              style={[styles.input, styles.inputDisabled]}
              value={email}
              editable={false}
            />

            <Text style={styles.fieldLabel}>Giới tính</Text>
            <View style={styles.genderRow}>
              {GENDERS.map((g) => (
                <TouchableOpacity
                  key={g.value}
                  style={[styles.genderBtn, gender === g.value && styles.genderBtnActive]}
                  onPress={() => setGender(g.value)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.genderBtnText, gender === g.value && styles.genderBtnTextActive]}>
                    {g.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.sheetBtnRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.8}>
                <Text style={styles.cancelBtnText}>Huỷ</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.8} disabled={loading}>
                {loading
                  ? <ActivityIndicator color="#000" />
                  : <Text style={styles.saveBtnText}>Cập nhật</Text>}
              </TouchableOpacity>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

/* ─── Password change sheet ────────────────────────────────── */
function PasswordSheet({
  visible,
  onClose,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (current: string, newPass: string) => Promise<void>;
}) {
  const [current, setCurrent] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function reset() { setCurrent(''); setNewPass(''); setConfirm(''); setError(''); }

  async function handleSave() {
    setError('');
    if (!current) return setError('Vui lòng nhập mật khẩu hiện tại.');
    if (!newPass) return setError('Vui lòng nhập mật khẩu mới.');
    if (newPass.length < 6) return setError('Mật khẩu mới ít nhất 6 ký tự.');
    if (newPass !== confirm) return setError('Xác nhận mật khẩu không khớp.');
    setLoading(true);
    try {
      await onSave(current, newPass);
      reset();
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Đổi mật khẩu thất bại.');
    } finally {
      setLoading(false);
    }
  }

  function handleClose() { reset(); onClose(); }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <Pressable style={styles.overlay} onPress={handleClose}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.kavContainer}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.handleBar} />
            <Text style={styles.sheetTitle}>Thay đổi mật khẩu</Text>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Text style={styles.fieldLabel}>Mật khẩu hiện tại</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, styles.inputFlex]}
                value={current}
                onChangeText={setCurrent}
                secureTextEntry={!showCurrent}
                placeholderTextColor={Colors.textSecondary}
                placeholder="Nhập mật khẩu hiện tại"
              />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowCurrent(v => !v)}>
                {showCurrent ? <EyeOff size={17} color={Colors.textSecondary} /> : <Eye size={17} color={Colors.textSecondary} />}
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>Mật khẩu mới</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, styles.inputFlex]}
                value={newPass}
                onChangeText={setNewPass}
                secureTextEntry={!showNew}
                placeholderTextColor={Colors.textSecondary}
                placeholder="Nhập mật khẩu mới"
              />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowNew(v => !v)}>
                {showNew ? <EyeOff size={17} color={Colors.textSecondary} /> : <Eye size={17} color={Colors.textSecondary} />}
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>Xác nhận mật khẩu mới</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, styles.inputFlex]}
                value={confirm}
                onChangeText={setConfirm}
                secureTextEntry={!showConfirm}
                placeholderTextColor={Colors.textSecondary}
                placeholder="Nhập lại mật khẩu mới"
              />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowConfirm(v => !v)}>
                {showConfirm ? <EyeOff size={17} color={Colors.textSecondary} /> : <Eye size={17} color={Colors.textSecondary} />}
              </TouchableOpacity>
            </View>

            <View style={styles.sheetBtnRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={handleClose} activeOpacity={0.8}>
                <Text style={styles.cancelBtnText}>Huỷ</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.8} disabled={loading}>
                {loading
                  ? <ActivityIndicator color="#000" />
                  : <Text style={styles.saveBtnText}>Cập nhật</Text>}
              </TouchableOpacity>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

/* ─── Main screen ──────────────────────────────────────────── */
export default function ProfileEditScreen() {
  const router = useRouter();
  const { user, updateUser } = useAuth();
  const { showToast } = useToast();
  const [activeSheet, setActiveSheet] = useState<SheetType>(null);

  async function handleSaveAvatar(url: string) {
    const updated = await apiUpdateProfile({ avatar: url });
    updateUser({ avatar: updated.avatar ?? url });
    showToast('Đã cập nhật ảnh đại diện', 'success');
  }

  async function handleSaveInfo(displayName: string, gender: 'male' | 'female' | 'other') {
    const updated = await apiUpdateProfile({ displayName, gender });
    updateUser({ displayName: updated.displayName ?? displayName, gender: updated.gender ?? gender });
    showToast('Đã cập nhật thông tin', 'success');
  }

  async function handleSavePassword(currentPassword: string, newPassword: string) {
    await apiChangePassword({ currentPassword, newPassword });
    showToast('Đã đổi mật khẩu thành công', 'success');
  }

  const MENU = [
    {
      id: 'avatar',
      label: 'Đổi ảnh đại diện',
      icon: (
        user?.avatar
          ? <Image source={{ uri: user.avatar }} style={styles.menuAvatar} />
          : <View style={styles.menuAvatarPlaceholder}><Camera size={18} color={Colors.textSecondary} /></View>
      ),
    },
    {
      id: 'info',
      label: 'Thay đổi thông tin',
      icon: <Pencil size={18} color={Colors.textSecondary} />,
    },
    {
      id: 'password',
      label: 'Đổi mật khẩu',
      icon: <KeyRound size={18} color={Colors.textSecondary} />,
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <ChevronLeft size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quản lý tài khoản</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView>
        {MENU.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.menuItem}
            onPress={() => setActiveSheet(item.id as SheetType)}
            activeOpacity={0.7}
          >
            <View style={styles.menuItemLeft}>
              {item.icon}
              <Text style={styles.menuItemText}>{item.label}</Text>
            </View>
            <ChevronRight size={17} color={Colors.textSecondary} />
          </TouchableOpacity>
        ))}
      </ScrollView>

      <AvatarSheet
        visible={activeSheet === 'avatar'}
        currentAvatar={user?.avatar}
        onClose={() => setActiveSheet(null)}
        onSave={handleSaveAvatar}
      />
      <InfoSheet
        visible={activeSheet === 'info'}
        initialName={user?.displayName || user?.username || ''}
        email={user?.email || ''}
        initialGender={user?.gender || 'other'}
        onClose={() => setActiveSheet(null)}
        onSave={handleSaveInfo}
      />
      <PasswordSheet
        visible={activeSheet === 'password'}
        onClose={() => setActiveSheet(null)}
        onSave={handleSavePassword}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  backBtn: { padding: 4 },
  headerTitle: { color: Colors.text, fontSize: 18, fontWeight: '700' },

  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  menuItemText: { color: Colors.text, fontSize: 15 },
  menuAvatar: { width: 42, height: 42, borderRadius: 21 },
  menuAvatarPlaceholder: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.backgroundLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* sheets */
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  kavContainer: { justifyContent: 'flex-end' },
  sheet: {
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
    marginBottom: 18,
  },
  sheetTitle: { color: Colors.text, fontSize: 19, fontWeight: '700', marginBottom: 18 },
  errorText: { color: '#F56B70', fontSize: 13, marginBottom: 10 },

  fieldLabel: { color: Colors.textSecondary, fontSize: 12, marginBottom: 6, marginTop: 4 },
  input: {
    backgroundColor: Colors.backgroundLight,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: Colors.text,
    fontSize: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 4,
  },
  inputDisabled: { opacity: 0.5 },
  inputFlex: { flex: 1, marginBottom: 0, borderWidth: 0 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundLight,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 4,
    paddingRight: 12,
    overflow: 'hidden',
  },
  eyeBtn: { padding: 4 },

  genderRow: { flexDirection: 'row', gap: 10, marginBottom: 4, flexWrap: 'wrap' },
  genderBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  genderBtnActive: { borderColor: Colors.text, backgroundColor: 'transparent' },
  genderBtnText: { color: Colors.textSecondary, fontSize: 14 },
  genderBtnTextActive: { color: Colors.text, fontWeight: '700' },

  /* avatar grid */
  avatarGrid: { paddingVertical: 8 },
  avatarRow: { justifyContent: 'space-between', marginBottom: 10 },
  avatarPickerItem: {
    width: '23%',
    aspectRatio: 1,
    borderRadius: 50,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  avatarPickerSelected: { borderColor: '#D4A017' },
  avatarPickerImg: { width: '100%', height: '100%' },
  avatarCheckOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(212,160,23,0.25)',
  },

  sheetBtnRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  cancelBtnText: { color: '#000', fontWeight: '700', fontSize: 15 },
  saveBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#4ade80',
    alignItems: 'center',
  },
  saveBtnText: { color: '#000', fontWeight: '700', fontSize: 15 },
});
