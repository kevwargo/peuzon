import { useCallback, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";
import dt from "./dt";

function LogView({ entries }: LogViewProps) {
  const scrollRef = useRef<ScrollView>(null);
  const bottomRef = useRef(true);
  const bottomThreshold = 50;

  return (
    <ScrollView
      style={styles.wrap}
      ref={scrollRef}
      onScroll={e => {
        const {
          contentOffset: offset,
          contentSize: size,
          layoutMeasurement: layout,
        } = e.nativeEvent;

        bottomRef.current = offset.y + layout.height >= size.height - bottomThreshold;
      }}
      scrollEventThrottle={16}
      onContentSizeChange={() => {
        if (bottomRef.current) {
          scrollRef.current?.scrollToEnd({ animated: true });
        }
      }}
    >
      {entries.map((e, i) => (
        <Text style={styles.msg} key={i}>
          {e}
        </Text>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: "#56ac4d",
    padding: 15,
  },
  msg: {
    color: "white",
  },
});

export interface LogViewProps {
  entries: string[];
}

export function useLog() {
  const [entries, setEntries] = useState<string[]>([]);

  const addEntry = useCallback((entry: string) => {
    setEntries(old => [...old, `[${dt()}] ${entry}`]);
  }, []);

  return { entries, log: addEntry };
}

export default LogView;
