import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Keyboard, ScrollView, TextInput, StatusBar } from 'react-native';

interface Props extends React.ComponentProps<typeof ScrollView> {
  additionalScrollHeight?: number;
}

export const KeyboardScrollView = ({
  children,
  additionalScrollHeight,
  contentContainerStyle,
  ...props
}: Props) => {
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollPositionRef = useRef<number>(0);
  const scrollContentSizeRef = useRef<number>(0);
  const scrollViewSizeRef = useRef<number>(0);

  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [additionalPadding, setAdditionalPadding] = useState(0);

  const scrollToPosition = useCallback(
    (toPosition: number, animated?: boolean) => {
      scrollViewRef.current?.scrollTo({ y: toPosition, animated: !!animated });
      scrollPositionRef.current = toPosition;
    },
    []
  );

  const additionalScroll = useMemo(
    () => additionalScrollHeight ?? 0,
    [additionalScrollHeight]
  );
  const androidStatusBarOffset = useMemo(
    () => StatusBar.currentHeight ?? 0,
    []
  );

  useEffect(() => {
    Keyboard.addListener('keyboardDidShow', (frames) => {
      const keyboardY = frames.endCoordinates.screenY;
      const keyboardHeight = frames.endCoordinates.height;
      setAdditionalPadding(keyboardHeight);
      setTimeout(() => {
        setIsKeyboardVisible(true);
      }, 100);

      const currentlyFocusedInput = TextInput.State.currentlyFocusedInput();
      const currentScrollY = scrollPositionRef.current;

      currentlyFocusedInput.measureInWindow((_x, y, _width, height) => {
        const endOfInputY = y + height + androidStatusBarOffset;
        const deltaToScroll = endOfInputY - keyboardY;

        if (deltaToScroll < 0) return;

        const scrollPositionTarget =
          currentScrollY + deltaToScroll + additionalScroll;
        scrollToPosition(scrollPositionTarget, true);
      });
    });

    Keyboard.addListener('keyboardDidHide', () => {
      setAdditionalPadding(0);
      setIsKeyboardVisible(false);
    });

    Keyboard.addListener('keyboardWillHide', (frames) => {
      // iOS only, scroll back to initial position to avoid flickering
      const keyboardHeight = frames.endCoordinates.height;
      const currentScrollY = scrollPositionRef.current;
      const scrollPositionTarget = currentScrollY - keyboardHeight;
      scrollToPosition(scrollPositionTarget, true);
    });

    return () => {
      Keyboard.removeAllListeners('keyboardDidShow');
      Keyboard.removeAllListeners('keyboardDidHide');
      Keyboard.removeAllListeners('keyboardWillHide');
    };
  }, [additionalScroll, androidStatusBarOffset, scrollToPosition]);

  return (
    <ScrollView
      ref={scrollViewRef}
      contentContainerStyle={[
        contentContainerStyle,
        { paddingBottom: additionalPadding },
      ]}
      keyboardShouldPersistTaps="handled"
      onMomentumScrollEnd={(event) => {
        scrollPositionRef.current = event.nativeEvent.contentOffset.y;
      }}
      onScrollEndDrag={(event) => {
        scrollPositionRef.current = event.nativeEvent.contentOffset.y;
      }}
      onLayout={(event) => {
        scrollViewSizeRef.current = event.nativeEvent.layout.height;
      }}
      onContentSizeChange={(_width, height) => {
        const currentContentHeight = scrollContentSizeRef.current;
        const contentSizeDelta = height - currentContentHeight;
        scrollContentSizeRef.current = height;

        if (!isKeyboardVisible) return;

        const currentScrollY = scrollPositionRef.current;
        const scrollPositionTarget = currentScrollY + contentSizeDelta;
        scrollToPosition(scrollPositionTarget, true);
      }}
      {...props}
    >
      {children}
    </ScrollView>
  );
};
