import { format } from "date-fns";
import { useCallback, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";

function LogView({ entries }: LogViewProps) {
  const scrollViewRef = useRef<ScrollView>(null);
  const isNearBottom = useRef(true);
  const bottomThreshold = 50;

  return (
    <ScrollView
      ref={scrollViewRef}
      onScroll={e => {
        const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;

        isNearBottom.current =
          contentOffset.y + layoutMeasurement.height >= contentSize.height - bottomThreshold;
      }}
      scrollEventThrottle={16}
      onContentSizeChange={() => {
        if (isNearBottom.current) {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }
      }}
    >
      {entries.map((e, i) => (
        <Text style={styles.text} key={i}>
          {e}
        </Text>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  text: {
    color: "white",
  },
});

export interface LogViewProps {
  entries: string[];
}

export function useLog() {
  const [entries, setEntries] = useState<string[]>([]);

  const addEntry = useCallback((entry: string) => {
    setEntries(old => [...old, `[${format(new Date(), "yyyy-MM-dd HH:mm:ss.SSS")}] ${entry}`]);
  }, []);

  return { entries, log: addEntry };
}

export default LogView;
