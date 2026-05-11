import { fetchActiveEvents } from "@/lib/api";
import { mockedSettings } from "@/mock/settings";
import useStore from "@/store/useStore";
import { useAuth } from "@clerk/expo";
import { useEffect, useState } from "react";

const useStoreSetup = () => {
  const { setSettings, setEvents, setTickets, applyEventsFilter } = useStore();
  const [isLoadingStore, setIsLoadingStore] = useState(true);
  const { userId } = useAuth();

  useEffect(() => {
    const setupStore = async () => {
      // Load events and settings but NOT user — auth flow handles login
      const events = await fetchActiveEvents({ userId: userId ?? undefined });
      setEvents(events);
      applyEventsFilter();
      setSettings(mockedSettings);

      setIsLoadingStore(false);
    };

    setupStore();
  }, [userId, setEvents, setSettings, setIsLoadingStore, setTickets]);

  return { isLoadingStore };
};

export default useStoreSetup;
