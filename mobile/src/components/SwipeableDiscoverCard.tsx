import { useEffect, useRef, type ReactNode } from 'react';
import {
  Animated,
  Dimensions,
  PanResponder,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

const SWIPE_THRESHOLD = 96;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

type Props = {
  cardKey: string;
  onPass: () => void;
  onLike: () => void;
  disabled?: boolean;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export default function SwipeableDiscoverCard({
  cardKey,
  onPass,
  onLike,
  disabled,
  children,
  style,
}: Props) {
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const swipeLocked = useRef(false);
  const disabledRef = useRef(disabled);

  useEffect(() => {
    disabledRef.current = disabled;
  }, [disabled]);

  useEffect(() => {
    translateX.setValue(0);
    opacity.setValue(1);
    swipeLocked.current = false;
  }, [cardKey, translateX, opacity]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        !disabledRef.current
        && !swipeLocked.current
        && Math.abs(g.dx) > 10
        && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderMove: (_, g) => {
        translateX.setValue(g.dx);
      },
      onPanResponderRelease: (_, g) => {
        if (disabledRef.current || swipeLocked.current) return;
        if (g.dx > SWIPE_THRESHOLD) {
          swipeLocked.current = true;
          Animated.parallel([
            Animated.timing(translateX, {
              toValue: SCREEN_WIDTH,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }),
          ]).start(({ finished }) => {
            if (finished) onLike();
          });
        } else if (g.dx < -SWIPE_THRESHOLD) {
          swipeLocked.current = true;
          Animated.parallel([
            Animated.timing(translateX, {
              toValue: -SCREEN_WIDTH,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }),
          ]).start(({ finished }) => {
            if (finished) onPass();
          });
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            friction: 7,
          }).start();
        }
      },
    }),
  ).current;

  return (
    <View style={[styles.wrap, style]}>
      <Animated.View
        style={[styles.animated, { transform: [{ translateX }], opacity }]}
        {...panResponder.panHandlers}
      >
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'visible',
  },
  animated: {},
});
