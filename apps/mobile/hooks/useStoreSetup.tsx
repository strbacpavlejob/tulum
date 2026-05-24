import { fetchActiveEvents } from "@/lib/api";
import useStore from "@/store/useStore";
import { useAuth } from "@clerk/expo";
import { useEffect, useState } from "react";

const useStoreSetup = () => {
  const { setEvents, setTickets, applyEventsFilter } = useStore();
  const [isLoadingStore, setIsLoadingStore] = useState(true);
  const { userId, getToken } = useAuth();

  useEffect(() => {
    const setupStore = async () => {
      // Load events and settings but NOT user — auth flow handles login
      const token = await getToken();
      const events = await fetchActiveEvents({ token: token ?? undefined });
      setEvents(events);
      applyEventsFilter();

      setIsLoadingStore(false);
    };

    setupStore();
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  return { isLoadingStore };
};

export default useStoreSetup;
