import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';


export type MenuPopoverItem = {
  key: string;
  label: string;
  icon: ReactNode;
  onPress: () => void;
};

export type MenuPopoverProps = {
  visible: boolean;
  items: MenuPopoverItem[];
  onClose: () => void;
  /** Kiểu định vị. Mặc định "anchored" (giữ hành vi cũ). */
  placement?: 'anchored' | 'bottom-center';
  /** anchored: toạ độ tuyệt đối {top,right}. bottom-center: có thể truyền {bottom} để chỉnh độ cao. */
  style?: ViewStyle;
};

export function MenuPopover({
  visible,
  items,
  onClose,
  placement = 'anchored',
  style,
}: MenuPopoverProps) {
  const isBottomCenter = placement === 'bottom-center';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Backdrop trong suốt để bấm ra ngoài là đóng popover (chỉ áp dụng khi có onClose thật) */}
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

      {isBottomCenter ? (
        // Thanh full-width, canh giữa nội dung bên trong bằng justifyContent
        <View
          pointerEvents="box-none"
          style={[styles.bottomCenterRow, style]}
        >
          <View style={styles.popoverCompact}>
            {items.map((item, index) => (
              <Pressable
                key={item.key}
                style={[styles.itemCompact, index > 0 && styles.itemDivider]}
                onPress={() => {
                  onClose();
                  item.onPress();
                }}
              >
                <View style={styles.iconWrapCompact}>{item.icon}</View>
                <Text style={styles.labelCompact}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : (
        <View style={[styles.popover, style]}>
          {items.map((item, index) => (
            <Pressable
              key={item.key}
              style={[styles.item, index > 0 && styles.itemDivider]}
              onPress={() => {
                onClose();
                item.onPress();
              }}
            >
              <View style={styles.iconWrap}>{item.icon}</View>
              <Text style={styles.label}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  /* ===== anchored (nút "...") ===== */
  popover: {
    position: 'absolute',
    top: 90,
    right: 14,
    flexDirection: 'row',
    backgroundColor: 'rgba(28,28,34,0.96)',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 10,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    zIndex: 20,
  },

  item: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    gap: 6,
  },

  iconWrap: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },

  label: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },

  /* ===== bottom-center (Lịch đấu / Xếp hạng) — thu nhỏ hơn ===== */
  bottomCenterRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 90,
    flexDirection: 'row',
    justifyContent: 'center',
    zIndex: 20,
  },

  popoverCompact: {
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

  itemCompact: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    gap: 3,
  },

  iconWrapCompact: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  labelCompact: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },

  itemDivider: {
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: 'rgba(255,255,255,0.15)',
  },
});

export default MenuPopover;