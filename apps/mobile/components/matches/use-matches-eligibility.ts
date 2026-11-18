import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { useAuth } from "@clerk/expo";
import * as Location from "expo-location";
import { useFocusEffect } from "expo-router";
import { fetchMyTickets, type CheckInPosition } from "@/lib/api";
import { haversineMeters } from "@/lib/geo";
import {
  isAtVenue,
  LOCATION_POLL_INTERVAL_MS,
  LOCKED_RECHECK_INTERVAL_MS,
  PRE_EVENT_GRACE_MS,
  PROXIMITY_RADIUS_M,
  type EligibilityState,
  type LiveTicket,
} from "./matches-model";

/**
 * Whether the user may swipe now: a ticket for an event that is on, and a
 * position at its venue. Checked again while locked (on focus, on return to
 * the app and every LOCKED_RECHECK_INTERVAL_MS) and while the location is
 * required (every LOCATION_POLL_INTERVAL_MS).
 */
export function useMatchesEligibility() {
  const { userId, getToken } = useAuth();

  // ── Eligibility ────────────────────────────────────────────────────────────
  const [eligibility, setEligibility] = useState<EligibilityState>("checking");
  const eligibilityRef = useRef(eligibility);
  eligibilityRef.current = eligibility;
  const checkingTicketsRef = useRef(false);
  const [liveTicket, setLiveTicket] = useState<LiveTicket | null>(null);
  const [userCoords, setUserCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  // The browser or the phone refuses Tulum the location: the gate says how
  // to allow it.
  const [locationDenied, setLocationDenied] = useState(false);

  // The position that passed the location check; the check-in sends it.
  const checkInPositionRef = useRef<CheckInPosition | null>(null);

  // ── GPS proximity check ───────────────────────────────────────────────────
  const checkLocation = useCallback(async (ticket: LiveTicket) => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationDenied(true);
        setEligibility("location_required");
        return;
      }
      setLocationDenied(false);
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude, longitude, accuracy } = pos.coords;
      setUserCoords({ lat: latitude, lng: longitude });
      const dist = haversineMeters(
        latitude,
        longitude,
        ticket.venue_lat,
        ticket.venue_lng,
      );
      if (isAtVenue(dist, accuracy, ticket.checkin_radius_m)) {
        checkInPositionRef.current = { latitude, longitude, accuracy };
        setEligibility("eligible");
      } else {
        setEligibility("location_required");
      }
    } catch {
      setEligibility("location_required");
    }
  }, []);

  // ── Find live-event ticket then check GPS ─────────────────────────────────
  const checkTickets = useCallback(async () => {
    if (!userId || checkingTicketsRef.current) return;
    checkingTicketsRef.current = true;
    try {
      const token = await getToken();
      if (!token) {
        setEligibility("locked");
        return;
      }

      const tickets = await fetchMyTickets(token, userId);
      const now = Date.now();
      const live = tickets.find((tk: any) => {
        const start = tk.date ? new Date(tk.date).getTime() : null;
        const end = tk.end_date_time
          ? new Date(tk.end_date_time).getTime()
          : null;
        return (
          start !== null &&
          end !== null &&
          now >= start - PRE_EVENT_GRACE_MS &&
          now <= end
        );
      });

      if (!live) {
        setEligibility("locked");
        return;
      }

      const ticket: LiveTicket = {
        event_id: live.event_id,
        venue_lat: live.latitude ?? live.location?.latitude ?? 0,
        venue_lng: live.longitude ?? live.location?.longitude ?? 0,
        venue_name: live.venue_name ?? "",
        event_title: live.title ?? "",
        checkin_radius_m:
          typeof live.checkin_radius_m === "number"
            ? live.checkin_radius_m
            : PROXIMITY_RADIUS_M,
      };
      setLiveTicket(ticket);
      // A re-check from the locked screen shows the loading view while the
      // location is read, as the first check does.
      setEligibility("checking");

      await checkLocation(ticket);
    } catch {
      setEligibility("locked");
    } finally {
      checkingTicketsRef.current = false;
    }
  }, [userId, checkLocation]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Re-check while locked ─────────────────────────────────────────────────
  // The tab stays mounted while other tabs are open, so checking only on
  // mount would keep it locked after the event goes live. While it is locked,
  // check again when the tab regains focus, when the app returns to the
  // foreground, and every LOCKED_RECHECK_INTERVAL_MS while the tab is shown.
  useFocusEffect(
    useCallback(() => {
      const recheckIfLocked = () => {
        if (AppState.currentState !== "active") return;
        if (eligibilityRef.current === "locked") void checkTickets();
      };
      recheckIfLocked();
      const interval = setInterval(recheckIfLocked, LOCKED_RECHECK_INTERVAL_MS);
      const appStateSubscription = AppState.addEventListener(
        "change",
        recheckIfLocked,
      );
      return () => {
        clearInterval(interval);
        appStateSubscription.remove();
      };
    }, [checkTickets]),
  );

  // ── Periodic re-check while on location_required screen ──────────────────
  useEffect(() => {
    if (eligibility !== "location_required" || !liveTicket) return;
    const id = setInterval(
      () => checkLocation(liveTicket),
      LOCATION_POLL_INTERVAL_MS,
    );
    return () => clearInterval(id);
  }, [eligibility, liveTicket, checkLocation]);

  return {
    eligibility,
    setEligibility,
    liveTicket,
    userCoords,
    setUserCoords,
    locationDenied,
    checkLocation,
    checkTickets,
    checkInPositionRef,
  };
}
